// The whole film is one line. Designed backwards from the final picture (left → right):
//   a tangled knot (the worry) · it unwinds into a calm line · two people across a table (the consultation) ·
//   the ground runs on as a road · an open door (the only colour) · the line runs on off the paper.
// Paper units, y down. Ground at y = 150.
import { mulberry } from '/core/lib.js';
import { TS } from './story.js';

const f1 = v => v.toFixed(1);
// Catmull-Rom through points → SVG path string (starts with M)
function curve(pts) {
  let d = `M ${f1(pts[0][0])},${f1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${f1(c1[0])},${f1(c1[1])} ${f1(c2[0])},${f1(c2[1])} ${f1(p2[0])},${f1(p2[1])}`;
  }
  return d;
}

export const GY = 150;
export const KNOT = [-720, -10];

// ---------- 1 rush: mid-line at speed from off the left edge, a nervous wave ----------
const RUSH = (() => {
  const pts = [];
  for (let i = 0; i <= 14; i++) { const x = -1250 + i * 34; pts.push([x, 40 + Math.sin(i * 1.3) * 34 - i * 3]); }
  pts.push([-760, -40], [-735, -70]);
  return curve(pts);
})();

// ---------- 2 knot: a seeded scribble of loops that tightens around one centre, ending at its middle ----------
const KNOTD = (() => {
  const r = mulberry(7), pts = [];
  let a = -1.2;
  const n = 120;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    a += 0.55 + r() * 0.35;
    const R = (95 - 70 * u) * (0.55 + r() * 0.6);
    const ox = Math.sin(i * 0.37) * 26 * (1 - u), oy = Math.cos(i * 0.23) * 18 * (1 - u);
    pts.push([KNOT[0] + ox + Math.cos(a) * R * 1.15, KNOT[1] + oy + Math.sin(a) * R]);
  }
  pts.push([KNOT[0] + 4, KNOT[1] + 2]);
  return curve(pts);
})();

// ---------- 3 untangle: from the stopped centre, an opening spiral (the knot unwinds) that leaves calm to the right and settles on the ground ----------
const UNTANGLE = (() => {
  const pts = [];
  const c = [KNOT[0] + 4, KNOT[1] + 2];
  for (let i = 0; i <= 40; i++) { const u = i / 40, a = Math.PI * 0.5 + u * Math.PI * 2.5, R = 6 + 150 * Math.pow(u, 1.15); pts.push([c[0] + Math.cos(a) * R * 1.12, c[1] + Math.sin(a) * R]); }
  const last = pts.at(-1);
  pts.push([last[0] + 60, last[1] + 40], [-520, 110], [-470, 140], [-430, GY]);
  return curve(pts);
})();

// ---------- 4 consultation: client (left, facing right) · table with one pedestal leg · lawyer (right, facing left) ----------
// a head in profile: a circle with a small nose bump on the facing side (dir = +1 faces right). Starts and ends at the neck.
function head(cx, cy, R, dir) {
  const pts = [];
  // start at the back of the neck, go over the top of the head, down the face, nose, chin (y down; built facing right, mirrored for dir = -1)
  for (let i = 0; i <= 30; i++) {
    const u = i / 30, a = Math.PI * (0.65 + 1.7 * u);
    const R2 = R + 7 * Math.exp(-((a - Math.PI * 2.06) ** 2) / 0.012);                  // the nose
    pts.push([cx + dir * Math.cos(a) * R2, cy + Math.sin(a) * R2]);
  }
  return pts;
}
const PEOPLE = (() => {
  const pts = [];
  // client: from the ground up the back, slightly bent (seated, leaning in)
  pts.push([-430, GY], [-428, 110], [-424, 50], [-414, 0], [-400, -28]);
  pts.push(...head(-372, -66, 36, +1));
  // throat → chest → forearm resting forward on the table
  pts.push([-352, -20], [-340, 10], [-318, 40], [-292, 56], [-262, 60]);
  // table top to the middle, down the pedestal leg and back up (retraced), on to the other side
  pts.push([-200, 60], [-150, 60], [-150, 110], [-150, GY - 2], [-150, 110], [-150, 60], [-100, 60], [-40, 60]);
  // lawyer: forearm on the table → chest → head facing left → back down to the ground
  pts.push([-12, 56], [14, 40], [34, 10], [44, -20]);
  pts.push(...head(64, -66, 36, -1).reverse().map(p => [p[0], p[1]]));
  pts.push([96, -28], [110, 0], [118, 50], [120, 110], [122, GY]);
  return curve(pts);
})();

// ---------- 5 road: the ground runs on to the door, with one small step up (things move forward) ----------
const ROAD = curve([[122, GY], [200, GY + 1], [300, GY - 2], [400, GY], [480, GY + 1], [560, GY]]);

// ---------- 6 door (accent): left jamb up, lintel, right jamb down with a knob loop; the door stands open (a slanted leaf) ----------
const DOOR = (() => {
  const L = 580, R = 700, T = -120;
  const pts = [[560, GY], [580, GY], [L, 60], [L, -40], [L, T], [620, T], [660, T], [R, T], [R, -40], [R, 10]];
  // knob: a small loop on the inside of the right jamb
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI * 2; pts.push([R - 12 + Math.cos(a) * -8 + 0, 22 + Math.sin(a) * 8]); }
  pts.push([R, 40], [R, 100], [R, GY]);
  // the open leaf: from the bottom of the right jamb, swing out to the right and up, back down to the ground
  pts.push([R + 4, GY - 4], [R + 60, GY - 24], [R + 64, T + 10], [R + 60, T - 6], [R + 4, T + 4]);
  return curve(pts);
})();
// leave the top of the leaf and come back down along the right jamb (retraced) to the threshold
const DOOR2 = curve([[704, -116], [702, -60], [701, 40], [700, GY - 4], [720, GY]]);

// ---------- 7 onward: the ground continues through the door and off the paper ----------
const ONWARD = curve([[720, GY], [820, GY - 1], [940, GY - 4], [1060, GY - 10], [1180, GY - 16], [1340, GY - 26]]);

// segment table: time windows (s); style = the voice of the line
const SEGS0 = [
  { id: 'rush', style: 'rush', t: [0.25, 2.4], parts: [{ d: RUSH }], slowK: 0.8 },
  { id: 'knot', style: 'knot', t: [2.4, 8.3], parts: [{ d: KNOTD }], slowK: 1.0, holds: [{ f: .999, t: 6.3, dur: 2.0 }] },
  { id: 'untangle', style: 'calm', t: [8.3, 14.0], parts: [{ d: UNTANGLE }], slowK: 1.4 },
  { id: 'table', style: 'adult', t: [14.0, 19.8], parts: [{ d: PEOPLE }], slowK: 2.6 },
  { id: 'road', style: 'adult', t: [19.8, 21.4], parts: [{ d: ROAD }], slowK: 1.0 },
  { id: 'door', style: 'door', t: [21.4, 25.0], parts: [{ d: DOOR }, { d: DOOR2 }], slowK: 2.4 },
  { id: 'onward', style: 'adult', t: [25.0, 28.6], parts: [{ d: ONWARD }], slowK: 0.6 },
];

export const SEGS = SEGS0.map(s => ({ ...s, t: s.t.map(x => x * TS), holds: (s.holds || []).map(h => ({ ...h, t: h.t * TS, dur: h.dur * TS })) }));
