// 解説動画の雛形。window.seek(t) は時刻 t のコマを描く純関数（同じ t なら必ず同じ絵）。
// 作品ごとに書き換えるのは「TOKENS」「TIMELINE」「scenes」の3か所だけ。
'use strict';

const Q = new URLSearchParams(location.search);
const W = +(Q.get('w') || 1920), H = +(Q.get('h') || 1080);
const RM = Q.get('rm') === '1'; // 動きを減らした版
const cv = document.getElementById('c');
cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');

// ===== TOKENS：色・書体（作品ごとに決める。アクセントは1色、背景とのコントラスト4.5:1以上） =====
const C = { bg: '#F3EFE7', ink: '#1E1C19', ink2: '#4A453E', mute: '#6F685D', line: '#D6CEBF', card: '#FFFDF9', acc: '#A84819', accSoft: '#F6E6DA' };
const SANS = 'NSJ', MONO = 'JBM, NSJ';

// ===== TIMELINE：拍・見出し・効果音はすべてここ =====
const TL = {
  fps: 60, dur: 12, bpm: 120,
  // [出る, 消える, 1行目, 2行目, 2行目の遅れ(秒)]。1行目・2行目とも最大2行、1行は短く。
  headlines: [
    [0.0, 6.0, 'ここに問いを書く', '相手の思い込みを1つ', 0.8],
    [6.0, 12.01, 'ここに答えを書く', '次の一手を具体的に', 1.0],
  ],
  // 効果音：[時刻, 種類]。種類は tick / click / thud / motif（核のアイデアの合図）
  cues: [[1.0, 'tick'], [3.0, 'click'], [6.0, 'motif'], [9.0, 'thud']],
  // 場面の区切り（scenes と対応）
  beats: { a: 1.0, b: 3.0, c: 6.0, d: 9.0 },
};
window.TIMELINE = TL;

// ===== helpers =====
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
function spring(dt, w = 14) { return dt <= 0 ? 0 : 1 - (1 + w * dt) * Math.exp(-w * dt); } // 臨界減衰：跳ねずに止まる
const mv = (t, t0, w = 14) => RM ? (t >= t0 ? 1 : 0) : spring(t - t0, w); // 位置の変化（減らした版は瞬時）
const fd = (t, t0, d = 0.3) => clamp((t - t0) / d);                         // 不透明度
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function text(s, x, y, size, weight, color, align = 'left', font = SANS, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); ctx.restore();
}

// ===== layout：16:9 / 1:1 / 9:16 を組み替える（切り抜かない） =====
const FMT = W > H * 1.2 ? 'W' : (H > W * 1.2 ? 'T' : 'S');
const ORI = FMT === 'T' ? 'P' : 'L';
const LAY = {
  W: { pad: 110, fs: 72, top: 92, stage: [110, 320, 1700, 710] },
  S: { pad: 64, fs: 52, top: 70, stage: [64, 250, 952, 780] },
  T: { pad: 72, fs: 60, top: 190, stage: [40, 400, 1000, 1460] },
}[FMT];
const sx0 = W / ({ W: 1920, S: 1080, T: 1080 }[FMT]);
const DS = ORI === 'P' ? { w: 800, h: 1100 } : { w: 1200, h: 600 }; // 図を描く座標系
const [stX, stY, stW, stH] = LAY.stage;
const K = Math.min(stW / DS.w, stH / DS.h);
const OX = stX + (stW - DS.w * K) / 2, OY = stY + (stH - DS.h * K) / 2;

// 見出し：はみ出す行は自動で縮める
function drawHeadline(t) {
  const fs = LAY.fs * sx0, x = LAY.pad * sx0, y1 = LAY.top * sx0 + fs * 0.55, y2 = y1 + fs * 1.32;
  for (const [a, b, l1, l2, d2] of TL.headlines) {
    if (t < a || t > b + 0.3) continue;
    const out = b < TL.dur ? 1 - fd(t, b - 0.05, 0.22) : 1;
    const a1 = fd(t, a + 0.12, 0.3) * out, a2 = fd(t, a + d2, 0.3) * out;
    const r1 = (1 - mv(t, a + 0.12)) * 18 * sx0, r2 = (1 - mv(t, a + d2)) * 18 * sx0;
    ctx.font = `900 ${fs}px ${SANS}`; const w1 = ctx.measureText(l1).width;
    ctx.font = `700 ${fs}px ${SANS}`; const w2 = ctx.measureText(l2).width;
    const f = Math.min(1, (W - 2 * x) / Math.max(w1, w2));
    text(l1, x, y1 + r1, fs * f, 900, C.ink, 'left', SANS, a1);
    if (l2) text(l2, x, y1 + (y2 - y1) * f + r2, fs * f, 700, C.ink2, 'left', SANS, a2);
  }
}

