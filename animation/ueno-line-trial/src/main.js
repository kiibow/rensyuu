import { buildPath, headAt, posAt } from './geom.js';
import { SEGS } from './drawing.js';
import { prepare, drawLine, drawBlots } from './ink.js';
import { makePaper, drawPaper, vignette, makeTooth, drawTooth } from './paper.js';
import { DUR, SUBS, TITLE, SILENCE } from './story.js';
import { subtitle, title } from './subs.js';
import { camAt, worldToScreen, BASE } from './cam.js';
import { CAM } from './shots.js';
import { penShadow } from './hands.js';
import { clamp } from '/core/lib.js';

const q = new URLSearchParams(location.search);
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;
await document.fonts.load('400 40px "Klee One"', 'あ'); await document.fonts.load('600 40px "Klee One"', 'あ');

const P = prepare(buildPath(SEGS));
const paper = makePaper(), tooth = makeTooth();
window.PATH = P;
const NOSUB = q.has('nosub') || q.has('clean');
const END = P.T[P.N - 1];

function camFor(t) {
  let cam = camAt(P, CAM, t, W, H);
  if (q.get('cam')) { const [x, y, z] = q.get('cam').split(',').map(Number); cam = { cx: x, cy: y, k: BASE * z, r: 0, z }; }
  return cam;
}

let texts = [];
function render(t) {
  const cam = camFor(t), M = worldToScreen(cam, W, H);
  drawPaper(ctx, paper, cam, W, H);
  const all = q.has('all'), head = all ? P.N - 1 : headAt(P, t);
  if (t >= P.T[0] || all) drawLine(ctx, P, head, M, cam.k);
  drawBlots(ctx, P, all ? 999 : t, M, cam.k);
  drawTooth(ctx, tooth, cam, W, H);
  vignette(ctx, W, H);
  if (!all && !q.has('nopen')) {
    const tip = M(...posAt(P, head));
    const lift = t < P.T[0] ? clamp((P.T[0] - t) / 0.4) : clamp((t - END) / 0.9);   // pen lands at the start, lifts away after the last stroke
    const appear = 1 - clamp((t - END - 0.6) / 0.8);
    if (appear > 0) penShadow(ctx, tip, [0.56, 0.83], cam.k, { lift, alpha: appear });
  }
  texts = [];
  if (!NOSUB) {
    SUBS.forEach((s, i) => { const r = subtitle(ctx, s, t, W, H); if (r && r.full) texts.push({ id: 's' + i, ...r }); });
    title(ctx, TITLE, t, W, H).forEach((r, i) => texts.push({ id: 'title' + i, ...r }));
  }
}

function events() {
  const ev = [], track = [];
  for (let t = 0; t <= DUR; t += 0.005) {
    const h = headAt(P, t), i = Math.floor(h), cam = camAt(P, CAM, t, W, H), M = worldToScreen(cam, W, H);
    const p = M(...posAt(P, h)); const seg = P.segs[P.SEG[i]];
    const moving = t >= P.T[0] && t <= END && !(t > SILENCE[0] && t < SILENCE[1]);
    track.push([+t.toFixed(3), moving ? Math.round(P.V[i]) : 0, +(p[0] / W).toFixed(3), seg.style]);
  }
  ev.push({ t: 0, type: 'track', data: track });
  ev.push({ t: P.T[0], type: 'tap' });
  P.blots.forEach(b => ev.push({ t: b.t0, type: 'blot', dur: b.dur }));
  P.segs.forEach(s => ev.push({ t: s.t[0], type: 'seg', id: s.id, t1: s.t[1] }));
  ev.push({ t: END, type: 'lift' });
  ev.push({ t: 25.6 * 1.2, type: 'pull' });
  return ev;
}

window.DUR = DUR;
window.EV = events();
window.TEXTS = t => { render(t); return texts; };
window.render = render;
window.READY = true;
