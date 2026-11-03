"""Mix: pen on paper (synthesised from pen speed) + first touch + blot + page lift + room tone + solo guitar → out/mix.wav"""
import os, sys, json, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', os.path.abspath(os.path.join(HERE, '../..')))
sys.path.insert(0, LIB)
from core.audio.sfx import SR, add, bp, lp, limit
E = json.load(open(os.path.join(HERE, 'events.json'))); ev = E['ev']
DUR = E['dur'] + 0.3; N = int(DUR * SR)
rng = np.random.default_rng(5)
get = lambda typ: [e for e in ev if e['type'] == typ]
SIL = (6.3 * 1.2, 8.3 * 1.2)
track = get('track')[0]['data']
tt = np.array([r[0] for r in track]); v = np.array([r[1] for r in track], float); px = np.array([r[2] for r in track]); knot = np.array([r[3] in ('knot', 'rush') for r in track], float)
T = np.arange(N) / SR
V = np.interp(T, tt, v); PX = np.interp(T, tt, px); KN = np.interp(T, tt, knot)
def smooth(x, ms): n = max(1, int(SR * ms / 1000)); return np.convolve(x, np.ones(n) / n, 'same')
amp = smooth(np.clip(V / 520, 0, 1.5) ** 0.5, 30)
grain = np.zeros(N); dens = np.clip(V / 520, 0, 2) * 90 + (V > 5) * 25
idx = np.nonzero(rng.random(N) < dens / SR)[0]; grain[idx] = rng.standard_normal(len(idx)) * (0.5 + rng.random(len(idx)))
grain = bp(grain, 2500, 9000, 2)
white = rng.standard_normal(N)
hi, lo = bp(white, 2200, 7500, 2), bp(white, 700, 2400, 2)
bright = np.clip(V / 700, 0, 1)
scr = amp * ((0.55 + 0.45 * bright) * hi + (1 - bright) * 0.8 * lo) + amp * 1.6 * grain
# the knot is scratchier (more ticks, a little rougher)
scr *= 1 + 0.35 * KN * (smooth((rng.random(N) < 30 / SR).astype(float) * 30, 20).clip(0, 1))
scr = lp(scr, 9000, 2) * 0.13
pan = (PX - .5) * 1.1
pen = np.stack([scr * np.sqrt(np.clip(.5 - pan / 2, 0, 1)), scr * np.sqrt(np.clip(.5 + pan / 2, 0, 1))], 1).astype(np.float32)
sfx = pen.copy()
for e in get('tap'):
    d = int(.25 * SR); t = np.arange(d) / SR
    tick = np.sin(2 * np.pi * 2300 * t) * np.exp(-t / .004) * .5 + bp(rng.standard_normal(d), 1500, 6000) * np.exp(-t / .006) * .6
    add(sfx, ((tick + np.sin(2 * np.pi * 140 * t) * np.exp(-t / .03) * .5) * .22).astype(np.float32), e['t'] - .005, 1.0, -.3)
for e in get('blot'):
    d = int(1.8 * SR); t = np.arange(d) / SR
    add(sfx, (lp(rng.standard_normal(d), 900, 2) * np.sin(np.pi * np.clip(t / 1.8, 0, 1)) ** 2 * .016).astype(np.float32), e['t'], 1.0, 0)
for e in get('pull'):   # page lift as the camera pulls back
    d = int(1.4 * SR); t = np.arange(d) / SR
    add(sfx, (bp(rng.standard_normal(d), 300, 2500) * np.sin(np.pi * t / 1.4) ** 2 * .02).astype(np.float32), e['t'], 1.0, .2)
# room tone, dropped during the silence
room = lp(np.cumsum(rng.standard_normal(N)) * .002, 400, 2); room = room - smooth(room, 500)
room = (room / (np.abs(room).max() + 1e-9) * .004).astype(np.float32)
g = np.ones(N, np.float32); g[int((SIL[0] + .15) * SR):int((SIL[1] - .4) * SR)] = .12
sfx += np.stack([room, room], 1) * g[:, None]
mus, _ = sf.read(os.path.join(HERE, 'out', 'score.wav')); m = np.zeros((N, 2), np.float32); n = min(N, len(mus)); m[:n] = mus[:n]
mix = m * .5 + sfx
# final fade
f = int(1.2 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None]
mix = limit(mix, .95)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
def db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
for i in range(0, int(DUR), 4):
    sl = slice(i * SR, (i + 4) * SR); print(f'{i:2d}s music {db(m[sl] * .5):6.1f} pen {db(pen[sl]):6.1f}')
