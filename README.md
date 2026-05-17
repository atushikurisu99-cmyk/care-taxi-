# care-taxi-shell-v17-fixed-canvas

## 目的
PDF/Illustratorで確認した「固定比率UIキャンバス」をHTML化した骨格版。

## 重要ルール
- LOCATION / DETAIL / DAYS / STATUS の外枠座標は固定。
- デバイス差では中の距離を変えない。
- 画面サイズに合わせて stage 全体だけを scale する。
- 白キャンバス外にグレー余白は作らない。
- 赤線、破線、ガイド線、iPadステータス文字は描画しない。
- MAPは入れない。
- ハンバーガー、日付、時刻、＋予約登録のみ表示。

## 調整する場所
外枠座標は `css/layout.css` の CSS変数。
ただし外枠確定後はここを原則動かさず、各エリア内だけを調整する。

## ファイル
- index.html
- css/reset.css
- css/layout.css
- css/header.css
- css/areas.css
- js/scale.js
