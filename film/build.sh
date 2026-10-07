#!/usr/bin/env bash
# 全書き出し：音 → 各フォーマットの映像 → ラウドネス調整した音と合成
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
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
rm out/raw.wav
echo BUILD_OK
