"""Score: one solo nylon-string guitar line, written to the drawing (D major, ~72 bpm). → out/score.wav"""
import os, sys, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', os.path.abspath(os.path.join(HERE, '../..')))
sys.path.insert(0, LIB)
from core.audio import pluck as P
from core.audio.sfx import SR, add
DUR = 41.0
TS = 1.2
# (time, pitch, dur, vel, pan)
N = []
# 1 rush + knot: nervous, rising, chromatic neighbours, getting faster
seq = ['D4', 'E4', 'F4', 'E4', 'F#4', 'G4', 'G#4', 'A4']
for i, p in enumerate(seq): N.append((0.30 + i * 0.27, p, .5, .45 + i * .02, -.1))
t = 2.45; knot = ['A4', 'Bb4', 'A4', 'G#4', 'A4', 'C5', 'B4', 'Bb4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'E4']
for i, p in enumerate(knot): N.append((t, p, .35, .42 + .02 * np.sin(i), .1 * np.sin(i))); t += 0.2 + 0.006 * i
N += [(5.15, 'E4', 1.0, .5, 0), (5.75, 'C#4', .9, .45, 0)]
SIL = (6.3 * TS, 8.3 * TS)
# 2 after the silence: first sound = one low D, the line starts to untangle
N += [(8.3, 'D3', 3.2, .62, 0)]
N += [(9.6, 'F#4', 1.2, .5, 0), (10.5, 'A4', 1.0, .52, 0), (11.3, 'D5', 1.8, .56, 0), (12.9, 'C#5', .9, .5, 0), (13.6, 'B4', .9, .5, 0)]
# 3 consultation: singing line, low notes underneath
N += [(14.2, 'A4', .9, .52, 0), (15.0, 'B4', .9, .54, 0), (15.8, 'D5', 1.0, .56, 0), (16.7, 'E5', .9, .56, 0), (17.5, 'F#5', 1.6, .6, 0), (19.0, 'E5', .9, .52, 0)]
N += [(14.0, 'D3', 1.8, .42, -.1), (15.7, 'G2', 1.8, .42, -.1), (17.4, 'B2', 1.6, .42, -.1), (19.0, 'A2', 1.0, .42, -.1)]
# 4 road: walking pace
walk = ['D5', 'C#5', 'B4', 'A4', 'B4', 'C#5', 'D5', 'E5']
for i, p in enumerate(walk): N.append((19.8 + i * 0.42, p, .45, .5, .05))
N += [(20.0, 'D3', 1.6, .42, -.1), (23.4, 'F#5', .6, .55, 0), (24.0, 'G5', .6, .56, 0), (23.4, 'G2', 1.2, .42, -.1), (24.4, 'A2', .8, .42, -.1)]
# 5 the door is complete → highest note; resolve as the camera pulls back; ring out
N += [(25.0, 'A5', 2.6, .62, 0), (27.2, 'D5', 3.0, .55, 0), (27.2, 'A3', 3.0, .4, -.1), (27.2, 'D3', 3.4, .45, -.1), (28.6, 'F#4', 4.2, .4, .1), (29.4, 'D4', 4.6, .38, 0)]

buf = np.zeros((int(DUR * SR), 2), np.float32)
for (t0, p, d, v, pan) in N:
    t0 *= TS; d *= TS
    x = P.pluck('nylon_guitar', p, max(d * 2.2, 1.2), vel=v).astype(np.float32)
    # damp the note after its written length (a held finger releases), short fade
    k = int(d * 1.6 * SR)
    if k < len(x): fade = np.linspace(1, 0, min(len(x) - k, int(.35 * SR))); x[k:k + len(fade)] *= fade; x[k + len(fade):] = 0
    add(buf, x, t0, 1.0, pan)
# literal silence: zero everything (including tails) during the stop
a, b = int(SIL[0] * SR), int(SIL[1] * SR)
fade = int(.12 * SR); buf[a:a + fade] *= np.linspace(1, 0, fade)[:, None]; buf[a + fade:b] = 0
buf /= np.abs(buf).max() + 1e-9
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'score.wav'), (buf * .8).astype(np.float32), SR)
print('score', len(N), 'notes')
