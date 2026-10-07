// 30秒の解説動画「AI動画は、なぜ毎回同じ見た目？」
// render contract: window.seek(t) は時刻 t のコマを描く純関数。乱数はシード固定のみ。
'use strict';

const Q = new URLSearchParams(location.search);
const W = +(Q.get('w') || 1920), H = +(Q.get('h') || 1080);
const RM = Q.get('rm') === '1'; // reduced-motion cut
const cv = document.getElementById('c');
cv.width = W; cv.height = H;
const ctx = cv.getContext('2d');

// ---------- tokens ----------
const C = {
  bg: '#F3EFE7',     // warm neutral ground
  ink: '#1E1C19',
  ink2: '#4A453E',
  mute: '#6F685D',   // 4.5:1 on bg
  line: '#D6CEBF',
  card: '#FFFDF9',
  acc: '#A84819',    // one accent (5.1:1 on bg)
  accSoft: '#F6E6DA',
  gA: '#6A5CF5', gB: '#C04FD8', // 「よくあるAI動画」の再現用（作中の“悪い例”としてのみ使用）
};
const SANS = 'NSJ', MONO = 'JBM, NSJ';

// ---------- TIMELINE: すべての拍・動き・音はここから ----------
const TL = {
  fps: 60, dur: 30, bpm: 120,
  cards: [0.5, 1.0, 1.5],
  s2: 3.0, ai: 4.0, cross: 5.0, code: 6.5, ruler: 8.0,
  s3: 10.5, rounds: [11.0, 14.5, 18.0], settle: 21.5,
  s4: 22.5, off: 23.0, offDraw: 24.0, on: 25.0, onLook: 26.0, onFix: 26.5, onDraw: 26.75,
  s5: 27.0, tag: 27.75, next: 28.5,
  // トークン（工程を回る点）の到着 [時刻, 累積ノード番号]（0=書く 1=描画 2=見る 3=直す）
  token: [[11, 0], [12, 1], [13, 2], [14, 3], [14.5, 4], [15.5, 5], [16.5, 6], [17.5, 7], [18, 8], [19, 9],
    [20, 10], [21, 11], [21.5, 12], [24.0, 13], [25.0, 16], [25.5, 17], [26.0, 18], [26.5, 19], [27.0, 20]],
  // 描画（サムネ更新）: [時刻, 品質]  0=よくある見た目 1=散らかり 2=整理済み
  draws: [[12.0, 0], [15.5, 1], [19.0, 2], [24.0, 0], [26.75, 2]],
  // 見る（採点）: [時刻, ゲージ, 問題マーカーの品質(-1=なし), マーカーを消す時刻]
  looks: [[13.0, 0.35, 0, 14.0], [16.5, 0.6, 1, 17.5], [20.0, 0.86, -1, 0], [26.0, 0.35, 0, 26.5]],
  gaugeOverride: [[24.0, 0], [26.75, 0.86]],
  headlines: [
    // [in, out, line1, line2, line2Delay]
    [0.0, 3.0, 'AIに動画を頼むと', 'なぜ毎回、同じ見た目？', 0.6],
    [3.0, 6.5, 'いいプロンプトを書けば', 'いい動画が出る…？', 1.0],
    [6.5, 10.5, 'この方法では、AIは動画を出さない', '1コマずつ描くコードを書く', 1.5],
    [10.5, 22.5, '自分のコマを見て、直す', '8点以上になるまで繰り返す', 6.0],
    [22.5, 25.0, '「見る」を外すと', 'あの見た目に戻る', 1.5],
    [25.0, 27.0, '「見る」を戻すと', 'また良くなる', 1.75],
    [27.0, 30.01, '差はプロンプトより「見て直す」で出る', '次は、AIに自分のコマを見せよう', 1.5],
  ],
};
window.TIMELINE = TL;

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
// 臨界減衰ばね（閉形式・オーバーシュートなし）
function spring(dt, w = 14) { return dt <= 0 ? 0 : 1 - (1 + w * dt) * Math.exp(-w * dt); }
const mv = (t, t0, w = 14) => RM ? (t >= t0 ? 1 : 0) : spring(t - t0, w);  // 位置の変化
const fd = (t, t0, d = 0.3) => clamp((t - t0) / d);                          // 不透明度
const win = (t, a, b, d = 0.3) => Math.min(fd(t, a, d), 1 - fd(t, b, d));
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };

function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function text(s, x, y, size, weight, color, align = 'left', font = SANS, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); ctx.restore();
}
function arrow(x0, y0, x1, y1, u, color = C.mute, lw = 3) {
  if (u <= 0.001) return;
  const x = lerp(x0, x1, u), y = lerp(y0, y1, u), a = Math.atan2(y1 - y0, x1 - x0);
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 14 * Math.cos(a - 0.45), y - 14 * Math.sin(a - 0.45));
  ctx.lineTo(x - 14 * Math.cos(a + 0.45), y - 14 * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill(); ctx.restore();
}

