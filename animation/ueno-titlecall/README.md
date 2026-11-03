# うえの弁護士事務所 タイトルコール（試作・8秒）

使ったツール（メモ「動画編集を全部こなす無料OSSリポジトリ 11選」より）:
- **HyperFrames**（HTML → 動画）: `src/index.html` が映像本体。GSAPのタイムラインで動きを指定し、`npx hyperframes@0.9.7 render` で書き出し。
- **librosa**: 効果音楽 `sting.wav` の「アタック（音の立ち上がり）」を自動検出し、その時刻に映像の動きを合わせた（`src/tools/beats.py` → `src/cues.json`: 0.603 / 1.408 / 3.211 秒）。
- **FFmpeg**: 音量を −14 LUFS（動画サイトの標準）に整えて最終書き出し。

音楽は `src/tools/sting.py` でプログラム合成（サンプル素材なし）。ナレーションは、この作業環境から音声合成サービスに接続できなかったため無し。

再現手順: `python tools/sting.py && python tools/beats.py` → `npx hyperframes@0.9.7 render` → FFmpeg で loudnorm。
フォント（容量が大きいためリポジトリには含めていない。SIL OFL 1.1）: Noto Serif JP / Noto Sans JP（github.com/google/fonts の ofl/notoserifjp, ofl/notosansjp）を `src/assets/fonts/NotoSerifJP.ttf`, `NotoSansJP.ttf` に置く。GSAP 3.15.0 は npm から `src/assets/gsap.min.js` に置く。
