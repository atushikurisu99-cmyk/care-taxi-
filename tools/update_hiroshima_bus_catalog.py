#!/usr/bin/env python3
import csv
import io
import json
import urllib.request
import zipfile
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

OPERATORS = {
    8: "広島電鉄",
    9: "広島バス",
    10: "広島交通",
    11: "芸陽バス",
    15: "JRバス中国",
    13: "ボンバス",
    14: "フォーブル",
}

# 現在UIで選択対象にしている停留所。
# GTFSの実データから、この停留所を通る行き先候補を抽出する。
TARGET_STOPS = {
    "広島バスセンター","県庁前","紙屋町","八丁堀","本通り","合同庁舎","中電前","胡町","三川町",
    "横川駅前","西広島駅","己斐","広島駅","広島駅新幹線口",
}

OUT = Path("sales-nav-prototype/data/bus-destination-catalog.json")

def download_zip(operator_id: int) -> zipfile.ZipFile:
    url = f"https://ajt-mobusta-gtfs.mcapps.jp/static/{operator_id}/current_data.zip"
    req = urllib.request.Request(url, headers={"User-Agent":"taxi-sales-nav/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    return zipfile.ZipFile(io.BytesIO(data))

def read_csv(zf: zipfile.ZipFile, name: str):
    raw = zf.read(name).decode("utf-8-sig", errors="replace")
    return list(csv.DictReader(io.StringIO(raw)))

def parse_gtfs_time(v: str):
    try:
        h, m, sec = [int(x) for x in (v or "").split(":")]
        return h * 3600 + m * 60 + sec
    except Exception:
        return None

def active_services(calendar_rows, exception_rows, service_date):
    ymd = service_date.strftime("%Y%m%d")
    weekday = service_date.strftime("%A").lower()
    active = set()
    for r in calendar_rows:
        sid = r.get("service_id","")
        if not sid:
            continue
        if r.get("start_date","") <= ymd <= r.get("end_date","") and r.get(weekday,"0") == "1":
            active.add(sid)
    for r in exception_rows:
        if r.get("date","") != ymd:
            continue
        sid = r.get("service_id","")
        if r.get("exception_type") == "1":
            active.add(sid)
        elif r.get("exception_type") == "2":
            active.discard(sid)
    return active

def main():
    catalog = defaultdict(lambda: {"destinations": defaultdict(lambda: {
        "operators": set(), "route_ids": set(), "last_bus": None
    })})
    errors = []
    # GitHub Actions はUTC。広島の営業日判定はJSTで固定。
    jst = timezone(timedelta(hours=9))
    service_date = datetime.now(jst).date()

    for operator_id, operator_name in OPERATORS.items():
        try:
            zf = download_zip(operator_id)
            stops = read_csv(zf, "stops.txt")
            trips = read_csv(zf, "trips.txt")
            stop_times = read_csv(zf, "stop_times.txt")
            routes = read_csv(zf, "routes.txt")
            calendar_rows = read_csv(zf, "calendar.txt") if "calendar.txt" in zf.namelist() else []
            exception_rows = read_csv(zf, "calendar_dates.txt") if "calendar_dates.txt" in zf.namelist() else []
            active_service_ids = active_services(calendar_rows, exception_rows, service_date)

            stop_name_by_id = {r.get("stop_id",""): r.get("stop_name","").strip() for r in stops}
            route_name = {}
            for r in routes:
                rid = r.get("route_id","")
                label = (r.get("route_long_name") or r.get("route_short_name") or "").strip()
                route_name[rid] = label

            trip_meta = {}
            for r in trips:
                trip_id = r.get("trip_id","")
                rid = r.get("route_id","")
                trip_meta[trip_id] = {
                    "route_id": rid,
                    "service_id": r.get("service_id",""),
                }

            # 「行き先」はGTFSのtrip_headsignではなく、その便の実際の終点停留所を使う。
            # 事業者によってtrip_headsignに「○号線」「○○経由」等が入るため、
            # タクシードライバー向け設定では終点名の方が直感的で不整合が少ない。
            final_stop_by_trip = {}
            final_seq_by_trip = {}
            for row in stop_times:
                trip_id = row.get("trip_id","")
                try:
                    seq = int(row.get("stop_sequence") or 0)
                except ValueError:
                    seq = 0
                if trip_id not in final_seq_by_trip or seq >= final_seq_by_trip[trip_id]:
                    final_seq_by_trip[trip_id] = seq
                    final_stop_by_trip[trip_id] = stop_name_by_id.get(row.get("stop_id",""), "").strip()

            for row in stop_times:
                stop_name = stop_name_by_id.get(row.get("stop_id",""), "").strip()
                if stop_name not in TARGET_STOPS:
                    continue
                trip_id = row.get("trip_id","")
                destination = final_stop_by_trip.get(trip_id, "").strip()
                if not destination or destination == stop_name:
                    continue
                meta = trip_meta.get(trip_id, {})
                rid = meta.get("route_id","")
                item = catalog[stop_name]["destinations"][destination]
                item["operators"].add(operator_name)
                if rid:
                    item["route_ids"].add(rid)

                # 今日の運行サービスだけで、そのバス停を通る「終バス」を求める。
                if meta.get("service_id") in active_service_ids:
                    dep = (row.get("departure_time") or row.get("arrival_time") or "").strip()
                    sec = parse_gtfs_time(dep)
                    if sec is not None:
                        current = item.get("last_bus")
                        if current is None or sec > current["seconds"]:
                            item["last_bus"] = {
                                "operator_id": operator_id,
                                "operator": operator_name,
                                "trip_id": trip_id,
                                "route_id": rid,
                                "stop_id": row.get("stop_id",""),
                                "scheduled_time": dep,
                                "seconds": sec,
                            }
        except Exception as e:
            errors.append({"operator_id":operator_id,"operator":operator_name,"error":str(e)})

    out_stops = {}
    for stop_name in sorted(catalog):
        dests = []
        for name, meta in catalog[stop_name]["destinations"].items():
            row = {
                "name": name,
                "operators": sorted(meta["operators"]),
                "route_ids": sorted(meta["route_ids"]),
            }
            if meta.get("last_bus"):
                last = dict(meta["last_bus"])
                last.pop("seconds", None)
                last["service_date"] = service_date.isoformat()
                row["last_bus"] = last
            dests.append(row)
        dests.sort(key=lambda x: x["name"])
        out_stops[stop_name] = {"destinations": dests}

    payload = {
        "source": "広島県バス協会 GTFS-JP current data",
        "source_url": "https://www.bus-kyo.or.jp/gtfs-open-data",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "service_date": service_date.isoformat(),
        "operators": list(OPERATORS.values()),
        "stops": out_stops,
        "errors": errors,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT} stops={len(out_stops)} errors={len(errors)}")

if __name__ == "__main__":
    main()
