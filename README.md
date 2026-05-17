# care-taxi-shell-v22

目的：PDFトレース前提の固定比率UI骨格。

- 青帯は画面横いっぱいに自然に伸びる fluid header
- 青帯の中身は中央の固定基準に置く
- 本文は固定比率 stage を全体 scale する
- LOCATION / DETAIL / DAYS / STATUS の外枠は原則固定
- 赤線・ガイド線・端末ステータス文字・MAPは描画しない
- 中身は今後、各エリア内だけ個別実装する

CSS参照は GitHub Pages 対応の相対パス `./css/...`。


## v25 targeted adjust
- v22をベースに維持
- 修正対象はハンバーガー、日付、時刻、DAYS、STATUSのみ
- ハンバーガー・日付・時刻は左へ移動
- DAYS・STATUSは下へ移動
- LOCATION/DETAIL/青帯/ステージ構造は触らない
