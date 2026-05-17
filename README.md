# care-taxi-shell-v22

目的：PDFトレース前提の固定比率UI骨格。

- 青帯は画面横いっぱいに自然に伸びる fluid header
- 青帯の中身は中央の固定基準に置く
- 本文は固定比率 stage を全体 scale する
- LOCATION / DETAIL / DAYS / STATUS の外枠は原則固定
- 赤線・ガイド線・端末ステータス文字・MAPは描画しない
- 中身は今後、各エリア内だけ個別実装する

CSS参照は GitHub Pages 対応の相対パス `./css/...`。


## v25 targeted adjust
- v22をベースに維持
- 修正対象はハンバーガー、日付、時刻、DAYS、STATUSのみ
- ハンバーガー・日付・時刻は左へ移動
- DAYS・STATUSは下へ移動
- LOCATION/DETAIL/青帯/ステージ構造は触らない


## v26 final targeted
- v25をベースに維持
- 修正対象はハンバーガー、日付、時刻、予約ボタン、DETAIL/STATUSラベルのみ
- ハンバーガー・日付・時刻は左へ移動
- 予約ボタンは右へ移動
- DETAIL/STATUSラベルは右エリア内の中央寄せ
- LOCATION/DAYS/エリア外枠/scale構造は触らない

## v27 pc date gap fix
- v26をベースに維持
- iPadの配置は触らない方針
- PC表示時のみ、日付と時刻の隙間を確保するため `.header-time` の left を調整
- 対象は `css/header.css` のメディアクエリのみ

## v29 changes
- v27完成骨格をベースに、外枠座標は変更しない。
- DAYSエリア内に7枚カードをスクロールなしで収める。
- STATUSは完全2列固定で、STATUSエリアから左へはみ出さない。
- DAYSカード内のテキスト積層エリアとSTATUS一覧の表示高を同期。
- iPadの画面全体上下スクロール防止を強化。LOCATION/STATUS以外のtouchmoveを抑制。