// ===== scenes：図の中身（DS 座標で描く）。これは見本：点がノードになり、矢印でつながる =====
function drawStage(t) {
  ctx.save(); ctx.translate(OX, OY); ctx.scale(K, K);
  const B = TL.beats;
  const P = ORI === 'L' ? { a: [300, 300], b: [900, 300] } : { a: [400, 300], b: [400, 800] };
  // a: 点が現れる → b: 点がノードに育つ
  const grow = mv(t, B.b);
  const r = lerp(14, 70, grow);
  ctx.globalAlpha = fd(t, B.a);
  ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(P.a[0], P.a[1] + (1 - mv(t, B.a)) * 30, r, 0, 7); ctx.fill();
  if (grow > 0.5) text('原因', P.a[0], P.a[1], 40, 900, C.card, 'center', SANS, fd(t, B.b + 0.2));
  // c: 矢印がのびて結果のノードへ（核の瞬間：アクセント色）
  const u = mv(t, B.c, 8);
  if (u > 0.01) {
    const [x0, y0] = P.a, [x1, y1] = P.b, d = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / d, uy = (y1 - y0) / d;
    const sx = x0 + ux * 90, sy = y0 + uy * 90, ex = lerp(sx, x1 - ux * 90, u), ey = lerp(sy, y1 - uy * 90, u);
    ctx.strokeStyle = C.acc; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  }
  const ra = fd(t, B.c + 0.4);
  if (ra > 0) {
    ctx.globalAlpha = ra; rr(P.b[0] - 110, P.b[1] - 50, 220, 100, 50); ctx.fillStyle = C.accSoft; ctx.fill();
    ctx.strokeStyle = C.acc; ctx.lineWidth = 4; ctx.stroke(); text('結果', P.b[0], P.b[1] + 1, 40, 900, C.acc, 'center');
  }
  // d: 補足ラベル（色だけに頼らず、言葉でも示す）
  text('1つ変えると、結果が変わる', ORI === 'L' ? 600 : 400, ORI === 'L' ? 470 : 1000, 40, 700, C.mute, 'center', SANS, fd(t, B.d));
  ctx.restore();
}

function seek(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  drawHeadline(t); drawStage(t);
}
window.seek = seek;

// ===== 音：テンポに合わせた伴奏＋意味のある動作にだけ効果音。OfflineAudioContext で決定的に書き出す =====
async function renderAudio() {
  const sr = 48000, N = Math.round(sr * TL.dur), ac = new OfflineAudioContext(2, N, sr), R = mulberry32(7);
  const nb = ac.createBuffer(1, sr, sr), nd = nb.getChannelData(0); for (let i = 0; i < sr; i++) nd[i] = R() * 2 - 1;
  const master = ac.createGain(); master.gain.value = 0.9;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
  master.connect(comp); comp.connect(ac.destination);
  const bed = ac.createGain(); bed.connect(master); bed.gain.setValueAtTime(1, Math.max(0, TL.dur - 1)); bed.gain.linearRampToValueAtTime(0.0001, TL.dur);
  const cues = ac.createGain(); cues.connect(master);
  const beat = 60 / TL.bpm;
  const env = (g, t, a, peak, dec) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
  const osc = (type, f, t, dur, peak, dest, a = 0.005, f2) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.6); env(g, t, a, peak, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + dur + 0.05); };
  const noise = (t, dur, peak, type, freq, dest, q = 1) => { const s = ac.createBufferSource(); s.buffer = nb; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ac.createGain(); env(g, t, 0.002, peak, dur); s.connect(f); f.connect(g); g.connect(dest); s.start(t, R() * 0.5); s.stop(t + dur + 0.05); };
  const pluck = (t, f, p) => { osc('triangle', f, t, 0.5, p, cues); osc('sine', f * 2, t, 0.25, p * 0.25, cues); };
  const SFX = {
    tick: t => osc('sine', 1760, t, 0.05, 0.18, cues, 0.002),
    click: t => noise(t, 0.03, 0.3, 'bandpass', 3200, cues, 2),
    thud: t => { osc('sine', 110, t, 0.35, 0.55, cues, 0.004, 48); noise(t, 0.12, 0.25, 'lowpass', 500, cues); },
    motif: t => [659.25, 783.99, 1046.5].forEach((f, i) => pluck(t + i * beat / 4, f, 0.32)),
  };
  for (let b = 0; b * beat < TL.dur - 0.6; b++) { // キックとハット
    const t = b * beat;
    if (b % 2 === 0) osc('sine', 120, t, 0.28, 0.4, bed, 0.003, 45);
    noise(t + beat / 2, 0.045, 0.05, 'highpass', 7500, bed);
  }
  const chord = [130.81, 164.81, 196.0, 246.94]; // パッド
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; const pg = ac.createGain();
  pg.gain.setValueAtTime(0.0001, 0); pg.gain.linearRampToValueAtTime(0.05, 0.8); lp.connect(pg); pg.connect(bed);
  chord.forEach(f => [-4, 4].forEach(c => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = c; o.connect(lp); o.start(0); o.stop(TL.dur); }));
  TL.cues.forEach(([t, k]) => SFX[k] && SFX[k](t));
  const buf = await ac.startRendering(), L = buf.getChannelData(0), Rr = buf.getChannelData(1), out = new Int16Array(N * 2);
  for (let i = 0; i < N; i++) { out[2 * i] = clamp(L[i], -1, 1) * 32767; out[2 * i + 1] = clamp(Rr[i], -1, 1) * 32767; }
  let s = ''; const u8 = new Uint8Array(out.buffer);
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
window.renderAudio = renderAudio;

window.ready = (async () => {
  await Promise.all(['400', '700', '900'].map(w => document.fonts.load(`${w} 40px NSJ`, 'あ漢')).concat(document.fonts.load('500 40px JBM', 'draw')));
  seek(+(Q.get('t') || 0));
  return true;
})();
