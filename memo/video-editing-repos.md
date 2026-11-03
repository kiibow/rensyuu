# 動画編集を全部こなす無料OSSリポジトリ 11選

（2026-11-03 メモ / 出典: X の投稿「Opus 5.5 が Premiere Pro を置き換えた」）

## ポイント
- カット・手ぶれ補正・カラーグレーディング・スローモーション・アップスケール・音の分離（ステム）・タイトル・書き出しまで、全部無料のOSSで回せる、という主張。
- 投稿者は4分23秒の自分の映像で各リポジトリを実行したとのこと。
- 投稿にはPDF（モーションデザインガイド）と記事のリンクも付いていたが、このメモには含まれていない。

## リポジトリ一覧（URLはGitHub検索で確認済み、★は確認時点）

| # | 名前 | 何をするか | URL |
|---|------|-----------|-----|
| 1 | PySceneDetect | 映像のショット（カットの切れ目）を自動検出 | https://github.com/Breakthrough/PySceneDetect （★5.3k） |
| 2 | Auto-Editor | 無音・動きのない部分（デッドエア）を自動カット | https://github.com/WyattBlue/auto-editor （★5.7k） |
| 3 | vid.stab | 手ぶれ映像の安定化（FFmpegのフィルタとしても使える） | https://github.com/georgmartius/vid.stab （★1.0k） |
| 4 | color-matcher | 全ショットの色を1枚の参照画像に合わせてグレーディング | https://github.com/hahnec/color-matcher （★0.7k） |
| 5 | rembg | グリーンスクリーンなしで背景を除去 | https://github.com/danielgatis/rembg （★25.3k） |
| 6 | RIFE (ECCV2022-RIFE) | フレーム補間で通常映像を滑らかなスローモーションに | https://github.com/hzwer/ECCV2022-RIFE （★5.6k） |
| 7 | Real-ESRGAN | 低解像度の映像を4倍にアップスケール | https://github.com/xinntao/Real-ESRGAN （★37.3k） |
| 8 | Demucs | 曲をボーカル・ドラム・ベース等のステムに分離 | https://github.com/facebookresearch/demucs （★10.4k） |
| 9 | librosa | ビートを検出して、カットを音楽に合わせる | https://github.com/librosa/librosa （★8.8k） |
| 10 | HyperFrames | HTMLを書くだけでアニメーションタイトル／動画を作る（エージェント向け） | https://github.com/heygen-com/hyperframes （★77.9k） |
| 11 | FFmpeg | 最終的な動画の書き出し（ほぼ全部の土台） | https://github.com/FFmpeg/FFmpeg （★66.4k） |

## 補足（実際に触ってみての感想）
- FFmpeg と librosa は、うえの弁護士事務所の試作アニメ作成でも実際に使った（書き出し・音量調整）。
- RIFE / Real-ESRGAN / Demucs / rembg はAIモデルを動かすので、GPUがあると速い。CPUだけだと遅い。
- 「Premiere Pro を置き換えた」は誇張気味。個々の作業は自動化できるが、全体の演出や判断は人が決める必要がある。

## TODO
- [ ] 投稿のPDF（モーションデザインガイド）を入手したら、内容を追記する
