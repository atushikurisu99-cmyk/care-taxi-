# care-taxi-shell-v2

## 修正内容
- iPadで真っ白になる可能性を避けるため、CSS変数・`inset`・`max()`・複雑な`calc()`を使わない旧Safari寄せのShellに変更。
- 青帯は横100%。
- 白本体はPC/iPadとも画面下まで届く。
- 赤いガイド線・波線・補助線は描画しない。
- LOCATION / DETAIL / DAYS / STATUS はShell側で外接矩形だけ固定。

## この版でまだ入れないもの
- タイムライン線
- 業者名
- 案件ブロック
- DAYSカード
- STATUS一覧
- 内部スクロール

## 次の確認
PCとiPadで、まず白本体・青帯・4エリア名だけが表示されるか確認する。
