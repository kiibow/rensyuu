// Camera keyframes: t, composition centre (x,y paper units), z zoom (1 ≈ whole picture), r roll (deg), f follow weight
import { TS } from './story.js';
const CAM0 = [
  { t: 0.0, x: -1080, y: 30, z: 2.3, r: -2, f: .85 },        // mid-line at speed
  { t: 2.4, x: -760, y: -10, z: 2.4, r: 2, f: .55 },          // into the knot, a little roll
  { t: 4.6, x: -720, y: -10, z: 2.7, r: -1, f: .25 },
  { t: 6.3, x: -718, y: -8, z: 3.1, r: 0, f: .05 },           // the stop
  { t: 8.3, x: -716, y: -6, z: 3.6, r: 0, f: 0 },             // slow push-in through the silence
  { t: 10.5, x: -700, y: 0, z: 2.6, r: 0, f: .3 },            // the knot unwinds
  { t: 13.4, x: -470, y: 60, z: 2.2, r: 0, f: .55 },
  { t: 14.8, x: -160, y: 30, z: 1.85, r: 0, f: .1 },          // consultation: composed, reads as a whole
  { t: 19.6, x: -140, y: 30, z: 1.95, r: 0, f: .12 },
  { t: 21.0, x: 380, y: 60, z: 2.0, r: 0, f: .7 },            // lateral follow along the road
  { t: 22.2, x: 650, y: 10, z: 2.2, r: 0, f: .15 },           // the door
  { t: 25.0, x: 660, y: 10, z: 2.35, r: 0, f: .15 },
  { t: 29.0, x: -40, y: -165, z: 0.86, r: 0, f: 0 },           // continuous pull-back: everything was one line
  { t: 33.4, x: -40, y: -168, z: 0.85, r: 0, f: 0 },
];
export const CAM = CAM0.map(k => ({ ...k, t: k.t * TS }));
