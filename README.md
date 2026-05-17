# care-taxi-shell-v21-fluid-header

## 今回の目的
青帯を固定キャンバスに閉じ込めず、画面横幅いっぱいに自然に伸びる流体レイヤーとして分離。

## 重要仕様
- 画面上部に隙間を作らない
- 青帯は `#header-bg` で画面幅いっぱい
- 中の文字・ボタンは `#stage` 内で固定比率配置
- LOCATION / DETAIL / DAYS / STATUS は固定比率ステージ内に配置
- 赤線・破線・枠線は描画しない
- MAPボタンなし
- iPadステータス文字なし

## 調整箇所
- 青帯高さ: `css/layout.css` と `css/header.css` の 80px
- ヘッダー内要素: `css/header.css`
- エリアラベルと透明スロット: `css/areas.css`
- 全体スケール: `js/app.js`
