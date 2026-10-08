#!/usr/bin/env bash
# 検証：言ったことだけを README に書くための証拠を出す
set -uo pipefail
cd "$(dirname "$0")"
S=$(mktemp -d)
echo "== 1. 同じコマを2回描いて一致するか"
node render.mjs stills 1920 1080 "$S/a" 1.5 >/dev/null && node render.mjs stills 1920 1080 "$S/b" 1.5 >/dev/null
cmp -s "$S/a/t01.50.png" "$S/b/t01.50.png" && echo "OK 完全一致" || echo "NG 一致しない（乱数や時計に依存している）"
echo "== 2. 各ファイルの解像度と長さ"
for f in out/*.mp4; do echo "$f $(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$f") $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")s"; done
echo "== 3. 音量（目標 -16 LUFS / true peak -1.5 dBTP 以下）"
ffmpeg -hide_banner -i out/master_16x9.mp4 -vn -af loudnorm=I=-16:TP=-1.5:print_format=summary -f null - 2>&1 | grep -E "Input (Integrated|True Peak)"
echo "== 4. コンタクトシート（1拍ごと・音なしで流れが分かるか見る） -> out/contact.png"
node render.mjs beats 640 360 "$S/beats" >/dev/null
ffmpeg -loglevel error -y -pattern_type glob -i "$S/beats/*.png" -vf "tile=6x$(( ($(ls "$S/beats" | wc -l) + 5) / 6 )):padding=6:color=0x1E1C19" -frames:v 1 out/contact.png && echo "OK"
echo "== 5. 縦型の最後のコマを 390px 幅に縮めたもの -> out/check_390.png（全部の文字が読めるか目で見る）"
node render.mjs stills 1080 1920 "$S/t" last >/dev/null
ffmpeg -loglevel error -y -i "$(ls "$S"/t/*.png | head -1)" -vf scale=390:-1 out/check_390.png && echo "OK"
rm -rf "$S"