// ---------- layout（16:9 / 1:1 / 9:16 の再構成） ----------
const FMT = W > H * 1.2 ? 'W' : (H > W * 1.2 ? 'T' : 'S');
const ORI = FMT === 'T' ? 'P' : 'L';
const LAY = {
  W: { pad: 110, fs: 72, top: 92, stage: [110, 320, 1700, 710] },
  S: { pad: 64, fs: 50, top: 70, stage: [64, 250, 952, 780] },
  T: { pad: 72, fs: 58, top: 190, stage: [40, 400, 1000, 1460] },
}[FMT];
const sx0 = W / ({ W: 1920, S: 1080, T: 1080 }[FMT]); // 解像度が違っても比率で追従
const DS = ORI === 'P' ? { w: 800, h: 1100 } : { w: 1200, h: 600 };
const [stX, stY, stW, stH] = LAY.stage;
const K = Math.min(stW / DS.w, stH / DS.h);
const OX = stX + (stW - DS.w * K) / 2, OY = stY + (stH - DS.h * K) / 2;

const P = ORI === 'L' ? {
  card: i => [[235, 290], [600, 290], [965, 290]][i], cardW: 335,
  prompt: [180, 300, 340, 110], ai: [600, 300, 64], out2a: [1010, 300, 280],
  ai2b: [140, 300, 56], code: [540, 300, 420, 196], out2b: [1000, 270, 300], ruler: [850, 1150, 410],
  cyc: [320, 300, 190], sheet: [870, 250], thumbW: 206, gap: 16, gaugeDY: 196,
  tagY: 440,
} : {
  card: i => [[400, 220], [400, 540], [400, 860]][i], cardW: 480,
  prompt: [400, 150, 600, 110], ai: [400, 480, 64], out2a: [400, 860, 440],
  ai2b: [400, 90, 56], code: [400, 390, 680, 210], out2b: [400, 750, 460], ruler: [170, 630, 965],
  cyc: [400, 290, 200], sheet: [400, 770], thumbW: 300, gap: 16, gaugeDY: 255,
  tagY: 1050,
};
const NODES = ['書く', '描画', '見る', '直す'];
const nodeXY = (i, r = P.cyc[2]) => { const a = -Math.PI / 2 + i * Math.PI / 2; return [P.cyc[0] + r * Math.cos(a), P.cyc[1] + r * Math.sin(a)]; };

// ---------- 作中の「動画」 ----------
// よくあるAI動画：グラデーション＋中央の文字＋最後にロゴ（u: その動画の再生位置 0..1）
function generic(cx, cy, w, u, hue = 0) {
  const h = w * 9 / 16, x = cx - w / 2, y = cy - h / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(40,30,20,0.12)'; ctx.shadowBlur = w * 0.06; ctx.shadowOffsetY = w * 0.015;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, hue ? '#4E7BEF' : C.gA); g.addColorStop(1, hue ? '#A04FE0' : C.gB);
  rr(x, y, w, h, w * 0.035); ctx.fillStyle = g; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = rgba(C.ink, 0.85); ctx.lineWidth = Math.max(1.5, w * 0.006); ctx.stroke();
  ctx.clip();
  const a1 = clamp((u - 0.15) / 0.35), a2 = clamp((u - 0.4) / 0.3), a3 = clamp((u - 0.7) / 0.2);
  ctx.fillStyle = `rgba(255,255,255,${0.95 * a1})`; rr(cx - w * 0.26, cy - h * 0.12, w * 0.52, h * 0.13, h * 0.03); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.6 * a2})`; rr(cx - w * 0.17, cy + h * 0.07, w * 0.34, h * 0.06, h * 0.03); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${0.9 * a3})`; ctx.beginPath(); ctx.arc(cx, y + h * 0.82, h * 0.06, 0, 7); ctx.fill();
  ctx.restore();
}

// コンタクトシートのサムネ（q=0 よくある見た目 / 1 散らかり / 2 整理済み）
function thumb(x, y, w, shot, q) {
  const h = w * 9 / 16;
  if (q === 0) { generic(x + w / 2, y + h / 2, w, 1, shot % 2); return; }
  ctx.save();
  rr(x, y, w, h, w * 0.035); ctx.fillStyle = C.card; ctx.fill();
  ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke(); ctx.clip();
  const R = mulberry32(100 + shot);
  if (q === 1) {
    const cols = ['#7FA7D9', '#E3B04B', '#8CC084', '#D97F9E', '#9B8FD9', C.acc];
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = rgba(cols[i % cols.length], 0.85);
      const px = x + w * (0.35 + R() * 0.55), py = y + h * (0.2 + R() * 0.6), s = w * (0.07 + R() * 0.1);
      if (i % 2) { ctx.beginPath(); ctx.arc(px, py, s / 2, 0, 7); ctx.fill(); } else ctx.fillRect(px - s / 2, py - s / 3, s, s * 0.66);
    }
    ctx.fillStyle = C.ink; rr(x + w * 0.08, y + h * 0.16, w * 0.45, h * 0.1, 3); ctx.fill();
    ctx.fillStyle = C.ink2; for (let i = 0; i < 3; i++) { rr(x + w * 0.08, y + h * (0.36 + i * 0.13), w * (0.3 + R() * 0.2), h * 0.06, 3); ctx.fill(); }
  } else {
    ctx.fillStyle = C.ink; rr(x + w * 0.08, y + h * 0.16, w * 0.32, h * 0.09, 3); ctx.fill();
    ctx.fillStyle = C.line; rr(x + w * 0.08, y + h * 0.31, w * 0.22, h * 0.055, 3); ctx.fill();
    ctx.lineWidth = Math.max(1.5, w * 0.012); ctx.strokeStyle = C.mute;
    const by = y + h * 0.66;
    if (shot === 0) { // ノード→ノード
      ctx.beginPath(); ctx.moveTo(x + w * 0.2, by); ctx.lineTo(x + w * 0.72, by); ctx.stroke();
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x + w * 0.2, by, h * 0.08, 0, 7); ctx.fill();
      ctx.fillStyle = C.acc; ctx.beginPath(); ctx.arc(x + w * 0.76, by, h * 0.1, 0, 7); ctx.fill();
    } else if (shot === 1) { // 棒3本
      [0.18, 0.3, 0.42].forEach((v, i) => { ctx.fillStyle = i === 2 ? C.acc : C.ink2; ctx.fillRect(x + w * (0.52 + i * 0.13), y + h * (0.86 - v * 1.3), w * 0.08, h * v * 1.3); });
    } else if (shot === 2) { // 時間軸の上の点
      ctx.beginPath(); ctx.moveTo(x + w * 0.1, by); ctx.lineTo(x + w * 0.9, by); ctx.stroke();
      ctx.fillStyle = C.acc; ctx.beginPath(); ctx.arc(x + w * 0.6, by, h * 0.07, 0, 7); ctx.fill();
    } else { // 輪
      ctx.beginPath(); ctx.arc(x + w * 0.72, y + h * 0.55, h * 0.22, 0, 7); ctx.stroke();
      ctx.fillStyle = C.acc; ctx.beginPath(); ctx.arc(x + w * 0.72, y + h * 0.33, h * 0.06, 0, 7); ctx.fill();
    }
  }
  ctx.restore();
}

