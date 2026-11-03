"""Synthesize the title-call sting (8 s, 48 kHz stereo) → assets/audio/sting.wav. No samples."""
import numpy as np, soundfile as sf, os
SR = 48000; DUR = 8.0; N = int(SR * DUR); rng = np.random.default_rng(1)
t = np.arange(N) / SR
out = np.zeros((N, 2))
def env(a, d, r, n):  # attack/decay/release envelope of length n samples
    x = np.arange(n) / SR; e = np.minimum(1, x / max(a, 1e-4)) * np.exp(-np.maximum(0, x - a) / d)
    if r: e *= np.clip((n / SR - x) / r, 0, 1)
    return e
def put(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR); n = min(len(sig), N - i)
    if n <= 0: return
    out[i:i + n, 0] += sig[:n] * gain * np.sqrt(.5 - pan / 2); out[i:i + n, 1] += sig[:n] * gain * np.sqrt(.5 + pan / 2)
def lpf(x, fc):  # one-pole low-pass
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y
def tone(f, dur, harm=(1, .5, .25, .12), detune=0.0):
    n = int(dur * SR); x = np.arange(n) / SR; s = np.zeros(n)
    for k, h in enumerate(harm, 1): s += h * np.sin(2 * np.pi * f * k * (1 + detune) * x + rng.random() * 6)
    return s
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
# 0.0–0.6: low sub swell
n = int(1.0 * SR); x = np.arange(n) / SR
put(np.sin(2 * np.pi * 41 * x) * (x / 1.0) ** 2 * 0.5, 0.0)
# HIT 1 at 0.6: soft boom + glassy pluck (the line draws)
def boom(f0=55, dur=1.6, g=1.0):
    n = int(dur * SR); x = np.arange(n) / SR; f = f0 + 60 * np.exp(-x / .05)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / .5) * g
def bell(m, dur=3.0):
    n = int(dur * SR); x = np.arange(n) / SR; f = hz(m)
    s = sum(a * np.sin(2 * np.pi * f * r * x) * np.exp(-x / (dur * d)) for r, a, d in [(1, 1, .5), (2.76, .4, .25), (5.4, .2, .12), (8.9, .08, .06)])
    return s * np.minimum(1, x / .004)
put(boom(52, 2.0, .9), 0.6); put(bell(86, 2.5) * .25, 0.6, .2, .3)
# riser 0.7→1.4 (filtered noise swell)
n = int(.7 * SR); x = np.linspace(0, 1, n); nz = rng.standard_normal(n)
put(np.diff(np.concatenate([[0], lpf(nz, 2500)])) * x ** 3 * (1 - x ** 40) * 2.5, 0.7, 1, -.2)
# HIT 2 at 1.4: the plates open — big boom + warm chord (D major add9: D2 A2 D3 F#3 A3 E4)
put(boom(46, 3.0, 1.1), 1.4)
n = int(.05 * SR); put(rng.standard_normal(n) * np.exp(-np.arange(n) / SR / .008) * .5, 1.4)   # transient: the plates part
chord = [38, 45, 50, 54, 57, 64]
for i, m in enumerate(chord):
    s = tone(hz(m), 6.2, detune=.0015 * (i % 2)) + tone(hz(m), 6.2, detune=-.002)
    s = lpf(s, 1800 + 300 * i) * env(.25, 2.8, 1.2, len(s)) * (.11 if m > 45 else .16)
    put(s, 1.4, 1, -.4 + .16 * i)
# letters 2.0–2.9: a soft shimmer tick per letter (9 letters, 0.1 s apart), rising pentatonic
for i, m in enumerate([74, 76, 78, 81, 83, 86, 88, 90, 93]): put(bell(m, 1.2) * .07, 2.0 + i * .1, 1, -.5 + i * .12)
# HIT 3 at 3.2: the hairline + tagline — a clear bell on A5 + low D
put(bell(81, 4.0) * .35, 3.2, 1, .1); put(boom(73.4 / 1.0, 1.2, .35), 3.2)
# exit swell down after 6.6
# simple reverb: convolve with decaying stereo noise
ir_n = int(2.4 * SR); xi = np.arange(ir_n) / SR
for ch in (0, 1):
    ir = rng.standard_normal(ir_n) * np.exp(-xi / .55); ir[0] = 0
    wet = np.fft.irfft(np.fft.rfft(out[:, ch], 2 * N) * np.fft.rfft(ir, 2 * N))[:N]
    out[:, ch] = out[:, ch] + wet * .012
f = int(1.4 * SR); out[-f:] *= np.linspace(1, 0, f)[:, None] ** 2
out /= np.abs(out).max() + 1e-9
os.makedirs('assets/audio', exist_ok=True)
sf.write('assets/audio/sting.wav', (out * .89).astype(np.float32), SR)
print('sting.wav written')
