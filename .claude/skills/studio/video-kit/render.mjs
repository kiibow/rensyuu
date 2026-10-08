// 使い方（video-kit フォルダで実行）:
//   node render.mjs stills <w> <h> <outdir> <t1,t2,...|last> [rm]   指定時刻の静止画
//   node render.mjs beats  <w> <h> <outdir>                     1拍ごとの静止画（コンタクトシート用）
//   node render.mjs video  <w> <h> <out> [rm] [workers]         映像だけを書き出す（out.video.mp4）
//   node render.mjs audio  <out.wav>                            音を書き出す
//   node render.mjs timing                                      見出しの「読む時間」が足りているか
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require(path.join(process.execPath, '../../lib/node_modules/playwright')); }
const here = path.dirname(fileURLToPath(import.meta.url));
const url = (w, h, rm) => pathToFileURL(path.join(here, 'src/film.html')).href + `?w=${w}&h=${h}${rm ? '&rm=1' : ''}`;

const browser = await pw.chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });
async function open(w, h, rm) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(url(w, h, rm));
  await page.evaluate(() => window.ready);
  return page;
}
const shot = (page, t, w, h) => page.evaluate(t => window.seek(t), t).then(() => page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h } }));
const name = t => `t${t.toFixed(2).padStart(5, '0')}.png`;

const [mode, ...a] = process.argv.slice(2);
try {
  if (mode === 'stills' || mode === 'beats') {
    const [w, h, dir] = [+a[0], +a[1], a[2]];
    mkdirSync(dir, { recursive: true });
    const page = await open(w, h, a[4] === 'rm');
    const TL = await page.evaluate(() => window.TIMELINE);
    const beat = 60 / TL.bpm;
    const times = mode === 'stills' ? a[3].split(',').map(x => x === 'last' ? +(TL.dur - 0.05).toFixed(2) : Number(x))
      : [...Array(Math.floor(TL.dur / beat))].map((_, i) => +(i * beat + beat * 0.85).toFixed(3));
    for (const t of times) writeFileSync(path.join(dir, name(t)), await shot(page, t, w, h));
    console.log(`${times.length} stills -> ${dir}`);
  } else if (mode === 'video') {
    const [w, h, out, rm, nw] = [+a[0], +a[1], a[2], a[3] === 'rm', +(a[4] || 4)];
    const probe = await open(320, 180, false), TL = await probe.evaluate(() => window.TIMELINE); await probe.close();
    const N = Math.round(TL.fps * TL.dur), per = Math.ceil(N / nw), tmp = out + '.parts', t0 = Date.now();
    mkdirSync(tmp, { recursive: true });
    await Promise.all([...Array(nw)].map(async (_, k) => {
      const page = await open(w, h, rm);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(TL.fps), '-i', '-',
        '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', path.join(tmp, `p${k}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = k * per; f < Math.min(N, (k + 1) * per); f++) {
        if (!ff.stdin.write(await shot(page, f / TL.fps, w, h))) await new Promise(r => ff.stdin.once('drain', r));
      }
      ff.stdin.end(); await new Promise(r => ff.on('close', r));
    }));
    writeFileSync(path.join(tmp, 'list.txt'), [...Array(nw)].map((_, k) => `file 'p${k}.mp4'`).join('\n'));
    await new Promise(r => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', out + '.video.mp4'], { stdio: 'inherit' }).on('close', r));
    rmSync(tmp, { recursive: true });
    console.log(`${out}: ${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } else if (mode === 'audio') {
    const page = await open(320, 180, false);
    const pcm = Buffer.from(await page.evaluate(() => window.renderAudio()), 'base64');
    const hdr = Buffer.alloc(44);
    hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16);
    hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(48000, 24); hdr.writeUInt32LE(48000 * 4, 28);
    hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
    writeFileSync(a[0], Buffer.concat([hdr, pcm]));
    console.log('audio ->', a[0]);
  } else if (mode === 'timing') {
    // 日本語は1秒に約8文字。各行が「文字数÷8＋0.5秒」以上出ていれば OK
    const page = await open(320, 180, false), TL = await page.evaluate(() => window.TIMELINE);
    let bad = 0;
    for (const [s, e, l1, l2, d2] of TL.headlines) {
      for (const [line, from] of [[l1, s + 0.12], [l2, s + d2]]) {
        if (!line) continue;
        const need = [...line].length / 8 + 0.5, have = Math.min(e, TL.dur) - from, ok = have >= need;
        if (!ok) bad++;
        console.log(`${ok ? 'OK ' : 'NG '} ${from.toFixed(2)}s 表示${have.toFixed(1)}s / 必要${need.toFixed(1)}s  ${line}`);
      }
    }
    console.log(bad ? `読む時間が足りない行：${bad}` : 'すべての行に読む時間がある');
    process.exitCode = bad ? 1 : 0;
  }
} finally { await browser.close(); }
