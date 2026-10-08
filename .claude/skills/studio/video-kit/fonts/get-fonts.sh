#!/usr/bin/env bash
# Google Fonts から Noto Sans JP（400/700/900）と JetBrains Mono（500）を取得する（OFL）
set -euo pipefail
cd "$(dirname "$0")"
for spec in "Noto+Sans+JP:wght@400" "Noto+Sans+JP:wght@700" "Noto+Sans+JP:wght@900" "JetBrains+Mono:wght@500"; do
  url=$(curl -sS -A "Mozilla/4.0" "https://fonts.googleapis.com/css2?family=$spec" | grep -oE "https://[^)]+" | head -1)
  curl -sS -o "$(echo "$spec" | tr ':+@' '___').ttf" "$url"
done
