#!/bin/sh
# events → score + foley → frames → mux (two-pass loudnorm −14 LUFS; done by hand because mux.sh needs ffmpeg 7)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../.." && pwd)}; export LIB
cd "$LIB"
node core/render/events.mjs "$HERE"
.venv/bin/python "$HERE/audio.py"
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --out "$HERE/out/video.mp4"
cd "$HERE/out"
J=$(ffmpeg -hide_banner -i mix.wav -af loudnorm=I=-14:TP=-1.2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | python3 -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -hide_banner -loglevel error -y -i video.mp4 -i mix.wav -map 0:v -map 1:a -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p \
  -af "loudnorm=I=-14:TP=-1.2:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,aresample=48000" \
  -c:a aac -b:a 192k -shortest -movflags +faststart "$HERE/ueno-swiss.mp4"
