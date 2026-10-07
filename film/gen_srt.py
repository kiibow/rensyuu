# TIMELINE の見出しと効果音から captions.srt を作る
import re
js = open('src/film.js', encoding='utf-8').read()
hs = re.findall(r"\[(\d+\.\d+), (\d+\.\d+), '([^']*)', '([^']*)', (\d+\.?\d*)\]", js)
def ts(x):
    ms = int(round(min(float(x), 30.0) * 1000))
    return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}"
cues = [(float(a) + 0.12, float(b), l1 + "\n" + l2) for a, b, l1, l2, d in hs]
cues += [(5.0, 5.9, '[ドスン：×が付く]'), (13.0, 13.9, '[3音のモチーフ：AIが自分のコマを見る]'),
         (23.0, 23.9, '[カチッ：「見る」をOFF]'), (24.0, 24.9, '[音が痩せる]'), (25.0, 25.9, '[カチッ：「見る」をON]')]
out = [f"{i}\n{ts(a)} --> {ts(b)}\n{t}\n" for i, (a, b, t) in enumerate(sorted(cues), 1)]
open('out/captions.srt', 'w', encoding='utf-8').write("\n".join(out))
