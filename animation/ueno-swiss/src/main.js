// 整う — Swiss Motion Graphics for a law office. One blue square (the exception) drifts off-grid while the system builds on the beat; it finally snaps into place beside the firm's name.
import { E, seg, lin, snap, steps, clamp, lerp, BEAT, E8, BAR } from './ease.js';

const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 1920, H = 1080;
const F = 'NJP';
for (const w of [400, 500, 700, 900]) await document.fonts.load(`${w} 40px ${F}`, '法律相談あ01');
const q = new URLSearchParams(location.search);
const NOSUB = q.has('nosub');

// ---------- system ----------
const C = { page: '#E9E8E3', paper: '#FFFFFF', ink: '#111111', g1: '#C9C7C0', g2: '#ECEBE6', g3: '#F6F5F2', sig: '#1F3FFF' };
const M = 96, COL = 122, GUT = 24, CW = COL + GUT;
const cx = i => M + i * CW;                        // column start
const SQ = COL;                                    // the square = one column
export const DUR = 39.6;
const PG = 2040;                                   // page pitch in world units (1920 paper + 120 gap)
const T = {
  gridIn: [0.4, 2.4], stmt: 2.4, step: [9.6, 15.6, 21.6], wall: 28.2, cut: 28.8, silence: [29.4, 30.0], snapSq: 30.0,
  name: 30.6, cap: 32.0,
};
const STEPS = [
  { n: '01', label: 'STEP 01', title: 'お問い合わせ', note: 'まずは、ご連絡ください。' },
  { n: '02', label: 'STEP 02', title: 'ご相談', note: '丁寧にお話をうかがいます' },
  { n: '03', label: 'STEP 03', title: '方針のご提案', note: '進む道を一緒に考えます。' },
];

// ---------- camera: world x of the screen centre, scale ----------
function cam(t) {
  let x = W / 2, s = 1;
  T.step.forEach((ts, i) => { x = lerp(x, (i + 1) * PG + W / 2, snap(t, ts, BEAT)); });
  const pw = snap(t, T.wall, BEAT * 2);
  x = lerp(x, 2 * PG + W / 2, pw); s = lerp(1, 0.3, pw);
  return { x, y: H / 2, s };
}
const toScreen = (c, x, y) => [(x - c.x) * c.s + W / 2, (y - c.y) * c.s + H / 2];

// ---------- text helpers ----------
let texts = [];
function font(size, w) { ctx.font = `${w} ${size}px ${F}`; ctx.letterSpacing = size >= 90 ? `${(-size * 0.02).toFixed(1)}px` : '0px'; }
// clip reveal: rises out of a clip rect below the baseline; p = 0..1
function reveal(text, x, y, size, w, color, p, id) {
  if (p <= 0) return;
  font(size, w);
  const tw = ctx.measureText(text).width;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 4, y - size * 1.12, tw + 8, size * 1.42); ctx.clip();
  ctx.fillStyle = color; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillText(text, x, y + (1 - E(p)) * size * 1.3);
  ctx.restore();
  if (p >= 1 && id) {
    const m = ctx.getTransform(), a = m.transformPoint(new DOMPoint(x, y - size)), b = m.transformPoint(new DOMPoint(x + tw, y + size * 0.2));
    texts.push({ id, text, x0: a.x, y0: a.y, x1: b.x, y1: b.y });
  }
  return tw;
}
function rule(x, y, len, p, color = C.ink, h = 1) { if (p > 0) { ctx.fillStyle = color; ctx.fillRect(x, y, len * p, h); } }
function note(text, x, y, p, color = '#6B6963', id) { return reveal(text, x, y, 19, 500, color, p, id); }

// ---------- a paper with its column guides ----------
function paper(ox, oy, collapse = 0) {
  ctx.save();
  if (collapse > 0) { ctx.translate(0, oy + H / 2); ctx.scale(1, 1 - collapse); ctx.translate(0, -(oy + H / 2)); }
  ctx.fillStyle = C.paper; ctx.fillRect(ox, oy, W, H);
  ctx.fillStyle = C.g3; for (let i = 0; i < 12; i++) ctx.fillRect(ox + cx(i), oy, COL, H);
  ctx.restore();
}

