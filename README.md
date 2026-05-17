# care-taxi-shell-v22

目的：PDFトレース前提の固定比率UI骨格。

- 青帯は画面横いっぱいに自然に伸びる fluid header
- 青帯の中身は中央の固定基準に置く
- 本文は固定比率 stage を全体 scale する
- LOCATION / DETAIL / DAYS / STATUS の外枠は原則固定
- 赤線・ガイド線・端末ステータス文字・MAPは描画しない
- 中身は今後、各エリア内だけ個別実装する

CSS参照は GitHub Pages 対応の相対パス `./css/...`。

## v23 balance adjustment
v22をベースに、構造は維持したまま以下のみ調整。
- 固定ステージの中央計算をJSで明示
- header内パーツを少し左へ
- LOCATION/DETAIL/DAYS/STATUSラベル基準を微調整
- 青帯はfluidのまま維持
