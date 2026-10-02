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
    "広島バスセンター","県庁前","紙屋町","八丁堀","本通り","合同庁舎前","中電前","新天地",
    "横川駅前","西広島駅","己斐","広島駅","広島駅新幹線口",
}

OUT = Path("sales-nav-prototype/data/bus-destination-catalog.json")
DIRECTION_AUDIT_OUT = Path("sales-nav-prototype/data/bus-direction-audit.json")

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

def direction_group(stop_name: str, next_stop: str):
    # 八丁堀は「次の1停留所」では細かすぎるため、実際の幹線方向までまとめる。
    # 立町→紙屋町のように同じ流れは1方面として扱う。
    if stop_name == "八丁堀":
        if next_stop in {"立町", "紙屋町", "県庁前", "広島バスセンター"}:
            return "紙屋町・西／北西方面"
        if next_stop in {"広島駅", "銀山町"}:
            return "広島駅・東方面"
        if next_stop in {"本通り"}:
            return "本通・南西方面"
        if next_stop in {"新天地"}:
            return "富士見町・南方面"
        if next_stop in {"京口門", "女学院前"}:
            return "牛田・北東方面"
    return f"{next_stop}方面" if next_stop else ""

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
        "operators": set(), "route_ids": set(), "last_bus": None, "last_buses_by_date": {}
    })})
    directions = defaultdict(lambda: defaultdict(lambda: {
        "operators": set(), "route_ids": set(), "destinations": set(), "next_stops": set(),
        "last_bus": None, "last_buses_by_date": {}
    }))
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
            service_dates = [service_date + timedelta(days=i) for i in range(8)]
            active_service_ids_by_date = {
                d.isoformat(): active_services(calendar_rows, exception_rows, d)
                for d in service_dates
            }
            active_service_ids = active_service_ids_by_date[service_date.isoformat()]

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
                    "trip_headsign": (r.get("trip_headsign") or "").strip(),
                }

            # 各便の本当の終点を確定する。
            # 途中停留所は候補に出さず、最大stop_sequenceの停留所だけを終点として扱う。
            final_stop_by_trip = {}
            final_time_by_trip = {}
            final_seq_by_trip = {}
            for row in stop_times:
                trip_id = row.get("trip_id","")
                try:
                    seq = int(row.get("stop_sequence") or 0)
                except ValueError:
                    seq = 0
                if trip_id not in final_seq_by_trip or seq > final_seq_by_trip[trip_id]:
                    final_seq_by_trip[trip_id] = seq
                    final_stop_by_trip[trip_id] = stop_name_by_id.get(row.get("stop_id",""), "").strip()
                    final_time_by_trip[trip_id] = (row.get("arrival_time") or row.get("departure_time") or "").strip()

            # 各便の「次の停留所」を確定。これをユーザー向けの方面グループに使う。
            trip_rows = defaultdict(list)
            for st in stop_times:
                trip_id = st.get("trip_id","")
                try:
                    seq = int(st.get("stop_sequence") or 0)
                except ValueError:
                    seq = 0
                trip_rows[trip_id].append((seq, st))
            next_stop_by_trip_seq = {}
            for trip_id, rows in trip_rows.items():
                rows.sort(key=lambda x: x[0])
                for i, (seq, st) in enumerate(rows[:-1]):
                    current_name = stop_name_by_id.get(st.get("stop_id",""), "").strip()
                    next_name = ""
                    # 同じ名称の複数stop_id（乗り場違い等）は方向分岐として扱わない。
                    for _, nxt in rows[i + 1:]:
                        candidate = stop_name_by_id.get(nxt.get("stop_id",""), "").strip()
                        if candidate and candidate != current_name:
                            next_name = candidate
                            break
                    if next_name:
                        next_stop_by_trip_seq[(trip_id, seq)] = next_name

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

                # 選択した停留所より後ろに終点が実在する便だけ採用する。
                # これで途中停留所を「行き先候補」として並べない。
                try:
                    current_seq = int(row.get("stop_sequence") or 0)
                except ValueError:
                    current_seq = 0
                final_seq = final_seq_by_trip.get(trip_id, 0)
                if final_seq <= current_seq:
                    continue

                item = catalog[stop_name]["destinations"][destination]
                item["operators"].add(operator_name)
                if rid:
                    item["route_ids"].add(rid)

                next_stop = next_stop_by_trip_seq.get((trip_id, current_seq), "").strip()
                direction_item = None
                direction_name = direction_group(stop_name, next_stop)
                if direction_name:
                    direction_item = directions[stop_name][direction_name]
                    direction_item["operators"].add(operator_name)
                    direction_item["destinations"].add(destination)
                    direction_item["next_stops"].add(next_stop)
                    if rid:
                        direction_item["route_ids"].add(rid)

                dep = (row.get("departure_time") or row.get("arrival_time") or "").strip()
                sec = parse_gtfs_time(dep)
                if sec is not None:
                    # 今日の終バス
                    if meta.get("service_id") in active_service_ids:
                        current = item.get("last_bus")
                        if current is None or sec > current["seconds"]:
                            item["last_bus"] = {
                                "operator_id": operator_id,
                                "operator": operator_name,
                                "trip_id": trip_id,
                                "route_id": rid,
                                "stop_id": row.get("stop_id",""),
                                "scheduled_time": dep,
                                "terminal_arrival_time": final_time_by_trip.get(trip_id, ""),
                                "seconds": sec,
                            }

                    # 曜日差・直近のダイヤ改正を見落とさないため、今後8日分も保存。
                    for date_key, active_ids in active_service_ids_by_date.items():
                        if meta.get("service_id") not in active_ids:
                            continue
                        current = item["last_buses_by_date"].get(date_key)
                        if current is None or sec > current["seconds"]:
                            item["last_buses_by_date"][date_key] = {
                                "operator_id": operator_id,
                                "operator": operator_name,
                                "trip_id": trip_id,
                                "route_id": rid,
                                "stop_id": row.get("stop_id",""),
                                "scheduled_time": dep,
                                "terminal_arrival_time": final_time_by_trip.get(trip_id, ""),
                                "seconds": sec,
                            }

                    # 方面（次停留所）単位でも同じ終バス判定を保持。
                    if direction_item is not None:
                        if meta.get("service_id") in active_service_ids:
                            current = direction_item.get("last_bus")
                            if current is None or sec > current["seconds"]:
                                direction_item["last_bus"] = {
                                    "operator_id": operator_id,
                                    "operator": operator_name,
                                    "trip_id": trip_id,
                                    "route_id": rid,
                                    "stop_id": row.get("stop_id",""),
                                    "scheduled_time": dep,
                                    "terminal_arrival_time": final_time_by_trip.get(trip_id, ""),
                                    "terminal": destination,
                                    "seconds": sec,
                                }
                        for date_key, active_ids in active_service_ids_by_date.items():
                            if meta.get("service_id") not in active_ids:
                                continue
                            current = direction_item["last_buses_by_date"].get(date_key)
                            if current is None or sec > current["seconds"]:
                                direction_item["last_buses_by_date"][date_key] = {
                                    "operator_id": operator_id,
                                    "operator": operator_name,
                                    "trip_id": trip_id,
                                    "route_id": rid,
                                    "stop_id": row.get("stop_id",""),
                                    "scheduled_time": dep,
                                    "terminal_arrival_time": final_time_by_trip.get(trip_id, ""),
                                    "terminal": destination,
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
            if meta.get("last_buses_by_date"):
                day_map = {}
                for date_key, fact in sorted(meta["last_buses_by_date"].items()):
                    v = dict(fact)
                    v.pop("seconds", None)
                    v["service_date"] = date_key
                    day_map[date_key] = v
                row["last_buses_by_date"] = day_map
            dests.append(row)
        # 設定候補は今日運行する便だけに限定しない。
        # 平日限定・土休日限定の終点も常に残し、後から見つからない状態を防ぐ。
        active = [x for x in dests if x.get("last_bus")]
        inactive = [x for x in dests if not x.get("last_bus")]
        active.sort(
            key=lambda x: (parse_gtfs_time(x["last_bus"]["scheduled_time"]) or -1, x["name"]),
            reverse=True
        )
        inactive.sort(key=lambda x: x["name"])
        out_stops[stop_name] = {"destinations": active + inactive}

    # 方面（次停留所）をコンパクトに出力。終点一覧は内部データとして残す。
    for stop_name in sorted(directions):
        direction_rows = []
        for direction_name, meta in directions[stop_name].items():
            next_stops = sorted(meta["next_stops"])
            row = {
                "name": direction_name,
                "next_stop": next_stops[0] if len(next_stops) == 1 else "",
                "next_stops": next_stops,
                "operators": sorted(meta["operators"]),
                "route_ids": sorted(meta["route_ids"]),
                "destinations": sorted(meta["destinations"]),
            }
            if meta.get("last_bus"):
                last = dict(meta["last_bus"])
                last.pop("seconds", None)
                last["service_date"] = service_date.isoformat()
                row["last_bus"] = last
            if meta.get("last_buses_by_date"):
                day_map = {}
                for date_key, fact in sorted(meta["last_buses_by_date"].items()):
                    v = dict(fact)
                    v.pop("seconds", None)
                    v["service_date"] = date_key
                    day_map[date_key] = v
                row["last_buses_by_date"] = day_map
            direction_rows.append(row)
        direction_rows.sort(
            key=lambda x: (
                parse_gtfs_time((x.get("last_bus") or {}).get("scheduled_time","")) or -1,
                x["name"]
            ),
            reverse=True
        )
        out_stops.setdefault(stop_name, {"destinations": []})["directions"] = direction_rows

    missing_target_stops = sorted(TARGET_STOPS - set(out_stops.keys()))
    payload = {
        "source": "広島県バス協会 GTFS-JP current data",
        "source_url": "https://www.bus-kyo.or.jp/gtfs-open-data",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "service_date": service_date.isoformat(),
        "operators": list(OPERATORS.values()),
        "missing_target_stops": missing_target_stops,
        "schedule_horizon_days": 8,
        "stops": out_stops,
        "errors": errors,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    audit = {
        "generated_at": payload["generated_at"],
        "service_date": payload["service_date"],
        "stops": {
            stop: [
                {
                    "name": d["name"],
                    "next_stop": d.get("next_stop",""),
                    "next_stops": d.get("next_stops",[]),
                    "destinations_count": len(d["destinations"]),
                    "destinations": d["destinations"][:8],
                    "last_bus": (d.get("last_bus") or {}).get("scheduled_time"),
                    "last_terminal": (d.get("last_bus") or {}).get("terminal"),
                }
                for d in meta.get("directions", [])
            ]
            for stop, meta in out_stops.items()
        }
    }
    DIRECTION_AUDIT_OUT.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT} stops={len(out_stops)} errors={len(errors)}")

if __name__ == "__main__":
    main()