// ---------- page 0: the statement ----------
function page0(t, ox) {
  const b = T.stmt;
  reveal('法律の問題を、', ox + cx(0), 400, 52, 500, '#6B6963', seg(t, b, b + BEAT), 'lead');
  reveal('ひとりで抱えこまない。', ox + cx(0), 560, 124, 900, C.ink, seg(t, b + BEAT * 2, b + BEAT * 3), 'stmt');
  rule(ox + cx(0), 880, cx(11) + COL - cx(0), lin(t, b + BEAT * 4, b + BEAT * 8), C.ink);
  note('法律相談のご案内', ox + cx(0), 918, seg(t, b + BEAT * 5, b + BEAT * 6));
  note('相談の流れ — 3つのステップ', ox + cx(6), 918, seg(t, b + BEAT * 6, b + BEAT * 7));
}

// ---------- step pages ----------
function stepPage(t, ox, i) {
  const s = STEPS[i], b = T.step[i];
  // giant numeral: climbs in eased steps, one module at a time (optically flush left)
  font(560, 900);
  const m = ctx.measureText(s.n), lb = m.actualBoundingBoxLeft || 0;
  const k = steps(t, b - BEAT, b + BEAT * 2, 4);
  ctx.save(); ctx.beginPath(); ctx.rect(ox + cx(0) - 10, 160, cx(6) - cx(0), 700); ctx.clip();
  ctx.fillStyle = C.ink; ctx.textBaseline = 'alphabetic'; ctx.fillText(s.n, ox + cx(0) + lb - 18, 860 + (1 - k) * 640);
  ctx.restore();
  const rx = ox + cx(6);
  note(s.label, rx, 330, seg(t, b, b + BEAT), C.ink, 'label' + i);
  rule(rx, 350, cx(11) + COL - cx(6), lin(t, b, b + BEAT * 2), C.ink);
  reveal(s.title, rx, 500, 100, 900, C.ink, seg(t, b + BEAT, b + BEAT * 2), 'title' + i);
  reveal(s.note, rx, 610, 42, 500, '#3A3935', seg(t, b + BEAT, b + BEAT * 2), 'note' + i);
  // progress row: three cells, the current one in ink
  for (let j = 0; j < 3; j++) {
    const x = rx + j * (CW * 2), w = CW * 2 - GUT;
    ctx.fillStyle = j === i ? C.ink : (j < i ? C.g1 : C.g2);
    ctx.fillRect(x, 820, w * (j === i ? E(seg(t, b + BEAT * 3, b + BEAT * 4)) : 1), 12);
  }
  note('相談の流れ', rx, 870, seg(t, b + BEAT * 3, b + BEAT * 4));
}

// ---------- the exception: the blue square ----------
function sqState(t) {
  const tf = Math.min(t, T.silence[0]);   // it stops during the silence
  const drift = [1530 + 120 * Math.sin(tf * 0.23), 124 + 48 * Math.sin(tf * 0.31 + 1)];
  const rot = (8 + 4 * Math.sin(tf * 0.4)) * Math.PI / 180;
  const p = snap(t, T.snapSq, BEAT);
  const end = [cx(0), 376];
  return { x: lerp(drift[0], end[0], p), y: lerp(drift[1], end[1], p), r: lerp(rot, 0, p), on: p >= 1 };
}
function square(t) {
  const a = E(seg(t, 0.0, 0.6));   // wipes in from the left at the start
  if (a <= 0) return;
  const s = sqState(t);
  ctx.save(); ctx.translate(s.x + SQ / 2, s.y + SQ / 2); ctx.rotate(s.r);
  ctx.beginPath(); ctx.rect(-SQ / 2, -SQ / 2, SQ * a, SQ); ctx.clip();
  ctx.fillStyle = C.sig; ctx.fillRect(-SQ / 2 - 0.5, -SQ / 2 - 0.5, SQ + 1, SQ + 1);
  ctx.restore();
  // coordinate readout
  if (t < T.name + 0.6) {
    const al = 1 - clamp((t - T.name) / 0.3);
    ctx.save(); ctx.globalAlpha = al;
    font(18, 500); ctx.fillStyle = s.on ? C.ink : '#8A8882';
    const txt = s.on ? `x ${s.x.toFixed(0)}   y ${s.y.toFixed(0)}   on grid` : `x ${s.x.toFixed(1)}   y ${s.y.toFixed(1)}   off grid`;
    ctx.fillText(txt, s.x, s.y + SQ + 34);
    ctx.restore();
  }
}

