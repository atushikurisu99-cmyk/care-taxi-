care-taxi-shell-v11-area-space-lock

目的：
添付PDFの「必要部分」だけをトレースした、エリア固定専用版。
この版では、LOCATION / DETAIL / DAYS / STATUS の空間だけを固定する。
各エリアの中身はまだ作り込まない。

重要方針：
・赤破線、オレンジ破線、ガイド線は画面に表示しない
・各エリアの最大範囲はCSS上で透明な空間として固定
・白キャンバスは 1024 × 768 を基準に中央配置
・iPad Safariで真っ白になりにくいよう、import/exportやビルド前提を使わない
・画面全体スクロールは禁止
・後から各エリア内に部品を追加する前提

ファイル：
index.html
css/base.css
js/app.js

次工程：
1. LOCATION内に担当者列・時間軸・30分線を配置
2. DETAIL内に選択表示用のテキストを配置
3. DAYS内に7日カードを配置
4. STATUS内に状態一覧を配置
