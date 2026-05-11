CARE TAXI TRACE V13 FIXED

目的:
- V13の見た目・思想を維持したまま、PC/iPadでの左寄りを防ぐ土台修正版。
- 画面スクロール禁止。
- 青帯は横幅100%、高さ固定。
- 青帯下のUIは stage として一塊で中央配置。
- LOCATION / DAYS は同じ左基準。
- DETAIL / STATUS は右側固定。

まず確認するファイル:
index.html
css/app.css
js/app.js


追加修正:
- 青帯下の外側背景を白に統一。
- iPad表示時にstage外のグレーが見えないよう修正。
