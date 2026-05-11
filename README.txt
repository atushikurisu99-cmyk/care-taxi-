LOCATION受け皿固定パッチ v17.2

目的:
- LOCATIONだけを安全にJS描画へ固定する
- 他エリアのcss/jsは触らない

アップロードするファイル:
1. index.html
2. css/location.css
3. js/location.js

注意:
- index.htmlはLOCATION用css/jsに ?v=17_2 を付け、GitHub Pagesの古いキャッシュを避けています。
- layout.css / detail.css / days.css / status.css は変更しません。

LOCATION仕様:
- 5業者分だけ表示
- 6件目以降はLOCATION内で縦スクロール
- 実時間軸は6:30〜20:00
- 数字表示は7:00〜19:00
- 7:00左側に30分ぶんの目盛りあり
- 左上「担当者」固定
- 業者名列は縦スクロールのみ連動
- 時間ヘッダーは横スクロールのみ連動
- グリッド本体だけ縦横可動
- 縦横同時スクロールを抑制
- 縦は業者行単位、横は30分単位へ軽く吸着
