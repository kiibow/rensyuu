"""librosa: find the sting's strongest onsets and write them as the cue times the picture locks to → cues.json"""
import json, numpy as np, librosa
y, sr = librosa.load('assets/audio/sting.wav', sr=48000, mono=True)
env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=256)
on = librosa.onset.onset_detect(onset_envelope=env, sr=sr, hop_length=256, units='time', backtrack=False)
st = {round(float(t), 3): float(env[librosa.time_to_frames(t, sr=sr, hop_length=256)]) for t in on}
print('all onsets:', {k: round(v, 2) for k, v in st.items()})
want = {'line': 0.6, 'open': 1.4, 'hairline': 3.2}
cues = {}
for k, w in want.items():
    near = [t for t in st if abs(t - w) < 0.12]
    cues[k] = round(max(near, key=lambda t: st[t]) if near else w, 3)
lt = sorted(t for t in st if 1.95 <= t <= 3.0)
cues['letters'] = lt
json.dump(cues, open('cues.json', 'w'), indent=1)
print('cues', cues)
