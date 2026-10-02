import GtfsRealtimeBindings from "gtfs-realtime-bindings";

const BASE = "https://www.train-guide.westjr.co.jp/api/v3";
const LINES = [
  ["geibi1","芸備線"],
  ["kabe","可部線"],
  ["kure","呉線"],
  ["sanyo2","山陽線"],
  ["sanyo3","山陽線"],
  ["yamaguchi","山口線"],
];
const APP_ORIGIN = "https://atushikurisu99-cmyk.github.io";
const BUS_BASE = "https://ajt-mobusta-gtfs.mcapps.jp";
const BUS_OPERATORS = [
  [8,"広島電鉄"],
  [9,"広島バス"],
  [10,"広島交通"],
  [11,"芸陽バス"],
  [15,"JRバス中国"],
  [13,"ボンバス"],
];

function corsHeaders(origin="") {
  const allow = origin === APP_ORIGIN ? origin : APP_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}
function json(data,status=200,origin="") {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type":"application/json; charset=utf-8",
      "cache-control":"no-store",
      ...corsHeaders(origin),
    },
  });
}
async function fetchJsonCached(url, ttl, ctx) {
  const cache = caches.default;
  const key = new Request(url, {method:"GET"});
  const hit = await cache.match(key);
  if (hit) return hit.json();

  const r = await fetch(url, {
    headers: {
      "accept":"application/json",
      "user-agent":"taxi-sales-nav-validation/0.1",
    },
  });
  if (!r.ok) throw new Error(`upstream ${r.status}: ${url}`);
  const body = await r.text();
  const stored = new Response(body, {
    headers: {
      "content-type":"application/json; charset=utf-8",
      "cache-control":`public, max-age=${ttl}`,
    },
  });
  ctx.waitUntil(cache.put(key, stored.clone()));
  return JSON.parse(body);
}
function stationMap(payload) {
  const out = {};
  const rows = Array.isArray(payload?.stations) ? payload.stations : [];
  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const info = item.info && typeof item.info === "object" ? item.info : item;
    const code = info.code ?? item.code;
    const name = info.name ?? item.name;
    if (code && name) out[String(code)] = String(name);
  }
  return out;
}
function trains(payload, stations) {
  const src = payload?.trains;
  const rows = Array.isArray(src) ? src : (src && typeof src === "object" ? Object.values(src) : []);
  return rows.filter(x=>x && typeof x==="object").map(tr=>{
    const pos = String(tr.pos ?? "");
    const parts = pos.split("_").filter(Boolean);
    const positionText = parts.map(x=>stations[x] ?? x).join("〜");
    const dest = tr.dest && typeof tr.dest==="object" ? (tr.dest.text ?? tr.dest.name ?? "") : (tr.dest ?? "");
    return {
      no: tr.no ?? null,
      pos: tr.pos ?? null,
      positionText,
      direction: tr.direction ?? null,
      dest,
      delayMinutes: Number(tr.delayMinutes ?? 0) || 0,
      numberOfCars: tr.numberOfCars ?? null,
    };
  });
}
function summarize(lines) {
  let total = 0, delayed = 0;
  const buckets = {"1_4":0,"5_9":0,"10_14":0,"15_plus":0};
  for (const line of lines) {
    total += line.trains.length;
    for (const tr of line.trains) {
      const d = Number(tr.delayMinutes||0);
      if (d <= 0) continue;
      delayed++;
      if (d < 5) buckets["1_4"]++;
      else if (d < 10) buckets["5_9"]++;
      else if (d < 15) buckets["10_14"]++;
      else buckets["15_plus"]++;
    }
  }
  return {line_count:lines.length,total_trains:total,delayed_trains:delayed,delay_buckets:buckets};
}