// ---------- 状態（すべて TIMELINE からの純関数） ----------
function thumbState(t) { // 現在の品質と、ひとつ前の品質・切替の進み
  let prev = 0, cur = 0, t0 = -1;
  for (const [tt, q] of TL.draws) if (t >= tt) { prev = cur; cur = q; t0 = tt; }
  return { prev, cur, u: t0 < 0 ? 1 : fd(t, t0, 0.35), t0 };
}
function gauge(t) {
  const ev = [];
  for (const [tt, g] of TL.looks) ev.push([tt, g]);
  for (const e of TL.gaugeOverride) ev.push(e);
  ev.sort((a, b) => a[0] - b[0]);
  let v = 0;
  for (const [tt, g] of ev) if (t >= tt) v = lerp(v, g, mv(t, tt, 10));
  return v;
}
function tokenPos(t) { // 累積ノード番号（小数）
  const s = TL.token;
  if (t < s[0][0]) return null;
  for (let i = s.length - 1; i >= 0; i--) {
    if (t >= s[i][0]) {
      if (i + 1 < s.length) {
        const [ta, na] = s[i], [tb, nb] = s[i + 1];
        const dur = Math.min(0.5 * (nb - na), (tb - ta) * 0.9), t1 = tb - dur;
        if (t > t1) return lerp(na, nb, RM ? (t >= tb ? 1 : 0) : ease((t - t1) / dur));
      }
      return s[i][1];
    }
  }
}
function arrivedRecently(t, node, within = 0.6) {
  for (const [tt, n] of TL.token) if (n % 4 === node && t >= tt && t < tt + within) return 1 - (t - tt) / within;
  return 0;
}

// ---------- 描画 ----------
function drawHeadline(t) {
  const fs = LAY.fs * sx0, x = LAY.pad * sx0, y1 = LAY.top * sx0 + fs * 0.55, y2 = y1 + fs * 1.32;
  for (const [a, b, l1, l2, d2] of TL.headlines) {
    if (t < a || t > b + 0.3) continue;
    const out = b < 30 ? 1 - fd(t, b - 0.05, 0.22) : 1;
    const a1 = fd(t, a + 0.12, 0.3) * out, a2 = fd(t, a + d2, 0.3) * out;
    const r1 = (1 - mv(t, a + 0.12)) * 18 * sx0, r2 = (1 - mv(t, a + d2)) * 18 * sx0;
    const maxW = W - 2 * x; // はみ出す行だけ縮める（2行の大きさは揃える）
    ctx.font = `900 ${fs}px ${SANS}`; const w1 = ctx.measureText(l1).width;
    ctx.font = `700 ${fs}px ${SANS}`; const w2 = ctx.measureText(l2).width;
    const f = Math.min(1, maxW / Math.max(w1, w2));
    text(l1, x, y1 + r1, fs * f, 900, C.ink, 'left', SANS, a1);
    text(l2, x, y1 + (y2 - y1) * f + r2, fs * f, 700, C.ink2, 'left', SANS, a2);
  }
}

