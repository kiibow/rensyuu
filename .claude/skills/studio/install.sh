#!/usr/bin/env bash
# studio スキルを「自分の全プロジェクト」で使えるように、~/.claude/skills/studio にコピーする
set -euo pipefail
src="$(cd "$(dirname "$0")" && pwd)"
dst="${HOME}/.claude/skills/studio"
mkdir -p "$(dirname "$dst")"
if [ "$src" = "$dst" ]; then echo "すでに $dst にあります"; exit 0; fi
rm -rf "$dst"
rsync -a --exclude 'video-kit/out' --exclude 'video-kit/fonts/*.ttf' "$src/" "$dst/" 2>/dev/null || { cp -r "$src" "$dst"; rm -rf "$dst/video-kit/out" "$dst"/video-kit/fonts/*.ttf; }
echo "インストールしました：$dst"
echo "Claude Code を開き直すと、どのプロジェクトでも「動画作って」「企画して」などで studio が動きます。"
