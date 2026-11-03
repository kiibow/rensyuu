// Written-on Japanese subtitles and title (Klee One), ink ~84 %, paper halo, no box
import { clamp, ss } from '/core/lib.js';
const INK = 'rgba(29,26,23,';
function halo(ctx, text, x, y, w) { ctx.strokeStyle = 'rgba(244,239,228,0.92)'; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.filter = 'blur(3px)'; ctx.strokeText(text, x, y); ctx.filter = 'none'; }
export const writeDur = text => Math.min(1.4, 0.2 + [...text].length * 0.045);

export function subtitle(ctx, s, t, W, H) {
  if (t < s.t0 - 0.01 || t > s.t1 + 0.45) return;
  const size = 44, y = H - 92;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `400 ${size}px "Klee One"`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(s.text).width, x0 = W / 2 - w / 2;
  const write = clamp((t - s.t0) / writeDur(s.text));
  ctx.globalAlpha = 1 - clamp((t - s.t1) / 0.45);
  ctx.beginPath(); ctx.rect(x0 - 24, y - size * 1.3, (w + 48) * ss(write), size * 2); ctx.clip();
  halo(ctx, s.text, W / 2, y, 14);
  ctx.fillStyle = INK + '0.84)'; ctx.fillText(s.text, W / 2, y);
  ctx.restore();
  return { text: s.text, x0, y0: y - size, x1: x0 + w, y1: y + size * .3, full: write >= 1 && t <= s.t1 };
}

export function title(ctx, T, t, W, H) {
  if (t < T.t0) return [];
  const y = 200;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = '600 92px "Klee One"';
  const w = ctx.measureText(T.name).width, x0 = W / 2 - w / 2;
  const a1 = clamp((t - T.t0) / 1.8);
  ctx.save(); ctx.beginPath(); ctx.rect(x0 - 30, y - 110, (w + 60) * ss(a1), 150); ctx.clip();
  halo(ctx, T.name, W / 2, y, 16); ctx.fillStyle = INK + '0.9)'; ctx.fillText(T.name, W / 2, y); ctx.restore();
  ctx.font = '400 38px "Klee One"'; ctx.letterSpacing = '6px';
  const w2 = ctx.measureText(T.tag).width, x2 = W / 2 - w2 / 2;
  const a2 = clamp((t - T.t0 - 1.6) / 1.2);
  ctx.save(); ctx.beginPath(); ctx.rect(x2 - 20, y + 30, (w2 + 40) * ss(a2), 70); ctx.clip();
  halo(ctx, T.tag, W / 2, y + 80, 12); ctx.fillStyle = INK + '0.66)'; ctx.fillText(T.tag, W / 2, y + 80); ctx.restore();
  ctx.restore();
  const out = [];
  if (a1 >= 1) out.push({ text: T.name, x0, y0: y - 92, x1: x0 + w, y1: y + 20 });
  if (a2 >= 1) out.push({ text: T.tag, x0: x2, y0: y + 42, x1: x2 + w2, y1: y + 92 });
  return out;
}
