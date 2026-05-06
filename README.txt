介護タクシー管理UI iPad固定トレース v2

v1の白画面対策:
- 100dvhを不使用
- CSS変数scaleを不使用
- #fit を top/left 起点で scale
- JS失敗時も1366x1024のキャンバスが左上に表示される構造
- iPad Safariで罫線が消えにくいよう2px実線divで描画
