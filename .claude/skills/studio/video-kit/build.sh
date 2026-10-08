#!/usr/bin/env bash
# 全部書き出す：音 → 16:9 / 9:16 / 1:1 / 動きを減らした版 → ラウドネス調整（-16 LUFS, -1.5 dBTP）して合成
set -euo pipefail
cd "$(dirname "$0")"
[ -f fonts/Noto_Sans_JP_wght_400.ttf ] || fonts/get-fonts.sh
mkdir -p out
node render.mjs timing || echo "※ 読む時間が足りない行あり（上の NG 行を直すこと）"
node render.mjs audio out/raw.wav
ffmpeg -loglevel error -y -i out/raw.wav -af loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000 -c:a pcm_s16le out/mix.wav
render() { # w h name [rm]
  node render.mjs video "$1" "$2" "out/$3" "${4:-}" 4
  ffmpeg -loglevel error -y -i "out/$3.video.mp4" -i out/mix.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "out/$3.mp4"
  rm "out/$3.video.mp4"
}
render 1920 1080 master_16x9
render 1080 1920 cut_9x16
render 1080 1080 cut_1x1
render 1920 1080 master_16x9_reduced_motion rm
rm -f out/raw.wav out/mix.wav
./check.sh
