#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""広島県バス協会の公式GTFS/GTFS-RTオープンデータから、
広島市周辺で使う運行サマリーJSONを生成する。
"""
from __future__ import annotations

import csv
import io
import json
import time
import urllib.request
import zipfile
from pathlib import Path

from google.transit import gtfs_realtime_pb2

OUT = Path("sales-nav-prototype/data/bus-realtime.json")
UA = {"User-Agent": "taxi-sales-nav/0.1 (+GitHub Actions)"}

OPERATORS = [
    {"id": 8, "name": "広島電鉄"},
    {"id": 9, "name": "広島バス"},
    {"id": 10, "name": "広島交通"},
    {"id": 11, "name": "芸陽バス"},
    {"id": 15, "name": "JRバス中国"},
    {"id": 13, "name": "ボンバス"},
]

BASE = "https://ajt-mobusta-gtfs.mcapps.jp"


def fetch(url: str, timeout: int = 30) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def read_routes(op_id: int) -> dict[str, str]:
    url = f"{BASE}/static/{op_id}/current_data.zip"
    raw = fetch(url, 60)
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        with z.open("routes.txt") as f:
            text = io.TextIOWrapper(f, encoding="utf-8-sig", errors="replace", newline="")
            rows = csv.DictReader(text)
            out = {}
            for r in rows:
                rid = (r.get("route_id") or "").strip()
                name = (r.get("route_long_name") or r.get("route_short_name") or "").strip()
                if rid:
                    out[rid] = name or rid
            return out


def read_stops(op_id: int) -> dict[str, dict]:
    url = f"{BASE}/static/{op_id}/current_data.zip"
    raw = fetch(url, 60)
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        with z.open("stops.txt") as f:
            text = io.TextIOWrapper(f, encoding="utf-8-sig", errors="replace", newline="")
            rows = csv.DictReader(text)
            out = {}
            for r in rows:
                sid = (r.get("stop_id") or "").strip()
                if not sid:
                    continue
                try:
                    lat = float(r.get("stop_lat") or 0)
                    lon = float(r.get("stop_lon") or 0)
                except Exception:
                    lat, lon = 0.0, 0.0
                out[sid] = {
                    "name": (r.get("stop_name") or sid).strip(),
                    "lat": lat,
                    "lon": lon,
                }
            return out


def decode_feed(url: str) -> gtfs_realtime_pb2.FeedMessage:
    msg = gtfs_realtime_pb2.FeedMessage()
    msg.ParseFromString(fetch(url, 30))
    return msg


def localized_text(obj) -> str:
    if not obj or not getattr(obj, "translation", None):
        return ""
    for tr in obj.translation:
        if tr.language in ("ja", "ja-JP", "") and tr.text:
            return tr.text
    return obj.translation[0].text if obj.translation else ""


def summarize_operator(op: dict) -> dict:
    op_id = op["id"]
    routes = {}
    stops = {}
    try:
        routes = read_routes(op_id)
    except Exception:
        routes = {}
    try:
        stops = read_stops(op_id)
    except Exception:
        stops = {}

    alert_items = []
    try:
        feed = decode_feed(f"{BASE}/realtime/{op_id}/alerts.bin")
        now = int(time.time())
        seen_alerts = set()
        for ent in feed.entity:
            if not ent.HasField("alert"):
                continue
            a = ent.alert

            # 有効期間が指定されている場合、現在有効なものだけ採用。
            if a.active_period:
                active_now = False
                for p in a.active_period:
                    start = int(p.start) if p.HasField("start") else 0
                    end = int(p.end) if p.HasField("end") else 0
                    if (not start or now >= start) and (not end or now <= end):
                        active_now = True
                        break
                if not active_now:
                    continue

            title = localized_text(a.header_text)
            desc = localized_text(a.description_text)
            route_names = []
            for ie in a.informed_entity:
                if ie.route_id:
                    route_names.append(routes.get(ie.route_id, ie.route_id))
            route_names = sorted(set(route_names))
            key = (title, desc, tuple(route_names))
            if key in seen_alerts:
                continue
            seen_alerts.add(key)
            alert_items.append({
                "title": title or "運行情報あり",
                "description": desc,
                "routes": route_names,
            })
    except Exception:
        pass

    delayed_trips = 0
    max_delay_sec = 0
    delay_routes = {}
    stop_updates = []
    try:
        feed = decode_feed(f"{BASE}/realtime/{op_id}/trip_updates.bin")
        now = int(time.time())
        for ent in feed.entity:
            if not ent.HasField("trip_update"):
                continue
            tu = ent.trip_update
            trip_delays = []
            if tu.HasField("delay"):
                trip_delays.append(int(tu.delay))
            for stu in tu.stop_time_update:
                if stu.arrival.HasField("delay"):
                    trip_delays.append(int(stu.arrival.delay))
                if stu.departure.HasField("delay"):
                    trip_delays.append(int(stu.departure.delay))
            # 早着(負値)は遅延扱いしない。
            # ただし古い/遠い便を数えると「遅延便数」が異常に膨らむため、
            # 現在から15分前〜2時間先に停車予定がある便だけを対象にする。
            relevant_times = []
            for stu in tu.stop_time_update:
                if stu.departure.HasField("time"):
                    relevant_times.append(int(stu.departure.time))
                elif stu.arrival.HasField("time"):
                    relevant_times.append(int(stu.arrival.time))
            active_trip = any(now - 900 <= t <= now + 7200 for t in relevant_times)

            d = max([x for x in trip_delays if x > 0], default=0)
            if active_trip and d >= 180:
                delayed_trips += 1
                max_delay_sec = max(max_delay_sec, d)
                rid = tu.trip.route_id if tu.trip.route_id else ""
                if rid:
                    rn = routes.get(rid, rid)
                    delay_routes[rn] = max(delay_routes.get(rn, 0), d)

            rid = tu.trip.route_id if tu.trip.route_id else ""
            route_name = routes.get(rid, rid)
            direction_id = int(tu.trip.direction_id) if tu.trip.HasField("direction_id") else None
            for stu in tu.stop_time_update:
                sid = stu.stop_id if stu.stop_id else ""
                if not sid:
                    continue
                event_time = 0
                delay_sec = 0
                if stu.departure.HasField("time"):
                    event_time = int(stu.departure.time)
                elif stu.arrival.HasField("time"):
                    event_time = int(stu.arrival.time)
                if stu.departure.HasField("delay"):
                    delay_sec = int(stu.departure.delay)
                elif stu.arrival.HasField("delay"):
                    delay_sec = int(stu.arrival.delay)
                if not event_time or event_time < now - 900 or event_time > now + 7200:
                    continue
                meta = stops.get(sid, {})
                stop_updates.append({
                    "stop_id": sid,
                    "stop_name": meta.get("name", sid),
                    "lat": meta.get("lat", 0),
                    "lon": meta.get("lon", 0),
                    "route": route_name,
                    "direction_id": direction_id,
                    "event_time": event_time,
                    "delay_sec": delay_sec,
                })
    except Exception:
        pass

    vehicle_count = 0
    vehicle_positions = []
    try:
        feed = decode_feed(f"{BASE}/realtime/{op_id}/vehicle_position.bin")
        for ent in feed.entity:
            if not ent.HasField("vehicle"):
                continue
            v = ent.vehicle
            vehicle_count += 1
            sid = v.stop_id if v.stop_id else ""
            meta = stops.get(sid, {})
            rid = v.trip.route_id if v.trip.route_id else ""
            lat = float(v.position.latitude) if v.HasField("position") else 0.0
            lon = float(v.position.longitude) if v.HasField("position") else 0.0
            vehicle_positions.append({
                "route": routes.get(rid, rid),
                "lat": lat,
                "lon": lon,
                "stop_id": sid,
                "stop_name": meta.get("name", sid),
                "timestamp": int(v.timestamp) if v.timestamp else 0,
                "current_status": int(v.current_status) if v.HasField("current_status") else None,
            })
    except Exception:
        pass

    route_delays = [
        {"route": k, "delay_sec": v}
        for k, v in sorted(delay_routes.items(), key=lambda x: x[1], reverse=True)[:8]
    ]
    return {
        "id": op_id,
        "name": op["name"],
        "alerts": alert_items[:10],
        "alert_count": len(alert_items),
        "delayed_trips": delayed_trips,
        "max_delay_sec": max_delay_sec,
        "route_delays": route_delays,
        "vehicle_count": vehicle_count,
        "stop_updates": sorted(stop_updates, key=lambda x: x["event_time"])[:300],
        "vehicle_positions": vehicle_positions[:300],
    }


def main() -> None:
    operators = [summarize_operator(op) for op in OPERATORS]
    total_alerts = sum(x["alert_count"] for x in operators)
    total_delayed = sum(x["delayed_trips"] for x in operators)
    max_delay = max([x["max_delay_sec"] for x in operators] or [0])
    payload = {
        "source": "広島県バス協会 GTFSオープンデータ",
        "source_url": "https://www.bus-kyo.or.jp/gtfs-open-data",
        "generated_at": int(time.time()),
        "summary": {
            "operators": len(operators),
            "alerts": total_alerts,
            "delayed_trips": total_delayed,
            "max_delay_sec": max_delay,
        },
        "operators": operators,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps(payload["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()
