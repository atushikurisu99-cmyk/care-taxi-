# care-taxi-shell-v18-fixed-stage

## 目的
PDF/レイヤー説明を基準に、固定比率キャンバスを先に作る版。

## 重要
- 赤線・破線・黒線は描画しない
- iPadステータス文字も描画しない
- MAPは入れない
- デバイス差はキャンバス全体のscaleのみで吸収
- 中の座標・余白・距離は変えない

## 基準
- stage: 1024 x 768 固定
- header: left 33 / top 14 / width 936 / height 83
- LOCATION: left 125 / top 170 / width 604 / height 330
- DETAIL: left 732 / top 170 / width 164 / height 330
- DAYS: left 125 / top 535 / width 604 / height 154
- STATUS: left 732 / top 535 / width 164 / height 154

## 個別修正
外枠座標は layout/areas 側で固定。
次段階から中身のみ、location/detail/days/status 内部で個別調整する。
