// 使い方:
//   node render.mjs stills  <w> <h> <outdir> <t1,t2,...> [rm]
//   node render.mjs video   <w> <h> <out.mp4> [rm] [workers]
//   node render.mjs audio   <out.wav>
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const here = path.dirname(fileURLToPath(import.meta.url));
const page_url = (w, h, rm) => pathToFileURL(path.join(here, 'src/film.html')).href + `?w=${w}&h=${h}${rm ? '&rm=1' : ''}`;
const FPS = 60, DUR = 30;

async function open(browser, w, h, rm) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(page_url(w, h, rm));
  await page.evaluate(() => window.ready);
  return page;
}
const shot = (page, t, w, h) => page.evaluate(t => window.seek(t), t).then(() => page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: w, height: h } }));

const [mode, ...a] = process.argv.slice(2);
const browser = await pw.chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });

if (mode === 'stills') {
  const [w, h, dir, list, rm] = [+a[0], +a[1], a[2], a[3], a[4] === 'rm'];
  mkdirSync(dir, { recursive: true });
  const page = await open(browser, w, h, rm);
  for (const t of list.split(',').map(Number)) writeFileSync(path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`), await shot(page, t, w, h));
} else if (mode === 'video') {
  const [w, h, out, rm, nw] = [+a[0], +a[1], a[2], a[3] === 'rm', +(a[4] || 4)];
  const N = FPS * DUR, per = Math.ceil(N / nw), tmp = out + '.parts';
  mkdirSync(tmp, { recursive: true });
  const t0 = Date.now();
  await Promise.all([...Array(nw)].map(async (_, k) => {
    const page = await open(browser, w, h, rm);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', path.join(tmp, `p${k}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = k * per; f < Math.min(N, (k + 1) * per); f++) {
      const buf = await shot(page, f / FPS, w, h);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }));
  writeFileSync(path.join(tmp, 'list.txt'), [...Array(nw)].map((_, k) => `file 'p${k}.mp4'`).join('\n'));
  await new Promise(r => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', out + '.video.mp4'], { stdio: 'inherit' }).on('close', r));
  rmSync(tmp, { recursive: true });
  console.log(`${out}: ${N} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
} else if (mode === 'audio') {
  const page = await open(browser, 320, 180, false);
  const b64 = await page.evaluate(() => window.renderAudio());
  const pcm = Buffer.from(b64, 'base64');
  const hdr = Buffer.alloc(44);
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + pcm.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16);
  hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(48000, 24); hdr.writeUInt32LE(48000 * 4, 28);
  hdr.writeUInt16LE(4, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(pcm.length, 40);
  writeFileSync(a[0], Buffer.concat([hdr, pcm]));
  console.log('audio', a[0], pcm.length);
}
await browser.close();
