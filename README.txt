介護タクシー管理UI iPad固定トレース v2

v1の白画面対策:
- 100dvhを不使用
- CSS変数scaleを不使用
- #fit を top/left 起点で scale
- JS失敗時も1366x1024のキャンバスが左上に表示される構造
- iPad Safariで罫線が消えにくいよう2px実線divで描画


v3微調整:
- 青帯を少し浅く
- LOCATION/DETAILを少し上へ
- タイムラインの開始位置を少し上へ
- DETAIL文字を少しだけ小さく
- DAYS/STATUSを少し上へ
- DAYSカード高さを少し抑制


v4微調整:
- PC表示時の外側背景・キャンバス背景を白寄せ
- STATUSの横線を見出し下ではなく上側ラインへ移動