async function fetchTextCached(url, ttl, ctx) {
  const cache = caches.default;
  const key = new Request(url, {method:"GET"});
  const hit = await cache.match(key);
  if (hit) return hit.text();
  const r = await fetch(url, {
    headers: {
      "accept":"text/html,application/xhtml+xml",
      "user-agent":"taxi-sales-nav-validation/0.1",
    },
  });
  if (!r.ok) throw new Error(`upstream ${r.status}: ${url}`);
  const body = await r.text();
  const stored = new Response(body, {
    headers: {
      "content-type":"text/html; charset=utf-8",
      "cache-control":`public, max-age=${ttl}`,
    },
  });
  ctx.waitUntil(cache.put(key, stored.clone()));
  return body;
}
function stripHtml(s="") {
  return String(s)
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;|&#160;/g," ")
    .replace(/&amp;/g,"&")
    .replace(/&quot;/g,'"')
    .replace(/&#39;|&apos;/g,"'")
    .replace(/\s+/g," ")
    .trim();
}
function tokyoParts() {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone:"Asia/Tokyo",
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", hour12:false
  }).formatToParts(new Date());
  const o = {};
  for (const p of parts) if (p.type!=="literal") o[p.type]=p.value;
  return {
    year:Number(o.year), month:Number(o.month), day:Number(o.day),
    hour:Number(o.hour), minute:Number(o.minute),
    ymd:`${o.year}-${o.month}-${o.day}`,
    mmdd:`${o.month}${o.day}`
  };
}
async function buildHiroshimaSports(ctx) {
  const t = tokyoParts();
  const scheduleUrl = `https://npb.jp/games/${t.year}/schedule_${String(t.month).padStart(2,"0")}_detail.html`;
  const html = await fetchTextCached(scheduleUrl, 45, ctx);
  const dayNeedle = `${t.month}/${t.day}`;
  const datePos = stripHtml(html).indexOf(dayNeedle);
  const hrefs = [...html.matchAll(/href=["']([^"']*\/scores\/[0-9]{4}\/[0-9]{4}\/[^"']+)["']/gi)]
    .map(m=>m[1].replace(/&amp;/g,"&"));
  const uniq = [...new Set(hrefs)].filter(x=>x.includes(`/${t.mmdd}/`));

  let carp = {
    kind:"baseball",
    team:"広島東洋カープ",
    venue:null,
    status:"none",
    start_time:null,
    end_time:null,
    score:null,
    source:"NPB",
    source_url:scheduleUrl
  };

  // First detect whether today's schedule text contains Hiroshima.
  const scheduleText = stripHtml(html);
  const todaySlice = datePos>=0 ? scheduleText.slice(datePos, datePos+1800) : scheduleText;
  if (/広島/.test(todaySlice)) {
    carp.status="scheduled";
    const startMatch = todaySlice.match(/(?:マツダスタジアム|マツダ)[^0-9]{0,40}([0-2][0-9]:[0-5][0-9])/);
    if (startMatch) carp.start_time=startMatch[1];
    if (/マツダ/.test(todaySlice)) carp.venue="マツダスタジアム";
  }

  // Follow today's score pages and keep the one containing Hiroshima.
  for (const href of uniq.slice(0,12)) {
    const abs = href.startsWith("http") ? href : `https://npb.jp${href.startsWith("/")?"":"/"}${href}`;
    try {
      const page = await fetchTextCached(abs, 20, ctx);
      const text = stripHtml(page);
      if (!/広島東洋カープ|広島/.test(text)) continue;
      carp.source_url=abs;
      if (/マツダスタジアム|マツダ/.test(text)) carp.venue="マツダスタジアム";
      const st = text.match(/開始\s*([0-2][0-9]:[0-5][0-9])/);
      const en = text.match(/終了\s*([0-2][0-9]:[0-5][0-9])/);
      if (st) carp.start_time=st[1];
      if (en) {
        carp.end_time=en[1];
        carp.status="ended";
      } else if (/試合速報|回[表裏]|攻撃/.test(text)) {
        carp.status="live";
      }
      const score = text.match(/広島[^0-9]{0,40}([0-9]+)\s*[-－]\s*([0-9]+)[^\n]{0,40}/);
      if (score) carp.score=`${score[1]}-${score[2]}`;
      break;
    } catch {}
  }

  return {
    ok:true,
    area:"hiroshima",
    generated_at:Math.floor(Date.now()/1000),
    sports:[carp],
  };
}
async function buildHiroshimaEvents(ctx) {
  const t = tokyoParts();
  const ym = `${t.year}${String(t.month).padStart(2,"0")}`;
  const url = `https://www.club-quattro.com/hiroshima/schedule/?ym=${ym}`;
  const html = await fetchTextCached(url, 300, ctx);
  const text = stripHtml(html);
  const day = String(t.day).padStart(2,"0");
  const dayRe = new RegExp(`(?:^|\\s)${day}\\s+(?:MON|TUE|WED|THU|FRI|SAT|SUN)\\.\\s+([\\s\\S]{0,500}?)(?=\\s+[0-3][0-9]\\s+(?:MON|TUE|WED|THU|FRI|SAT|SUN)\\.|$)`,"i");
  const m = text.match(dayRe);
  const events = [];
  if (m) {
    const seg = m[1].replace(/SOLD OUT|NEW|QUATTRO WEB 先行/gi," ").replace(/\s+/g," ").trim();
    const time = seg.match(/開場\/開演\s*([0-2][0-9]:[0-5][0-9])\s*\/\s*([0-2][0-9]:[0-5][0-9])/);
    let name = seg.split(/開場\/開演|料金|お問い合わせ先/)[0].trim();
    // Repeated artist name is common on the source page; collapse exact duplicated halves.
    const words = name.split(" ");
    if (words.length>=2) {
      const half=Math.floor(words.length/2);
      if (words.length%2===0 && words.slice(0,half).join(" ")===words.slice(half).join(" ")) {
        name=words.slice(0,half).join(" ");
      }
    }
    if (name) events.push({
      kind:"live",
      name,
      venue:"広島クラブクアトロ",
      open_time:time?time[1]:null,
      start_time:time?time[2]:null,
      end_time:null,
      source:"HIROSHIMA CLUB QUATTRO",
      source_url:url,
    });
  }
  return {
    ok:true,
    area:"hiroshima",
    generated_at:Math.floor(Date.now()/1000),
    coverage:"partial",
    events,
  };
}


async function fetchProtoCached(url, ttl, ctx) {
  const cache = caches.default;
  const key = new Request(url, {method:"GET"});
  const hit = await cache.match(key);
  if (hit) return new Uint8Array(await hit.arrayBuffer());
  const r = await fetch(url, {
    headers: {
      "accept":"application/x-protobuf,application/octet-stream,*/*",
      "user-agent":"taxi-sales-nav-validation/0.1",
    },
  });
  if (!r.ok) throw new Error(`upstream ${r.status}: ${url}`);
  const bytes = new Uint8Array(await r.arrayBuffer());
  const stored = new Response(bytes, {
    headers: {
      "content-type":"application/x-protobuf",
      "cache-control":`public, max-age=${ttl}`,
    },
  });
  ctx.waitUntil(cache.put(key, stored.clone()));
  return bytes;
}
function pbNum(v) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "object" && typeof v.toNumber === "function") return v.toNumber();
  return Number(v) || 0;
}
function localizedPbText(obj) {
  const xs = Array.isArray(obj?.translation) ? obj.translation : [];
  const ja = xs.find(x=>["ja","ja-JP",""].includes(String(x?.language||"")) && x?.text);
  return String((ja||xs.find(x=>x?.text))?.text||"");
}
function activeAlertNow(alert, now) {
  const periods = Array.isArray(alert?.activePeriod) ? alert.activePeriod : [];
  if (!periods.length) return true;
  return periods.some(p=>{
    const start=pbNum(p?.start), end=pbNum(p?.end);
    return (!start||now>=start)&&(!end||now<=end);
  });
}
async function summarizeBusOperator(id, name, ctx) {
  const now=Math.floor(Date.now()/1000);
  const [tripBytes, alertBytes, vehicleBytes] = await Promise.all([
    fetchProtoCached(`${BUS_BASE}/realtime/${id}/trip_updates.bin`,20,ctx),
    fetchProtoCached(`${BUS_BASE}/realtime/${id}/alerts.bin`,30,ctx),
    fetchProtoCached(`${BUS_BASE}/realtime/${id}/vehicle_position.bin`,20,ctx),
  ]);
  const trips=GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(tripBytes);
  const alertsFeed=GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(alertBytes);
  const vehicles=GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(vehicleBytes);

  let delayedTrips=0, maxDelaySec=0;
  const liveTripUpdates=[];
  for(const ent of (trips.entity||[])){
    const tu=ent.tripUpdate;
    if(!tu) continue;
    const delays=[];
    if(tu.delay!=null) delays.push(pbNum(tu.delay));
    const times=[];
    const stopUpdates=[];
    for(const stu of (tu.stopTimeUpdate||[])){
      if(stu.arrival?.delay!=null) delays.push(pbNum(stu.arrival.delay));
      if(stu.departure?.delay!=null) delays.push(pbNum(stu.departure.delay));
      const arrivalTime=pbNum(stu.arrival?.time)||0;
      const departureTime=pbNum(stu.departure?.time)||0;
      const et=departureTime||arrivalTime;
      if(et) times.push(et);
      stopUpdates.push({
        stop_id:String(stu.stopId||""),
        stop_sequence:pbNum(stu.stopSequence)||null,
        arrival_time:arrivalTime||null,
        departure_time:departureTime||null,
        arrival_delay:stu.arrival?.delay!=null?pbNum(stu.arrival.delay):null,
        departure_delay:stu.departure?.delay!=null?pbNum(stu.departure.delay):null,
      });
    }
    const active=times.some(t=>t>=now-7200&&t<=now+21600);
    const d=Math.max(0,...delays.filter(x=>x>0));
    if(active&&d>=180){
      delayedTrips++;
      maxDelaySec=Math.max(maxDelaySec,d);
    }
    if(active){
      liveTripUpdates.push({
        trip_id:String(tu.trip?.tripId||""),
        route_id:String(tu.trip?.routeId||""),
        start_date:String(tu.trip?.startDate||""),
        delay_sec:d,
        stop_updates:stopUpdates,
      });
    }
  }

  const alerts=[];
  const seen=new Set();
  for(const ent of (alertsFeed.entity||[])){
    const a=ent.alert;
    if(!a||!activeAlertNow(a,now)) continue;
    const title=localizedPbText(a.headerText)||"運行情報あり";
    const description=localizedPbText(a.descriptionText);
    const routes=[...new Set((a.informedEntity||[]).map(x=>String(x?.routeId||"")).filter(Boolean))];
    const key=[title,description,routes.join(",")].join("|");
    if(seen.has(key)) continue;
    seen.add(key);
    alerts.push({title,description,routes});
  }

  const vehicleCount=(vehicles.entity||[]).filter(x=>x.vehicle).length;
  return {
    id,name,
    alerts:alerts.slice(0,10),
    alert_count:alerts.length,
    delayed_trips:delayedTrips,
    max_delay_sec:maxDelaySec,
    route_delays:[],
    vehicle_count:vehicleCount,
    trip_updates:liveTripUpdates.slice(0,300),
    stop_updates:[],
    vehicle_positions:[],
  };
}
async function buildHiroshimaBus(ctx) {
  const operators=await Promise.all(BUS_OPERATORS.map(([id,name])=>summarizeBusOperator(id,name,ctx)));
  return {
    ok:true,
    source:"広島県バス協会 GTFS-RT",
    source_url:"https://www.bus-kyo.or.jp/gtfs-open-data",
    generated_at:Math.floor(Date.now()/1000),
    cache_seconds:20,
    summary:{
      operators:operators.length,
      alerts:operators.reduce((n,x)=>n+Number(x.alert_count||0),0),
      delayed_trips:operators.reduce((n,x)=>n+Number(x.delayed_trips||0),0),
      max_delay_sec:Math.max(0,...operators.map(x=>Number(x.max_delay_sec||0))),
    },
    operators,
  };
}