// ---------- end card ----------
function endCard(t) {
  const g = lin(t, T.silence[0] + 0.05, T.silence[1]);
  ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.g3; for (let i = 0; i < 12; i++) ctx.fillRect(cx(i), 0, COL, H * g);
  reveal('うえの弁護士事務所', cx(1), 490, 120, 900, C.ink, seg(t, T.name, T.name + BEAT * 1.5), 'name');
  rule(cx(1), 560, cx(11) + COL - cx(1), lin(t, T.name + BEAT, T.name + BEAT * 4), C.ink);
  reveal('ご相談、お待ちしています。', cx(1), 650, 44, 500, '#3A3935', seg(t, T.cap, T.cap + BEAT), 'cap');
  note('法律相談のご案内', cx(1), 900, seg(t, T.cap + BEAT, T.cap + BEAT * 2));
}

function render(t) {
  texts = [];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = C.page; ctx.fillRect(0, 0, W, H);
  if (t < T.silence[0]) {
    const c = cam(t);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(c.s, c.s); ctx.translate(-c.x, -c.y);
    for (let p = 0; p <= 3; p++) {
      const ox = p * PG;
      // knife cut during the wall: centre page first, then the sides
      const order = [2, 1, 3, 0].indexOf(p), kc = T.cut + order * E8 * 0.5;
      const knife = lin(t, kc, kc + 0.18), col = E(seg(t, kc + 0.18, kc + 0.45));
      if (col >= 1) continue;
      const [sx0] = toScreen(c, ox, 0), [sx1] = toScreen(c, ox + W, 0);
      if (sx1 < -50 || sx0 > W + 50) continue;
      paper(ox, 0, col);
      ctx.save(); ctx.translate(0, H / 2); ctx.scale(1, 1 - col); ctx.translate(0, -H / 2);
      if (p === 0) {
        // the grid grows from the square at the very start (lines grow along their length, linear)
        if (t < T.gridIn[1] + 0.2) {
          const gg = lin(t, T.gridIn[0], T.gridIn[1]);
          ctx.fillStyle = C.paper; ctx.fillRect(ox, 0, W, H);
          ctx.fillStyle = C.g3; for (let i = 0; i < 12; i++) { const d = Math.abs(i - 11) / 11, gi = clamp(gg * 1.6 - d * 0.6); ctx.fillRect(ox + cx(i), 0, COL, H * gi); }
        }
        page0(t, ox);
      } else stepPage(t, ox, p - 1);
      ctx.restore();
      if (knife > 0 && col <= 0) { ctx.fillStyle = C.ink; ctx.fillRect(ox, H / 2 - 3, W * knife, 6); }
    }
    ctx.restore();
  } else endCard(t);
  square(t);
  if (q.has('grid')) { ctx.strokeStyle = 'rgba(255,0,0,.3)'; for (let i = 0; i < 12; i++) ctx.strokeRect(cx(i), 0, COL, H); }
}

// events for sound: snaps (paper slap), numeral steps (thunk), rules (tss), silence, the square's snap
function events() {
  const ev = [];
  const b = T.stmt;
  ev.push({ t: 0.0, type: 'slap' });
  ev.push({ t: T.gridIn[0], type: 'tss', dur: 2.0 });
  ev.push({ t: b + BEAT, type: 'slap' }, { t: b + BEAT * 3, type: 'slap', big: 1 }, { t: b + BEAT * 4, type: 'tss', dur: BEAT * 4 });
  T.step.forEach((ts, i) => {
    ev.push({ t: ts, type: 'pan' });
    for (let k = 1; k <= 4; k++) ev.push({ t: ts - BEAT + k * BEAT * 3 / 4, type: 'thunk' });
    ev.push({ t: ts + BEAT * 2, type: 'slap', big: 1 }, { t: ts + BEAT * 4, type: 'slap' }, { t: ts, type: 'tss', dur: BEAT * 2 });
  });
  ev.push({ t: T.wall, type: 'pan', big: 1 });
  [0, 1, 2, 3].forEach(o => ev.push({ t: T.cut + o * E8 * 0.5 + 0.18, type: 'snick' }));
  ev.push({ t: T.silence[0], type: 'stop' }, { t: T.snapSq, type: 'land' });
  ev.push({ t: T.name + BEAT * 1.5, type: 'slap', big: 1 }, { t: T.name + BEAT, type: 'tss', dur: BEAT * 3 }, { t: T.cap + BEAT, type: 'slap' });
  return ev;
}

window.DUR = DUR;
window.EV = events();
window.TEXTS = t => { render(t); return texts; };
window.render = render;
window.READY = true;
