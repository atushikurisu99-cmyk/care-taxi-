# care-taxi-shell-v1

## 目的
完成画面を直接描かず、先に「固定エリアShell」だけを確定する版。

## この版で描画するもの
- 青帯
- 白本体
- LOCATION / DETAIL / DAYS / STATUS の外接矩形
- 画面下まで白本体が届くための下余白

## この版で描画しないもの
- 赤い波線・赤い破線・ガイド線
- タイムライン罫線
- 業者名
- 予定案件ブロック
- DAYSカード
- STATUS一覧

## 設計ルール
- 画面全体スクロール禁止
- body / app / white-stage は固定
- 青帯はブラウザ横幅100%
- 白本体は画面下まで届く
- 各エリアの中身は、後続の location.js / detail.js / days.js / status.js が自分の枠内だけに描く
- 各エリア側は自分の位置や大枠サイズを決めない

## 次の作業
1. PC / iPad でShellの大枠・下余白を確認
2. Shellが合った後、LOCATIONから中身を差し込む
