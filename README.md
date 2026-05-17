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

## v31 px area range
- v25/v27系の完成骨格を維持
- 外側基準を px で固定
  - 左端：ハンバーガー左端 x=34px
  - 右端：予約登録ボタン右端 x=696px
  - 下端：現状DAYSカード下部 y=535px
- LOCATION / DETAIL / DAYS / STATUS のエリア範囲を明文化
- DAYSカードはDAYSエリア内で7枚を広く使用
- STATUSはSTATUSエリア内に2列固定で収納
- 外枠座標は今後原則触らず、中身だけ調整する