async function buildHiroshima(ctx) {
  const lines = await Promise.all(LINES.map(async ([code,name])=>{
    const [stationsPayload, positionPayload] = await Promise.all([
      fetchJsonCached(`${BASE}/${code}_st.json`, 86400, ctx),
      fetchJsonCached(`${BASE}/${code}.json`, 20, ctx),
    ]);
    const stations = stationMap(stationsPayload);
    const t = trains(positionPayload, stations);
    return {
      code,
      name,
      update: positionPayload?.update ?? null,
      station_count: Object.keys(stations).length,
      train_count: t.length,
      trains: t,
    };
  }));
  return {
    ok:true,
    area:"hiroshima",
    generated_at:Math.floor(Date.now()/1000),
    source_host:"www.train-guide.westjr.co.jp",
    cache_seconds:20,
    summary:summarize(lines),
    lines,
  };
}
export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null,{status:204,headers:corsHeaders(origin)});
    if (request.method !== "GET") return json({ok:false,error:"method_not_allowed"},405,origin);

    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json({ok:true,service:"taxi-higashima-proxy",time:new Date().toISOString()},200,origin);
    }

    try {
      if (url.pathname === "/api/jr/hiroshima") return json(await buildHiroshima(ctx),200,origin);
      if (url.pathname === "/api/sports/hiroshima") return json(await buildHiroshimaSports(ctx),200,origin);
      if (url.pathname === "/api/events/hiroshima") return json(await buildHiroshimaEvents(ctx),200,origin);
      if (url.pathname === "/api/bus/hiroshima") return json(await buildHiroshimaBus(ctx),200,origin);
      return json({ok:false,error:"not_found"},404,origin);
    } catch (e) {
      return json({ok:false,error:"upstream_fetch_failed",detail:String(e?.message||e)},502,origin);
    }
  }
};