function drawStage(t) {
  ctx.save(); ctx.translate(OX, OY); ctx.scale(K, K);

  // ===== S1 & S2a: カード =====
  const toS2 = mv(t, TL.s2), toS2b = mv(t, TL.code), toS3 = mv(t, TL.s3);
  if (t < TL.s3 + 0.5) {
    for (let i = 0; i < 3; i++) {
      const enter = mv(t, TL.cards[i]);
      let [cx, cy] = P.card(i); let w = P.cardW; let a = fd(t, TL.cards[i], 0.25);
      cy += (1 - enter) * 40;
      if (i !== 1) a *= 1 - fd(t, TL.s2, 0.3);
      else { // 真ん中のカードが「出力」になって残る
        cx = lerp(cx, P.out2a[0], toS2); cy = lerp(cy, P.out2a[1], toS2); w = lerp(w, P.out2a[2], toS2);
        cx = lerp(cx, P.out2b[0], toS2b); cy = lerp(cy, P.out2b[1], toS2b); w = lerp(w, P.out2b[2], toS2b);
        // S3 で1枚目のサムネへ
        const [tx, ty, tw] = thumbRect(0);
        cx = lerp(cx, tx + tw / 2, toS3); cy = lerp(cy, ty + tw * 9 / 32, toS3); w = lerp(w, tw, toS3);
        a *= 1 - fd(t, TL.s3 + 0.35, 0.15);
      }
      if (a <= 0) continue;
      ctx.save(); ctx.globalAlpha = a;
      let u = ((t - TL.cards[i]) / 2.2) % 1.25;          // 作中動画のループ再生
      if (i === 1 && t >= TL.ruler) u = playhead(t);      // S2b: 再生ヘッドに従う
      else if (i === 1 && t >= TL.code) u = 0;
      if (i === 1 && t >= TL.s3) u = 1;
      generic(cx, cy, w, clamp(u), i === 1 ? 0 : i % 2);
      ctx.restore();
    }
    // 見本であることを示すラベル（冒頭のみ）
    const la = win(t, 1.9, TL.s2, 0.3);
    if (la > 0) {
      const [lx, ly] = ORI === 'L' ? [600, 290 + P.cardW * 9 / 32 + 44] : [400, 860 + P.cardW * 9 / 32 + 46];
      text('よくある見た目', lx, ly, ORI === 'L' ? 28 : 34, 700, C.mute, 'center', SANS, la);
    }
  }

  // ===== S2a: プロンプト → AI → 動画 =====
  const s2a = win(t, TL.s2, TL.code, 0.3);
  if (t >= TL.s2 && t < TL.s3 + 0.5) {
    const [px, py, pw, ph] = P.prompt;
    const pa = fd(t, TL.s2, 0.3) * (1 - fd(t, TL.code, 0.3));
    const pin = mv(t, TL.s2);
    if (pa > 0) {
      ctx.save(); ctx.globalAlpha = pa;
      const ox = ORI === 'L' ? (1 - pin) * -30 - toS2b * 60 : 0, oy = ORI === 'P' ? (1 - pin) * -30 - toS2b * 60 : 0;
      rr(px - pw / 2 + ox, py - ph / 2 + oy, pw, ph, 18); ctx.fillStyle = C.card; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
      text('「かっこいい動画を作って」', px + ox, py + oy, ORI === 'L' ? 27 : 34, 700, C.ink, 'center');
      ctx.restore();
    }
    // AI ノード（S2b で左/上へ移動、S3 で消える）
    const ain = mv(t, TL.ai);
    const ax = lerp(P.ai[0], P.ai2b[0], toS2b), ay = lerp(P.ai[1], P.ai2b[1], toS2b), ar = lerp(P.ai[2], P.ai2b[2], toS2b);
    const aa = fd(t, TL.ai, 0.25) * (1 - fd(t, TL.s3, 0.3));
    if (aa > 0) {
      ctx.save(); ctx.globalAlpha = aa;
      ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(ax, ay, ar * (0.85 + 0.15 * ain), 0, 7); ctx.fill();
      text('AI', ax, ay + 1, 34, 900, C.card, 'center');
      ctx.restore();
    }
    // 矢印（S2a）
    if (s2a > 0) {
      ctx.save(); ctx.globalAlpha = s2a;
      const g = 14;
      if (ORI === 'L') {
        arrow(px + pw / 2 + g, py, P.ai[0] - P.ai[2] - g, py, mv(t, TL.ai + 0.15));
        arrow(P.ai[0] + P.ai[2] + g, py, P.out2a[0] - P.out2a[2] / 2 - g, py, mv(t, TL.ai + 0.4));
      } else {
        arrow(px, py + ph / 2 + g, px, P.ai[1] - P.ai[2] - g, mv(t, TL.ai + 0.15));
        arrow(px, P.ai[1] + P.ai[2] + g, px, P.out2a[1] - P.out2a[2] * 9 / 32 - g, mv(t, TL.ai + 0.4));
      }
      // ×：直接は出せない
      const cxu = mv(t, TL.cross, 18);
      if (t >= TL.cross) {
        const [mx, my] = ORI === 'L' ? [(P.ai[0] + P.ai[2] + P.out2a[0] - P.out2a[2] / 2) / 2, py]
          : [px, (P.ai[1] + P.ai[2] + P.out2a[1] - P.out2a[2] * 9 / 32) / 2];
        const s = 26 * (0.6 + 0.4 * cxu);
        ctx.strokeStyle = C.acc; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(mx - s, my - s); ctx.lineTo(mx + s, my + s); ctx.moveTo(mx + s, my - s); ctx.lineTo(mx - s, my + s); ctx.stroke();
        if (ORI === 'L') text('動画は出さない', mx, my + 58, 26, 700, C.acc, 'center', SANS, fd(t, TL.cross + 0.2));
        else text('動画は出さない', mx + 50, my, 32, 700, C.acc, 'left', SANS, fd(t, TL.cross + 0.2));
      }
      ctx.restore();
    }
  }

  // ===== S2b: draw(t) のコード → コマ、時間軸 =====
  if (t >= TL.code && t < TL.s3 + 0.6) {
    const [cx, cy, cw, ch] = P.code;
    const [n0x, n0y] = nodeXY(0);
    const nw = 136, nh = 58;
    // コードブロックが S3 で「書く」ノードに縮む
    const bx = lerp(cx, n0x, toS3), by = lerp(cy, n0y, toS3), bw = lerp(cw, nw, toS3), bh = lerp(ch, nh, toS3);
    const ca = fd(t, TL.code, 0.3);
    const cin = mv(t, TL.code);
    ctx.save(); ctx.globalAlpha = ca;
    const oy2 = (1 - cin) * 24;
    rr(bx - bw / 2, by - bh / 2 + oy2, bw, bh, lerp(16, 29, toS3)); ctx.fillStyle = C.ink; ctx.fill();
    const ta = 1 - fd(t, TL.s3, 0.2);
    if (ta > 0) {
      const fsz = ORI === 'L' ? 24 : 29, lx = bx - bw / 2 + 30, ly = by - bh / 2 + oy2 + 44;
      const lines = [['function ', 'draw', '(t) {'], ['  // t秒目の1コマを描く', '', ''], ['  bg(); title(t); logo(t);', '', ''], ['}', '', '']];
      lines.forEach((L, i) => {
        ctx.save(); ctx.globalAlpha *= ta; ctx.font = `500 ${fsz}px ${MONO}`; ctx.textBaseline = 'middle';
        let xx = lx;
        L.forEach((seg, j) => {
          if (!seg) return;
          ctx.fillStyle = i === 1 ? '#A9A196' : (j === 1 ? '#F0A57E' : '#F3EFE7');
          ctx.fillText(seg, xx, ly + i * fsz * 1.45); xx += ctx.measureText(seg).width;
        });
        ctx.restore();
      });
    }
    ctx.restore();
    // 矢印：AI → コード → コマ
    const aa = fd(t, TL.code + 0.2, 0.3) * (1 - fd(t, TL.s3, 0.25));
    if (aa > 0) {
      ctx.save(); ctx.globalAlpha = aa;
      if (ORI === 'L') {
        arrow(P.ai2b[0] + P.ai2b[2] + 14, cy, cx - cw / 2 - 14, cy, mv(t, TL.code + 0.2));
        arrow(cx + cw / 2 + 14, cy, P.out2b[0] - P.out2b[2] / 2 - 14, cy, mv(t, TL.code + 0.5));
      } else {
        arrow(cx, P.ai2b[1] + P.ai2b[2] + 14, cx, cy - ch / 2 - 14, mv(t, TL.code + 0.2));
        arrow(cx, cy + ch / 2 + 14, cx, P.out2b[1] - P.out2b[2] * 9 / 32 - 14, mv(t, TL.code + 0.5));
      }
      ctx.restore();
    }
    // 時間軸と再生ヘッド
    const ra = fd(t, TL.ruler, 0.3) * (1 - fd(t, TL.s3, 0.25));
    if (ra > 0) {
      const [r0, r1, ry] = P.ruler, p = playhead(t), hx = lerp(r0, r1, p);
      ctx.save(); ctx.globalAlpha = ra;
      ctx.strokeStyle = C.line; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r0, ry); ctx.lineTo(r1, ry); ctx.stroke();
      ctx.lineWidth = 2; for (let i = 0; i <= 10; i++) { const xx = lerp(r0, r1, i / 10); ctx.beginPath(); ctx.moveTo(xx, ry - (i % 5 ? 5 : 10)); ctx.lineTo(xx, ry + (i % 5 ? 5 : 10)); ctx.stroke(); }
      text('0s', r0, ry + 30, ORI === 'P' ? 30 : 24, 500, C.mute, 'center', MONO);
      text('30s', r1, ry + 30, ORI === 'P' ? 30 : 24, 500, C.mute, 'center', MONO);
      ctx.strokeStyle = C.acc; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(hx, ry - 16); ctx.lineTo(hx, ry + 16); ctx.stroke();
      ctx.fillStyle = C.acc; ctx.beginPath(); ctx.arc(hx, ry - 16, 6, 0, 7); ctx.fill();
      const lbl = `t=${(p * 30).toFixed(1)}s`;
      text(lbl, clamp(hx, r0 + 64, r1 - 64), ry - 40, ORI === 'P' ? 30 : 26, 500, C.acc, 'center', MONO);
      ctx.restore();
    }
  }

  // ===== S3/S4: 書く→描画→見る→直す のループ =====
  const loopA = fd(t, TL.s3 + 0.1, 0.4) * (1 - fd(t, TL.s5, 0.35));
  if (loopA > 0) {
    ctx.save(); ctx.globalAlpha = loopA;
    const [ccx, ccy, cr] = P.cyc;
    const off = fd(t, TL.off, 0.25) * (1 - fd(t, TL.on, 0.25)); // 「見る」OFF の度合い
    // 円周
    ctx.strokeStyle = C.line; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ccx, ccy, cr, 0, 7); ctx.stroke();
    for (let i = 0; i < 4; i++) { // 進行方向の山形
      const a = -Math.PI / 2 + (i + 0.5) * Math.PI / 2, x = ccx + cr * Math.cos(a), y = ccy + cr * Math.sin(a), d = a + Math.PI / 2;
      ctx.fillStyle = C.line; ctx.beginPath(); ctx.moveTo(x + 11 * Math.cos(d), y + 11 * Math.sin(d));
      ctx.lineTo(x - 9 * Math.cos(d) + 9 * Math.cos(a), y - 9 * Math.sin(d) + 9 * Math.sin(a));
      ctx.lineTo(x - 9 * Math.cos(d) - 9 * Math.cos(a), y - 9 * Math.sin(d) - 9 * Math.sin(a)); ctx.fill();
    }
    // 周回カウンタ
    const roundIdx = TL.rounds.reduce((n, r) => t >= r ? n + 1 : n, 0);
    const ctrA = win(t, TL.rounds[0], TL.s4, 0.25);
    if (ctrA > 0) {
      text(`${roundIdx}周目`, ccx, ccy, 34, 700, C.mute, 'center', SANS, ctrA);
    }
    // トークン
    const tp = tokenPos(t);
    if (tp !== null) {
      const a = -Math.PI / 2 + tp * Math.PI / 2;
      ctx.fillStyle = C.acc; ctx.beginPath(); ctx.arc(ccx + cr * Math.cos(a), ccy + cr * Math.sin(a), 13, 0, 7); ctx.fill();
    }
    // ノード
    for (let i = 0; i < 4; i++) {
      const [nx, ny] = nodeXY(i), nw = 136, nh = 58;
      const appear = i === 0 ? 1 : fd(t, TL.s3 + 0.2 + i * 0.12, 0.3);
      const pop = i === 0 ? 0 : (1 - mv(t, TL.s3 + 0.2 + i * 0.12)) * 16;
      const hot = arrivedRecently(t, i);
      const isOff = i === 2 ? off : 0;
      ctx.save(); ctx.globalAlpha *= appear * (1 - 0.55 * isOff);
      rr(nx - nw / 2, ny - nh / 2 + pop, nw, nh, 29);
      ctx.fillStyle = hot > 0 ? C.accSoft : (i === 0 ? C.ink : C.card); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = hot > 0 ? C.acc : (i === 0 ? C.ink : C.line);
      if (isOff > 0.5) ctx.setLineDash([8, 7]);
      ctx.stroke(); ctx.setLineDash([]);
      const lc = hot > 0 ? C.acc : (i === 0 ? C.card : C.ink);
      text(NODES[i], nx, ny + pop + 1, 30, 900, lc, 'center');
      if (isOff > 0) { // 打ち消し線（色だけに頼らない）
        ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.globalAlpha = appear * isOff;
        ctx.beginPath(); ctx.moveTo(nx - 44, ny + pop + 1); ctx.lineTo(nx + 44, ny + pop + 1); ctx.stroke();
      }
      ctx.restore();
    }
    // 「見る」スイッチ
    const swA = win(t, TL.s4, TL.s5, 0.3);
    if (swA > 0) {
      const [nx, ny] = nodeXY(2), sx = nx + 68 + 22 + 34, sw = 68, sh = 36;
      const on = 1 - off;
      ctx.save(); ctx.globalAlpha *= swA;
      rr(sx - sw / 2, ny - sh / 2, sw, sh, sh / 2); ctx.fillStyle = on > 0.5 ? C.acc : C.line; ctx.fill();
      ctx.fillStyle = C.card; ctx.beginPath(); ctx.arc(sx - sw / 2 + sh / 2 + on * (sw - sh), ny, sh / 2 - 5, 0, 7); ctx.fill();
      text(on > 0.5 ? 'ON' : 'OFF', sx + sw / 2 + 14, ny + 1, ORI === 'P' ? 30 : 24, 500, on > 0.5 ? C.acc : C.mute, 'left', MONO);
      ctx.restore();
    }
    // コンタクトシート
    const ts = thumbState(t);
    for (let i = 0; i < 4; i++) {
      const [x, y, w] = thumbRect(i);
      const appear = i === 0 ? fd(t, TL.s3 + 0.3, 0.1) : fd(t, TL.s3 + 0.35 + i * 0.1, 0.3);
      if (appear <= 0) continue;
      ctx.save(); ctx.globalAlpha *= appear;
      if (ts.u < 1 && ts.prev !== ts.cur) { // 左から右へのワイプ（半透明の重ねはしない）
        thumb(x, y, w, i, ts.prev);
        const wu = RM ? 1 : ease(ts.u);
        ctx.beginPath(); ctx.rect(x - 2, y - 2, (w + 4) * wu, w * 9 / 16 + 4); ctx.clip();
        if (RM) ctx.globalAlpha *= ts.u;
      }
      thumb(x, y, w, i, ts.cur);
      ctx.restore();
      // 描画した瞬間：枠が一度だけ光る（フラッシュではなく枠線）
      if (ts.t0 > 0) {
        const k = 1 - fd(t, ts.t0, 0.5);
        if (k > 0) { ctx.save(); ctx.globalAlpha *= k; ctx.strokeStyle = C.ink; ctx.lineWidth = 3; rr(x - 5, y - 5, w + 10, w * 9 / 16 + 10, 10); ctx.stroke(); ctx.restore(); }
      }
    }
    // 見る：走査線と問題マーカー
    for (const [lt, , q, clear] of TL.looks) {
      const sweep = (t - lt) / 0.45;
      const [x0, y0, w0] = thumbRect(0), [x3, y3, w3] = thumbRect(3);
      if (sweep >= 0 && sweep <= 1 && !RM) {
        const xx = lerp(x0 - 6, x3 + w3 + 6, ease(sweep));
        ctx.strokeStyle = C.acc; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xx, y0 - 12); ctx.lineTo(xx, y3 + w3 * 9 / 16 + 12); ctx.stroke();
      }
      if (q >= 0) {
        const ma = fd(t, lt + 0.3, 0.2) * (1 - fd(t, clear, 0.3));
        if (ma > 0) for (let i = 0; i < 4; i++) {
          const [x, y, w] = thumbRect(i), h = w * 9 / 16;
          const R = mulberry32(300 + i);
          const [mx, my] = q === 0 ? [x + w / 2, y + h * 0.48] : [x + w * (0.55 + R() * 0.2), y + h * (0.4 + R() * 0.25)];
          const rad = q === 0 ? w * 0.32 : w * 0.24;
          ctx.save(); ctx.globalAlpha *= ma;
          ctx.beginPath(); ctx.ellipse(mx, my, rad * (0.9 + 0.1 * mv(t, lt + 0.3)), rad * 0.55, 0, 0, 7);
          ctx.strokeStyle = C.card; ctx.lineWidth = 10; ctx.stroke(); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.setLineDash([10, 7]); ctx.stroke();
          ctx.restore();
        }
      }
    }
    // 評価ゲージ
    {
      const [x0, y0, w0] = thumbRect(0), [x3, y3, w3] = thumbRect(3);
      const gx0 = x0, gx1 = x3 + w3, gy = P.sheet[1] + P.gaugeDY, v = gauge(t);
      const ga = fd(t, TL.rounds[0] + 1.8, 0.3);
      ctx.save(); ctx.globalAlpha *= ga;
      text('評価', gx0, gy - 36, 30, 700, C.mute, 'left');
      rr(gx0, gy - 9, gx1 - gx0, 18, 9); ctx.fillStyle = C.line; ctx.fill();
      if (v > 0.01) { rr(gx0, gy - 9, (gx1 - gx0) * v, 18, 9); ctx.fillStyle = v >= 0.8 ? C.acc : C.ink2; ctx.fill(); }
      const tx = lerp(gx0, gx1, 0.8);
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(tx, gy - 18); ctx.lineTo(tx, gy + 18); ctx.stroke();
      text('8/10', tx, gy - 36, ORI === 'P' ? 30 : 28, 500, C.ink, 'center', MONO);
      // 合格マーク（色＋形）
      const pass = v >= 0.8 ? fd(t, 0, 1) : 0;
      if (v >= 0.8) {
        const cxk = gx1 + 34, s = mv(t, passTime(t), 16);
        ctx.fillStyle = C.acc; ctx.beginPath(); ctx.arc(cxk, gy, 20 * (0.6 + 0.4 * s), 0, 7); ctx.fill();
        ctx.strokeStyle = C.card; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(cxk - 8, gy); ctx.lineTo(cxk - 2, gy + 7); ctx.lineTo(cxk + 9, gy - 7); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // ===== S5: 冒頭の3枚が戻る（今度は正しく読める） =====
  if (t >= TL.s5) {
    for (let i = 0; i < 3; i++) {
      const t0 = TL.s5 + 0.15 + i * 0.12;
      const [cx, cy] = P.card(i), a = fd(t, t0, 0.3), up = (1 - mv(t, t0)) * 30;
      if (a <= 0) continue;
      ctx.save(); ctx.globalAlpha = a; generic(cx, cy + up, P.cardW, 1, i % 2); ctx.restore();
    }
    const ta = fd(t, TL.tag, 0.3), grow = mv(t, TL.tag);
    if (ta > 0) {
      ctx.save(); ctx.globalAlpha = ta;
      const y = P.tagY;
      if (ORI === 'L') {
        const x0 = P.card(0)[0] - P.cardW / 2, x1 = P.card(2)[0] + P.cardW / 2, m = (x0 + x1) / 2;
        const hw = (x1 - x0) / 2 * grow;
        ctx.strokeStyle = C.acc; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(m - hw, y - 14); ctx.lineTo(m - hw, y); ctx.lineTo(m + hw, y); ctx.lineTo(m + hw, y - 14); ctx.stroke();
        text('どれも、見て直していない', m, y + 42, 34, 900, C.acc, 'center');
      } else {
        text('どれも、見て直していない', 400, y, 40, 900, C.acc, 'center');
      }
      ctx.restore();
    }
  }
  ctx.restore();
}

function thumbRect(i) {
  const tw = P.thumbW, th = tw * 9 / 16, g = P.gap;
  const x0 = P.sheet[0] - (2 * tw + g) / 2, y0 = P.sheet[1] - (2 * th + g) / 2;
  return [x0 + (i % 2) * (tw + g), y0 + Math.floor(i / 2) * (th + g), tw];
}
function playhead(t) { // S2b の作中動画の再生位置（0..1、1.8秒で1往復）
  if (t < TL.ruler + 0.3) return 0;
  return clamp(((t - TL.ruler - 0.3) / 1.8) % 1.1);
}
function passTime(t) { let p = 0; for (const [tt, g] of [...TL.looks.map(l => [l[0], l[1]]), ...TL.gaugeOverride]) if (t >= tt && g >= 0.8) p = tt; return p; }

function seek(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  drawHeadline(t);
  drawStage(t);
}
window.seek = seek;

// ---------- 音（Web Audio を OfflineAudioContext で決定的に書き出す） ----------
async function renderAudio() {
  const sr = 48000, N = sr * TL.dur;
  const ac = new OfflineAudioContext(2, N, sr);
  const R = mulberry32(7);
  const nb = ac.createBuffer(1, sr, sr), nd = nb.getChannelData(0);
  for (let i = 0; i < sr; i++) nd[i] = R() * 2 - 1;
  const master = ac.createGain(); master.gain.value = 0.9;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
  master.connect(comp); comp.connect(ac.destination);
  const bed = ac.createGain(); bed.connect(master);
  const cues = ac.createGain(); cues.gain.value = 0.9; cues.connect(master);
  const beat = 60 / TL.bpm;

  // 「見る」が外れている間、ベッドは痩せる
  bed.gain.setValueAtTime(1, 0);
  bed.gain.setValueAtTime(1, TL.offDraw - 0.05); bed.gain.linearRampToValueAtTime(0.45, TL.offDraw + 0.2);
  bed.gain.setValueAtTime(0.45, TL.on); bed.gain.linearRampToValueAtTime(1, TL.on + 0.3);
  bed.gain.setValueAtTime(1, 29.0); bed.gain.linearRampToValueAtTime(0.0001, 30);

  const env = (g, t, a, peak, dec, tail = 0.0001) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(tail, t + a + dec); };
  function osc(type, f, t, dur, peak, dest, a = 0.005, f2) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * 0.6);
    env(g, t, a, peak, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + a + dur + 0.05);
  }
  function noise(t, dur, peak, type, freq, dest, q = 1) {
    const s = ac.createBufferSource(); s.buffer = nb; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ac.createGain(); env(g, t, 0.002, peak, dur); s.connect(f); f.connect(g); g.connect(dest); s.start(t, R() * 0.5); s.stop(t + dur + 0.05);
  }
  const kick = (t, p) => osc('sine', 120, t, 0.28, p, bed, 0.003, 45);
  const hat = (t, p) => noise(t, 0.045, p, 'highpass', 7500, bed);
  const pluck = (t, f, p) => { osc('triangle', f, t, 0.5, p, cues); osc('sine', f * 2, t, 0.25, p * 0.25, cues); };
  const tick = (t, p = 0.18) => osc('sine', 1760, t, 0.05, p, cues, 0.002);
  const click = (t, p = 0.25) => noise(t, 0.03, p, 'bandpass', 3200, cues, 2);
  const thud = t => { osc('sine', 110, t, 0.35, 0.55, cues, 0.004, 48); noise(t, 0.12, 0.25, 'lowpass', 500, cues); };
  const motif = (t, p = 0.32) => [659.25, 783.99, 1046.5].forEach((f, i) => pluck(t + i * beat / 4, f, p));

  // ベッド：120BPM、キック（1拍おき）とオフビートのハット
  for (let b = 0; b * beat < TL.dur - 0.6; b++) {
    const t = b * beat;
    const quiet = t >= TL.offDraw && t < TL.on;
    if (b % 2 === 0 && !quiet) kick(t, t < TL.s2 ? 0.28 : 0.42);
    if (t >= TL.s2) hat(t + beat / 2, quiet ? 0.015 : 0.05);
  }
  // パッド：2小節ごとのコード
  const chords = [[130.81, 164.81, 196.0, 246.94], [110.0, 130.81, 164.81, 196.0], [87.31, 110.0, 130.81, 164.81], [98.0, 123.47, 146.83, 220.0]];
  for (let c = 0; c * 4 < TL.dur; c++) {
    const t = c * 4, dur = Math.min(4, TL.dur - t), ch = c >= 7 ? [130.81, 164.81, 196.0, 293.66] : chords[c % 4];
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.8);
    g.gain.setValueAtTime(0.05, t + dur - 0.6); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2);
    lp.connect(g); g.connect(bed);
    ch.forEach(f => [-4, 4].forEach(cent => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = cent; o.connect(lp); o.start(t); o.stop(t + dur + 0.3); }));
  }
  // 意味のある動作にだけ効果音
  TL.cards.forEach(t => tick(t));
  click(TL.s2); click(TL.ai); thud(TL.cross); click(TL.code);
  TL.draws.forEach(([t]) => click(t, 0.3));
  TL.looks.forEach(([t]) => motif(t));          // モチーフ＝「見る」
  click(TL.off, 0.35); osc('sawtooth', 520, TL.offDraw, 0.5, 0.06, cues, 0.01, 130);
  click(TL.on, 0.35);
  motif(TL.s5, 0.36); tick(TL.tag); motif(TL.next, 0.4);

  const buf = await ac.startRendering();
  const L = buf.getChannelData(0), Rr = buf.getChannelData(1);
  const out = new Int16Array(N * 2);
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
