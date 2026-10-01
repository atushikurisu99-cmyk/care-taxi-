#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""JR西日本 列車走行位置の技術検証用プローブ。

目的:
- 広島・山口エリアで、どの路線・列車項目・遅延時分が取得できるか確認する。
- 本番アプリには接続しない。
- 取得結果はGitHub Actions artifactとして一時保存し、リポジトリにはコミットしない。

注意:
- 公式公開画面の内部JSONを技術検証目的で参照する。
- 商用利用・継続取得・再配布の可否は別途確認が必要。
"""
from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path

BASE = "https://www.train-guide.westjr.co.jp/api/v3"
AREA = "hiroshima"
OUT = Path("tmp/jrwest-higashima-probe.json")
UA = {
    "User-Agent": "Mozilla/5.0 (compatible; taxi-sales-nav-probe/0.1; technical-evaluation)"
}


def fetch_json(url: str, timeout: int = 20):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def safe_get(d, key, default=None):
    return d.get(key, default) if isinstance(d, dict) else default


def normalize_lines(master) -> list[dict]:
    """area masterの形式差を吸収して路線一覧へ整形する。"""
    lines = safe_get(master, "lines", {})
    out = []
    if isinstance(lines, dict):
        for code, info in lines.items():
            if isinstance(info, dict):
                out.append({
                    "code": code,
                    "name": info.get("name") or info.get("lineName") or code,
                    "range": info.get("range") or "",
                    "raw": {k: v for k, v in info.items() if k in ("st", "relatelines", "name", "range")},
                })
            else:
                out.append({"code": code, "name": str(info), "range": "", "raw": {}})
    elif isinstance(lines, list):
        for info in lines:
            if not isinstance(info, dict):
                continue
            code = info.get("code") or info.get("id") or info.get("line") or ""
            if code:
                out.append({
                    "code": code,
                    "name": info.get("name") or code,
                    "range": info.get("range") or "",
                    "raw": info,
                })
    return out


def train_items(payload) -> list[dict]:
    trains = safe_get(payload, "trains", [])
    if isinstance(trains, dict):
        seq = list(trains.values())
    else:
        seq = trains if isinstance(trains, list) else []
    out = []
    for tr in seq:
        if not isinstance(tr, dict):
            continue
        dest = tr.get("dest")
        if isinstance(dest, dict):
            dest_text = dest.get("text") or dest.get("name") or ""
        else:
            dest_text = dest or ""
        out.append({
            "no": tr.get("no"),
            "pos": tr.get("pos"),
            "direction": tr.get("direction"),
            "displayType": tr.get("displayType") or tr.get("typeName"),
            "dest": dest_text,
            "delayMinutes": tr.get("delayMinutes"),
            "numberOfCars": tr.get("numberOfCars"),
            "raw_keys": sorted(tr.keys()),
        })
    return out


def station_names(payload) -> dict[str, str]:
    seq = safe_get(payload, "stations", [])
    if not isinstance(seq, list):
        return {}
    out = {}
    for item in seq:
        if not isinstance(item, dict):
            continue
        info = item.get("info") if isinstance(item.get("info"), dict) else item
        code = info.get("code") or item.get("code")
        name = info.get("name") or item.get("name")
        if code and name:
            out[str(code)] = str(name)
    return out


def position_to_text(pos, stations: dict[str, str]) -> str:
    if not pos:
        return ""
    p = str(pos)
    parts = p.split("_")
    names = [stations.get(x, x) for x in parts if x]
    return "〜".join(names)


def delay_weight(minutes: int) -> int:
    if minutes >= 15:
        return 4
    if minutes >= 10:
        return 3
    if minutes >= 5:
        return 2
    if minutes > 0:
        return 1
    return 0


def build_station_impacts(lines: list[dict]) -> list[dict]:
    """遅延列車の現在位置から、駅・駅間ごとの影響候補を集計する。

    これは「タクシー需要」の断定ではなく、運転手へ見せる注目候補。
    同じ駅/駅間付近に複数の遅延列車が重なるほどスコアを上げる。
    """
    impacts: dict[str, dict] = {}
    for line in lines:
        line_name = str(line.get("name") or line.get("code") or "")
        for tr in line.get("trains") or []:
            try:
                delay = int(tr.get("delayMinutes") or 0)
            except Exception:
                delay = 0
            weight = delay_weight(delay)
            if weight <= 0:
                continue

            pos_text = str(tr.get("positionText") or "").strip()
            if not pos_text:
                continue

            # 駅間なら両端を候補にする。位置コードのままなら除外。
            station_names = [x.strip() for x in pos_text.split("〜") if x.strip()]
            for station in station_names:
                if station.replace("-", "").replace("_", "").isalnum() and not any("\u3040" <= ch <= "\u9fff" for ch in station):
                    continue
                rec = impacts.setdefault(station, {
                    "station": station,
                    "score": 0,
                    "delayed_trains": 0,
                    "max_delay": 0,
                    "lines": set(),
                })
                rec["score"] += weight
                rec["delayed_trains"] += 1
                rec["max_delay"] = max(rec["max_delay"], delay)
                rec["lines"].add(line_name)

    # 山陽本線・呉線が同時に海田市周辺へ掛かる場合は、接続点として情報価値が高い。
    for rec in impacts.values():
        if rec["station"] == "海田市":
            names = " ".join(rec["lines"])
            if ("山陽" in names) and ("呉" in names):
                rec["score"] += 2
                rec["junction"] = True

    result = []
    for rec in impacts.values():
        rec["lines"] = sorted(rec["lines"])
        score = int(rec["score"])
        rec["level"] = "strong" if score >= 8 or rec["max_delay"] >= 15 else ("watch" if score >= 4 or rec["max_delay"] >= 10 else "weak")
        result.append(rec)
    result.sort(key=lambda x: (x["score"], x["max_delay"], x["delayed_trains"]), reverse=True)
    return result[:10]


def main():
    started = int(time.time())
    master_url = f"{BASE}/area_{AREA}_master.json"
    traffic_url = f"{BASE}/area_{AREA}_trafficinfo.json"

    master = fetch_json(master_url)
    traffic = fetch_json(traffic_url)
    lines = normalize_lines(master)

    report = {
        "purpose": "technical_probe_only",
        "area": AREA,
        "generated_at": started,
        "source_host": "www.train-guide.westjr.co.jp",
        "master_url": master_url,
        "traffic_url": traffic_url,
        "master_update": master.get("update") if isinstance(master, dict) else None,
        "traffic_keys": sorted(traffic.keys()) if isinstance(traffic, dict) else [],
        "lines": [],
        "summary": {},
    }

    total_trains = 0
    delayed_trains = 0
    delay_buckets = {"1_4": 0, "5_9": 0, "10_14": 0, "15_plus": 0}

    for line in lines:
        code = line["code"]
        try:
            stations_payload = fetch_json(f"{BASE}/{code}_st.json")
            stations = station_names(stations_payload)
        except Exception as e:
            stations = {}
            stations_payload = {"error": str(e)}

        try:
            pos_payload = fetch_json(f"{BASE}/{code}.json")
            trains = train_items(pos_payload)
        except Exception as e:
            pos_payload = {"error": str(e)}
            trains = []

        for tr in trains:
            tr["positionText"] = position_to_text(tr.get("pos"), stations)
            try:
                d = int(tr.get("delayMinutes") or 0)
            except Exception:
                d = 0
            if d > 0:
                delayed_trains += 1
                if d < 5:
                    delay_buckets["1_4"] += 1
                elif d < 10:
                    delay_buckets["5_9"] += 1
                elif d < 15:
                    delay_buckets["10_14"] += 1
                else:
                    delay_buckets["15_plus"] += 1

        total_trains += len(trains)
        report["lines"].append({
            **line,
            "update": pos_payload.get("update") if isinstance(pos_payload, dict) else None,
            "station_count": len(stations),
            "train_count": len(trains),
            "trains": trains,
        })

    impacts = build_station_impacts(report["lines"])
    report["station_impacts"] = impacts
    report["summary"] = {
        "line_count": len(report["lines"]),
        "total_trains": total_trains,
        "delayed_trains": delayed_trains,
        "delay_buckets": delay_buckets,
        "top_station": impacts[0]["station"] if impacts else None,
        "top_station_level": impacts[0]["level"] if impacts else None,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(report["summary"], ensure_ascii=False))
    print("output:", OUT)


if __name__ == "__main__":
    main()
