CARE TAXI TRACE V16 MODULAR

方針:
- 青帯、縮尺、見切れ防止、ピンチ拡大防止は共通管理。
- 4エリアの座標は css/layout.css に固定。
- グレー破線などの設計ガイドは実画面には描写しない。
- LOCATION / DETAIL / DAYS / STATUS はそれぞれ独立ファイルで管理。
- 今後は1エリアだけ修正しても他エリアを壊さない構成。

構成:
index.html
css/base.css      共通初期化・青帯
css/layout.css    4エリア骨格・座標
css/location.css  LOCATION内部
css/detail.css    DETAIL内部
css/days.css      DAYS内部
css/status.css    STATUS内部
js/data.js        表示データ
js/scale.js       縮尺・見切れ・iPad拡大防止
js/location.js    LOCATION描画
js/detail.js      DETAIL描画
js/days.js        DAYS描画
js/status.js      STATUS描画
js/app.js         起動処理
