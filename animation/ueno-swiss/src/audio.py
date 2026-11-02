"""Score (kalimba ostinato + kick/hat + pizz bass, 100 bpm) and print foley from events.json → out/mix.wav"""
import os, sys, json, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', os.path.abspath(os.path.join(HERE, '../..')))
sys.path.insert(0, LIB)
from core.audio import pluck as P
from core.audio.sfx import SR, add, bp, lp, hp, limit
E = json.load(open(os.path.join(HERE, 'events.json'))); ev = E['ev']
DUR = E['dur'] + 0.4; N = int(DUR * SR)
BEAT = 0.6; BAR = 2.4
STOP, LAND, WALL = 29.4, 30.0, 28.2
rng = np.random.default_rng(3)
mus = np.zeros((N, 2), np.float32); fx = np.zeros((N, 2), np.float32)
cache = {}
def note(preset, p, d, v):
    k = (preset, p, round(d, 2), round(v, 2))
    if k not in cache: cache[k] = P.pluck(preset, p, d, vel=v).astype(np.float32)
    return cache[k]
# chords per bar (D minor → Bb → F → C), as kalimba pentatonic patterns
CH = [['D4', 'F4', 'A4', 'C5'], ['D4', 'F4', 'Bb4', 'D5'], ['C4', 'F4', 'A4', 'C5'], ['C4', 'E4', 'G4', 'C5']]
BASS = ['D2', 'Bb1', 'F2', 'C2']
PAT = [0, 2, 1, 3, 2, 1, 3, 2]
t = 0.0; bar = 0
while t < STOP - 1e-6:
    ch = CH[bar % 4]
    for i, k in enumerate(PAT):
        tt = t + i * BEAT / 2
        if tt >= STOP - 1e-6: break
        add(mus, note('kalimba', ch[k], 1.2, .5 + (.12 if i % 2 == 0 else 0)), tt, .55, -.25 + .5 * (k / 3))
    if 9.6 <= t < WALL:
        for b in (0, 2):
            if t + b * BEAT < STOP: add(mus, note('upright_bass_pizz', BASS[bar % 4], 1.0, .7), t + b * BEAT, .9, 0)
    t += BAR; bar += 1
def kick():
    d = int(.35 * SR); x = np.arange(d) / SR
    f = 50 + 70 * np.exp(-x / .03); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-x / .12) + bp(rng.standard_normal(d), 1000, 5000) * np.exp(-x / .004) * .2).astype(np.float32)
def hat():
    d = int(.08 * SR); x = np.arange(d) / SR
    return (hp(rng.standard_normal(d), 7000) * np.exp(-x / .018)).astype(np.float32)
K, Hh = kick(), hat()
b = 2.4
while b < STOP - 1e-6:
    add(mus, K, b, .55 if b < 9.6 else .7, 0)
    if 9.6 <= b < WALL: add(mus, Hh, b + BEAT / 2, .12, .2)
    b += BEAT
# hard stop of everything on 29.4 (tails cut)
a = int(STOP * SR); f = int(.015 * SR); mus[a:a + f] *= np.linspace(1, 0, f)[:, None]; mus[a + f:] = 0
# the land: F major bloom, bass F, kick; then a quiet F ostinato under the end card
add(mus, K, LAND, .8, 0); add(mus, note('upright_bass_pizz', 'F2', 2.4, .8), LAND, 1.0, 0)
for i, p in enumerate(['F4', 'A4', 'C5', 'F5']): add(mus, note('kalimba', p, 2.5, .6), LAND + i * 0.03, .6, -.2 + .15 * i)
FP = ['F4', 'A4', 'C5', 'A4', 'G4', 'C5', 'A4', 'F4']
t = LAND + BAR
while t < DUR - 1.5:
    for i, p in enumerate(FP):
        tt = t + i * BEAT / 2
        if tt < DUR - 1.2: add(mus, note('kalimba', p, 1.2, .4), tt, .4, -.2 + .05 * i)
    add(mus, note('upright_bass_pizz', 'F2', 1.2, .55), t, .7, 0)
    t += BAR
# ---------- print foley ----------
def burst(d, lo, hi, tau, g):
    n = int(d * SR); x = np.arange(n) / SR
    return (bp(rng.standard_normal(n), lo, hi) * np.exp(-x / tau) * g).astype(np.float32)
for e in ev:
    ty, t0 = e['type'], e['t']
    if ty == 'slap': add(fx, burst(.12, 300, 3000, .02, .5 if e.get('big') else .3), t0, 1, -.1)
    elif ty == 'thunk':
        n = int(.18 * SR); x = np.arange(n) / SR
        add(fx, (np.sin(2 * np.pi * 90 * x) * np.exp(-x / .05) * .5 + bp(rng.standard_normal(n), 800, 3000) * np.exp(-x / .005) * .3).astype(np.float32), t0, 1, -.3)
    elif ty == 'tss':
        n = int(e['dur'] * SR); x = np.linspace(0, 1, n)
        add(fx, (bp(rng.standard_normal(n), 4000, 9000) * np.sin(np.pi * x) ** .6 * .035).astype(np.float32), t0, 1, .2)
    elif ty == 'pan':
        n = int(.45 * SR); x = np.linspace(0, 1, n)
        add(fx, (bp(rng.standard_normal(n), 200, 2000) * np.sin(np.pi * x) ** 2 * (.12 if e.get('big') else .08)).astype(np.float32), t0 - .3, 1, 0)
    elif ty == 'snick': add(fx, burst(.06, 3000, 9000, .006, .45), t0, 1, .1)
    elif ty == 'land':
        n = int(.3 * SR); x = np.arange(n) / SR
        add(fx, (np.sin(2 * np.pi * 70 * x) * np.exp(-x / .08) * .6 + lp(rng.standard_normal(n), 600) * np.exp(-x / .02) * .4).astype(np.float32), t0, 1, 0)
mix = mus * .5 + fx
f = int(1.5 * SR); mix[-f:] *= np.linspace(1, 0, f)[:, None]
mix = limit(mix, .95)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix.astype(np.float32), SR)
print('mix ok', mix.shape)
