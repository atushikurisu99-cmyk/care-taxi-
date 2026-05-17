# care-taxi-shell-v16-fixed-ratio

## 目的
PDF/Illustratorで確認した「固定比率UIキャンバス」を再現するための骨格版です。

## 重要ルール
- 赤線、破線、枠線は表示しません。
- 端末ステータス文字は表示しません。
- MAPボタンは入れていません。
- 青帯は端末幅いっぱいではなく、固定キャンバス内の情報帯です。
- デバイス差は全体スケールだけで吸収します。
- LOCATION / DETAIL / DAYS / STATUS の距離や余白は勝手に広げません。
- 外枠座標を確定した後は、中身だけ個別ファイルで調整します。

## 構成
- css/layout.css: 固定キャンバスと全体スケール
- css/header.css: 青帯
- css/location.css: LOCATION外枠
- css/detail.css: DETAIL外枠
- css/days.css: DAYS外枠
- css/status.css: STATUS外枠
- js/*.js: 各エリア描画

## 調整の考え方
外側のエリア座標は、PDFトレースで確定するまでは調整対象です。
確定後は原則触らず、各エリア内部のみを個別修正します。
