# care-taxi-shell-v9-area-lock

## 目的
添付PDF「レイヤー説明.pdf」を基準に、まず以下4エリアだけを固定する。

- LOCATION
- DETAIL
- DAYS
- STATUS

この版では、各エリアの中身は作り込まない。
タイムライン、カード、状態一覧、案件情報、スクロール処理はまだ入れない。

## トレース基準
PDFの赤破線をレイヤー境界として扱う。
赤破線そのものを本番UIとして使うのではなく、まず境界確認のために表示している。

基準サイズは 1024px × 768px。
端末差は canvas 全体の等倍スケールで吸収する。

## 固定した座標

- 青帯: left 32 / top 14 / width 936 / height 84
- LOCATION: left 125 / top 183 / width 604 / height 318
- DETAIL: left 729 / top 183 / width 166 / height 318
- DAYS: left 125 / top 538 / width 604 / height 152
- STATUS: left 729 / top 538 / width 166 / height 152

## 表示ルール

通常表示では赤破線を表示する。
これはエリア固定確認用。

赤破線を消したい場合は、URL末尾に以下を付ける。

```text
?clean=1
```

例:

```text
index.html?clean=1
```

## 守ること

- iPadのOS時刻・日付・Wi-Fi・バッテリーはコードで描かない。
- 画面全体はスクロールさせない。
- まず4エリアの位置固定だけを確認する。
- 次の段階で LOCATION の中身を入れる。
- DETAIL / DAYS / STATUS は、エリア固定確認が終わってから順番に中身を入れる。

## 次の作業順

1. このv9で4エリアの位置を確認
2. LOCATION内に担当者列・時間軸・30分線を入れる
3. LOCATION内の横スクロール層を分ける
4. DETAILは選択表示専用として入れる
5. DAYSは7日カードを入れる
6. STATUSはLOCATIONと同じ並びで状態だけを入れる
