#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""JARTIC公式オープンデータから広島市周辺の速度規制だけを抽出する。

- 公式 catalog: https://www.jartic.or.jp/d/opendata/opendata.json
- 対象: typeD / R34 (広島県)
- 出力: sales-nav-prototype/data/jartic-hiroshima-speed.json
- 外部の有料APIは使用しない。
"""
from __future__ import annotations

import csv
import io
import json
import urllib.request
import zipfile
from pathlib import Path

CATALOG_URL = "https://www.jartic.or.jp/d/opendata/opendata.json"
BASE_URL = "https://www.jartic.or.jp/d/opendata"
OUT = Path("sales-nav-prototype/data/jartic-hiroshima-speed.json")
PREF_ID = "R34"
# 広島市・府中町・海田町周辺。実車検証用の初期範囲。
BBOX = [132.20, 34.20, 132.80, 34.60]  # west,south,east,north
MAX_SPEED_CODES = {"112", "113", "114"}
UA = {"User-Agent": "taxi-sales-nav/0.1 (+GitHub Actions)"}


def fetch(url: str, timeout: int = 120) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def parse_coords(raw: str) -> list[list[float]]:
    out = []
    for part in (raw or "").split(";"):
        f = part.strip().split()
        if len(f) != 2:
            continue
        try:
            lon, lat = float(f[0]), float(f[1])
        except ValueError:
            continue
        if 122 <= lon <= 154 and 20 <= lat <= 46:
            out.append([round(lon, 6), round(lat, 6)])
    return out


def hits_bbox(coords: list[list[float]]) -> bool:
    w, s, e, n = BBOX
    return any(w <= lon <= e and s <= lat <= n for lon, lat in coords)


def main() -> None:
    catalog = json.loads(fetch(CATALOG_URL, 60).decode("utf-8"))
    entry = next(x for x in catalog if x.get("type") == "typeD")
    target = next(x for x in entry.get("targetList", []) if x.get("id") == PREF_ID)
    zip_url = BASE_URL + target["link"]
    raw_zip = fetch(zip_url, 300)

    features = []
    counts = {"rows": 0, "speed_rows": 0, "kept": 0, "zone30": 0}
    with zipfile.ZipFile(io.BytesIO(raw_zip)) as z:
        csv_infos = [i for i in z.infolist() if not i.is_dir() and i.filename.lower().endswith(".csv")]
        if not csv_infos:
            raise RuntimeError("CSVがZIP内に見つかりません")
        for info in csv_infos:
            with z.open(info) as f:
                text = io.TextIOWrapper(f, encoding="cp932", errors="replace", newline="")
                reader = csv.reader(text)
                head = next(reader)
                ci = {name: idx for idx, name in enumerate(head)}
                required = ["共通規制種別コード", "規制場所の経度緯度", "速度"]
                missing = [x for x in required if x not in ci]
                if missing:
                    raise RuntimeError("必須列なし: " + ",".join(missing))

                def val(row, name):
                    i = ci.get(name)
                    return row[i].strip() if i is not None and i < len(row) else ""

                for row in reader:
                    counts["rows"] += 1
                    code = val(row, "共通規制種別コード")
                    if code not in MAX_SPEED_CODES:
                        continue
                    counts["speed_rows"] += 1
                    coords = parse_coords(val(row, "規制場所の経度緯度"))
                    if not coords or not hits_bbox(coords):
                        continue
                    speed_raw = val(row, "速度")
                    try:
                        speed = int(speed_raw) if speed_raw else None
                    except ValueError:
                        speed = None
                    zone30 = val(row, "ゾーン30・ゾーン30プラス指定コード")
                    if zone30:
                        counts["zone30"] += 1
                    features.append({
                        "code": code,
                        "speed": speed,
                        "zone30": zone30 or None,
                        "kind": val(row, "県別規制種別名称") or None,
                        "route": val(row, "路線名(代表)") or None,
                        "updated": val(row, "データ更新日") or None,
                        "coords": coords,
                    })
                    counts["kept"] += 1

    payload = {
        "source": "公益財団法人 日本道路交通情報センター（JARTIC）交通規制情報",
        "source_url": "https://www.jartic.or.jp/service/opendata/",
        "processed": True,
        "processing_note": "広島市周辺の最高速度規制（112/113/114）のみ抽出",
        "target_month": entry.get("targetMonth"),
        "release_day": entry.get("releaseDay"),
        "prefecture_id": PREF_ID,
        "bbox": BBOX,
        "counts": counts,
        "features": features,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps({"target_month": payload["target_month"], "counts": counts}, ensure_ascii=False))


if __name__ == "__main__":
    main()
