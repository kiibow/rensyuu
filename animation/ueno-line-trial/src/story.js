// Single source of truth for the timeline (seconds). No voice: the subtitles are written on, like the line.
export const TS = 1.2;                  // global time scale applied to the drawing, camera and score (slower = calmer)
export const DUR = 40.0;
export const SUBS = [
  { text: '誰に相談すればいいのか。', t0: 0.7, t1: 6.0 },
  { text: 'ひとりで、悩まないで。', t0: 6.7, t1: 11.6 },
  { text: '一つずつ、ほどけます。', t0: 12.0, t1: 16.9 },
  { text: 'まずは、お話を聞かせてください。', t0: 17.5, t1: 23.9 },
  { text: '進む道を、一緒に考えます。', t0: 24.3, t1: 29.6 },
];
export const SILENCE = [6.3 * TS, 8.3 * TS];      // the pen stops: literal silence
export const TITLE = { t0: 31.6, name: 'うえの弁護士事務所', tag: 'ご相談、お待ちしています。' };
