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
    const knownParts = parts.map(x=>stations[x] ?? "").filter(x=>x && !String(x).includes("#"));
    const positionText = knownParts.length ? knownParts.join("〜") : "";
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

const JR_TRAFFIC_INFO_URL=`${BASE}/area_hiroshima_trafficinfo.json`;
const JR_CAUSE_PATTERNS=[
  ["動物","動物支障"],
  ["鹿","動物支障"],
  ["猪","動物支障"],
  ["イノシシ","動物支障"],
  ["人身事故","人身事故"],
  ["踏切","踏切支障"],
  ["車両","車両確認"],
  ["信号","信号トラブル"],
  ["架線","架線トラブル"],
  ["倒木","倒木"],
  ["落石","落石"],
  ["大雨","大雨"],
  ["雨量","大雨"],
  ["強風","強風"],
  ["雷","雷"],
  ["雪","降雪"],
  ["濃霧","濃霧"],
  ["線路","線路確認"],
  ["設備","設備確認"],
  ["お客様","お客様対応"]
];
function compactJrCause(text=""){
  const s=String(text||"").replace(/\s+/g," ").trim();
  for(const [needle,label] of JR_CAUSE_PATTERNS){
    if(s.includes(needle)) return label;
  }
  const m=s.match(/(?:ため|為)[、。]?/);
  if(m){
    const head=s.slice(0,m.index).replace(/^.*?[：:]/,"").trim();
    if(head&&head.length<=18) return head;
  }
  return "";
}
function collectTrafficStrings(value,out=[]){
  if(value==null) return out;
  if(typeof value==="string"){
    const s=value.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
    if(s) out.push(s);
    return out;
  }
  if(Array.isArray(value)){
    for(const x of value) collectTrafficStrings(x,out);
    return out;
  }
  if(typeof value==="object"){
    for(const x of Object.values(value)) collectTrafficStrings(x,out);
  }
  return out;
}
function trafficAlertsFromPayload(payload){
  const strings=[...new Set(collectTrafficStrings(payload,[]))];
  const lineNames=["呉線","山陽線","芸備線","可部線","山口線"];
  const alerts=[];
  for(const text of strings){
    const cause=compactJrCause(text);
    if(!cause) continue;
    const lines=lineNames.filter(x=>text.includes(x));
    if(!lines.length) continue;
    for(const line of lines){
      const key=line+"|"+cause;
      if(alerts.some(x=>x.key===key)) continue;
      alerts.push({key,line,cause,text:text.slice(0,220)});
    }
  }
  return alerts.slice(0,12);
}
async function loadHiroshimaTrafficAlerts(ctx){
  try{
    const payload=await fetchJsonCached(JR_TRAFFIC_INFO_URL,20,ctx);
    return trafficAlertsFromPayload(payload);
  }catch{
    return [];
  }
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

  // Today's score-page links are date-scoped by /MMDD/.
  // Do not scan a broad chunk of the monthly schedule: it can include the next day's
  // Hiroshima game and create a false positive on a no-game day.
  // A Carp game is considered scheduled only when one of today's own score pages
  // actually contains Hiroshima.
  for (const href of uniq.slice(0,12)) {
    const abs = href.startsWith("http") ? href : `https://npb.jp${href.startsWith("/")?"":"/"}${href}`;
    try {
      const page = await fetchTextCached(abs, 20, ctx);
      const text = stripHtml(page);
      if (!/広島東洋カープ|広島/.test(text)) continue;
      carp.source_url=abs;
      carp.status="scheduled";
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

  // Taxi demand in Hiroshima is venue-based, not team-based.
  // Away games (Jingu, Koshien, etc.) are irrelevant to local taxi demand,
  // so only a Mazda Stadium game is exposed as today's sports event.
  const isMazda=/マツダスタジアム|MAZDA Zoom-Zoom スタジアム/i.test(String(carp.venue||""));
  if(carp.status!=="none" && !isMazda){
    carp={...carp,status:"none",start_time:null,end_time:null,score:null,venue:null,local_relevant:false};
  }else{
    carp.local_relevant=isMazda && carp.status!=="none";
  }

  return {
    ok:true,
    area:"hiroshima",
    generated_at:Math.floor(Date.now()/1000),
    sports:[carp],
  };
}
const LIVE_END_CHANNELS = [
  ["promoter_official","主催者・プロモーター公式",100],
  ["artist_official","アーティスト公式",98],
  ["venue_official","会場公式",96],
  ["ticket_eplus","イープラス",78],
  ["ticket_lawson","ローチケ",78],
  ["ticket_pia","チケットぴあ",78],
  ["same_tour_recent","同ツアー直近公演",74],
  ["artist_history","同一アーティスト過去公演",62],
  ["setlist_duration","セットリスト・曲数",56],
  ["realtime_reports","当日リアルタイム情報",88],
];
function hhmmToMinutes(v){
  const m=String(v||"").match(/^([0-2]?[0-9]):([0-5][0-9])$/);
  if(!m) return null;
  return Number(m[1])*60+Number(m[2]);
}
function minutesToHHMM(v){
  if(!Number.isFinite(v)) return null;
  let n=Math.round(v);
  while(n<0) n+=1440;
  n%=1440;
  return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
}
function median(xs){
  const a=xs.filter(Number.isFinite).sort((x,y)=>x-y);
  if(!a.length) return null;
  const i=Math.floor(a.length/2);
  return a.length%2?a[i]:(a[i-1]+a[i])/2;
}
function fallbackLiveEndGuide(start_time, venue="", title="", artist=""){
  const start=hhmmToMinutes(start_time);
  if(start==null) return {time:null,range_start:null,range_end:null,basis:null};
  const text=[venue,title,artist].filter(Boolean).join(" ");
  let minutes=120, margin=35, basis="ライブ公演の一般参考幅";
  if(/弾き語り|アコースティック|acoustic/i.test(text)){
    minutes=100; margin=25; basis="弾き語り・アコースティック公演の参考幅";
  }else if(/FAN.?CLUB|ファンミ|生誕祭|トーク|ソロイベント/i.test(text)){
    minutes=90; margin=30; basis="ファンイベント・短時間公演の参考幅";
  }else if(/FES|FEST|フェス|SUPER ROCK CITY|対バン|w\/|with |GUEST|ゲスト/i.test(text)){
    minutes=180; margin=60; basis="複数出演・イベント公演の参考幅";
  }else if(/グリーンアリーナ|アリーナ|ドーム|スタジアム/i.test(text)){
    minutes=150; margin=45; basis="アリーナ公演の参考幅";
  }else if(/HBG|ホール|アステール|文化会館|県民文化センター/i.test(text)){
    minutes=130; margin=30; basis="ホール公演の参考幅";
  }else if(/QUATTRO|クアトロ|VANQUISH|BLUE LIVE|SECOND|セカンド|Cave-Be|4\.14|SIX ONE|Yise|Live House|ライブ/i.test(text)){
    minutes=115; margin=30; basis="ライブハウス公演の参考幅";
  }
  return {
    time:minutesToHHMM(start+minutes),
    range_start:minutesToHHMM(start+minutes-margin),
    range_end:minutesToHHMM(start+minutes+margin),
    basis
  };
}
function estimateLiveEndTime({start_time,evidence=[],venue="",title="",artist=""}={}){
  const start=hhmmToMinutes(start_time);
  const channels=LIVE_END_CHANNELS.map(([id,label,weight])=>({
    id,label,weight,
    status:"unavailable",
    candidate_time:null,
    note:null
  }));
  const byId=new Map(channels.map(x=>[x.id,x]));
  const usable=[];

  for(const ev of evidence){
    const ch=byId.get(ev?.channel);
    if(!ch) continue;
    if(ev?.checked && !ev?.end_time && !Number.isFinite(Number(ev?.duration_minutes))){
      ch.status="checked_no_end_time";
      ch.note=String(ev?.note||"");
      continue;
    }
    let candidate=hhmmToMinutes(ev?.end_time);
    if(candidate==null && start!=null && Number.isFinite(Number(ev?.duration_minutes))){
      candidate=start+Number(ev.duration_minutes);
    }
    if(candidate==null) continue;
    let endMin=candidate;
    if(start!=null && endMin<start) endMin+=1440;
    ch.status="available";
    ch.candidate_time=minutesToHHMM(endMin);
    ch.note=String(ev?.note||"");
    usable.push({
      channel:ch.id,
      label:ch.label,
      weight:Number(ev?.weight||ch.weight)||ch.weight,
      endMin,
      direct:!!ev?.direct,
      source_group:String(ev?.source_group||ch.id),
      sample_count:Math.max(1,Number(ev?.sample_count||1)||1)
    });
  }

  if(!usable.length){
    const ref=fallbackLiveEndGuide(start_time,venue,title,artist);
    return {
      end_time_estimate:null,
      end_time_reference:ref.time,
      end_time_range_start:ref.range_start,
      end_time_range_end:ref.range_end,
      reference_basis:ref.basis,
      confidence:ref.time?"reference":"none",
      evidence_count:0,
      direct_count:0,
      spread_minutes:null,
      channels
    };
  }

  // 公式の直接終演時刻が取れた場合は、それを最優先。
  const directs=usable.filter(x=>x.direct);
  let pool=directs.length?directs:usable;
  let center=median(pool.map(x=>x.endMin));

  // HTML誤読や別公演時刻を混ぜないため、中央値から45分超の候補を除外。
  const filtered=pool.filter(x=>Math.abs(x.endMin-center)<=45);
  if(filtered.length) pool=filtered;
  center=median(pool.map(x=>x.endMin));

  // 重み付き平均。表示は5分単位に丸める。
  const wsum=pool.reduce((n,x)=>n+x.weight,0);
  const weighted=pool.reduce((n,x)=>n+x.endMin*x.weight,0)/(wsum||1);
  const rounded=Math.round(weighted/5)*5;
  const spread=pool.length>1
    ? Math.max(...pool.map(x=>x.endMin))-Math.min(...pool.map(x=>x.endMin))
    : 0;

  let confidence="low";
  if(directs.length>=2 && spread<=20) confidence="high";
  else if(directs.length>=1) confidence="medium";
  else if(pool.some(x=>x.channel==="same_tour_recent"&&x.sample_count>=2)&&spread<=30) confidence="medium";
  else if(pool.some(x=>x.channel==="artist_history"&&x.sample_count>=3)&&spread<=35) confidence="medium";
  else if(new Set(pool.map(x=>x.source_group)).size>=2&&spread<=30) confidence="medium";

  // 「経路数」ではなく独立した根拠で判定する。
  // 同一サイトから作った同ツアー中央値と過去平均を、別ソース2件とは数えない。
  const independentGroups=new Set(pool.map(x=>x.source_group).filter(Boolean));
  const historicalStrong=pool.some(x=>
    x.channel==="same_tour_recent" && x.sample_count>=2
  ) || pool.some(x=>
    x.channel==="artist_history" && x.sample_count>=2 && spread<=45
  );
  const publishable=directs.length>=1 || independentGroups.size>=2 || historicalStrong;

  let ref={time:null,range_start:null,range_end:null,basis:null};
  if(!publishable){
    if(pool.length===1){
      const actual=pool[0].endMin;
      ref={
        time:minutesToHHMM(actual),
        range_start:minutesToHHMM(actual-30),
        range_end:minutesToHHMM(actual+30),
        basis:pool[0].label+"の単独実績"
      };
    }else{
      ref=fallbackLiveEndGuide(start_time,venue,title,artist);
    }
  }
  return {
    end_time_estimate:publishable?minutesToHHMM(rounded):null,
    end_time_reference:publishable?null:ref.time,
    end_time_range_start:publishable?null:ref.range_start,
    end_time_range_end:publishable?null:ref.range_end,
    reference_basis:publishable?null:ref.basis,
    confidence:publishable?confidence:(ref.time?"reference":"none"),
    evidence_count:pool.length,
    direct_count:directs.length,
    spread_minutes:pool.length?spread:null,
    channels
  };
}

const LIVE_END_VALIDATION_CASES = [
  {artist:"おいしくるメロンパン",title:"avenue tour - sleepwalk -",start_time:"17:00",venue:"広島クラブクアトロ"},
  {artist:"milet",title:"LIVE",start_time:"17:00",venue:"広島文化学園HBGホール"},
  {artist:"3markets[ ]",title:"LIVE",start_time:"18:00",venue:"広島 SIX ONE Live STAR"},
  {artist:"Suspended 4th",title:"LIVE",start_time:"19:00",venue:"広島セカンド・クラッチ"},
  {artist:"堂島孝平",title:"LIVE",start_time:"14:30",venue:"Live House YAOYOROZ"},
  {artist:"yosugala",title:"LIVE",start_time:"15:00",venue:"広島 LIVE VANQUISH"},
  {artist:"eastern youth",title:"LIVE",start_time:"17:00",venue:"広島セカンド・クラッチ"},
  {artist:"絢香",title:"LIVE",start_time:"17:00",venue:"呉信用金庫ホール"},
  {artist:"Sunny Girl",title:"遠くの街で磨く",start_time:"17:30",venue:"広島4.14"},
  {artist:"小山田壮平",title:"弾き語りツアー2026",start_time:"18:00",venue:"広島クラブクアトロ"},
];
function validateHistoricalDurationCases(){
  return LIVE_END_VALIDATION_CASES.map(c=>{
    const r=fallbackLiveEndGuide(c.start_time,c.venue,c.title,c.artist);
    return {
      artist:c.artist,title:c.title,venue:c.venue,start_time:c.start_time,
      reference_end_time:r.time,
      range_start:r.range_start,
      range_end:r.range_end,
      basis:r.basis,
      display:r.time?("終演参考 "+r.time+"頃"):"参考時間なし",
      confidence:"reference"
    };
  });
}

function extractExplicitEndTime(text=""){
  const t=String(text||"");
  const patterns=[
    /(?:終演(?:予定|見込|見込み)?|公演終了(?:予定|見込|見込み)?|終了予定)\s*[:：]?\s*([0-2][0-9]:[0-5][0-9])/,
    /([0-2][0-9]:[0-5][0-9])\s*(?:終演予定|終了予定|終演見込|終演見込み)/,
  ];
  for(const re of patterns){ const m=t.match(re); if(m) return m[1]; }
  return null;
}
function absoluteHref(href, base){ try{return new URL(href,base).toString()}catch{return null} }
function linksFromHtml(html="",base=""){
  const out=[];
  for(const m of String(html).matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
    const url=absoluteHref(m[1],base); if(!url) continue;
    out.push({url,text:stripHtml(m[2])});
  }
  return out;
}
function sameLooseText(a,b){
  const norm=v=>String(v||"").toLowerCase().replace(/[\s　"'’“”‘・\-‐‑–—―~〜～\[\]()（）]/g,"");
  const x=norm(a),y=norm(b); if(!x||!y) return false;
  return x.includes(y)||y.includes(x)||x.slice(0,14)===y.slice(0,14);
}
async function findYumebanchiEvent(name, venue, t, ctx){
  if(!name) return null;
  const searchUrl="https://www.yumebanchi.jp/?s="+encodeURIComponent(name);
  let html=""; try{html=await fetchTextCached(searchUrl,300,ctx)}catch{return null}
  const links=linksFromHtml(html,searchUrl).filter(x=>/\/event\/\d+\/?(?:$|[?#])/.test(x.url));
  const unique=[...new Map(links.map(x=>[x.url,x])).values()].slice(0,12);
  const dateNeedle=t.year+"年"+String(t.month).padStart(2,"0")+"月"+String(t.day).padStart(2,"0")+"日";
  const dateNeedleLoose=t.year+"年"+t.month+"月"+t.day+"日";
  for(const link of unique){
    try{
      const page=await fetchTextCached(link.url,300,ctx); const text=stripHtml(page);
      if(!text.includes(dateNeedle)&&!text.includes(dateNeedleLoose)) continue;
      if(venue&&!text.includes(venue)) continue;
      if(!sameLooseText(text,name)) continue;
      return {url:link.url,html:page,text};
    }catch{}
  }
  return null;
}
function pickArtistOfficialLink(html,base){
  const links=linksFromHtml(html,base);
  const external=links.filter(x=>{try{const h=new URL(x.url).hostname; return h!=="www.yumebanchi.jp"&&h!=="yumebanchi.jp";}catch{return false}});
  const labeled=external.find(x=>/official|公式/i.test(x.text));
  return (labeled||external[0]||null)?.url||null;
}
async function checkTicketSearchSource(channel,label,url,name,venue,t,ctx){
  try{
    const html=await fetchTextCached(url,300,ctx);
    const text=stripHtml(html);
    const ymd1=t.year+"/"+t.month+"/"+t.day;
    const ymd2=t.year+"年"+t.month+"月"+t.day+"日";
    const ymd3=t.year+"/"+String(t.month).padStart(2,"0")+"/"+String(t.day).padStart(2,"0");
    const matchedName=sameLooseText(text,name);
    const matchedVenue=!venue || text.includes(venue);
    const matchedDate=text.includes(ymd1)||text.includes(ymd2)||text.includes(ymd3);
    if(!(matchedName&&matchedVenue&&matchedDate)){
      return {channel,checked:true,note:label+"で同一公演を特定できず"};
    }
    const end=extractExplicitEndTime(text);
    return {
      channel,
      end_time:end,
      direct:!!end,
      checked:true,
      note:end?(label+"で終演時刻を確認"):(label+"で公演を照合・終演時刻の明記なし")
    };
  }catch{
    return {channel,checked:true,note:label+"の取得に失敗"};
  }
}
async function collectTicketEvidence(name,venue,t,ctx){
  const q=encodeURIComponent(name);
  const sources=[
    ["ticket_eplus","イープラス","https://eplus.jp/sf/search?block=true&keyword="+q],
    ["ticket_lawson","ローチケ","https://l-tike.com/search/?keyword="+q+"&page=0&size=20"],
    ["ticket_pia","チケットぴあ","https://t.pia.jp/pia/search_all.do?kw="+q],
  ];
  return await Promise.all(sources.map(([channel,label,url])=>
    checkTicketSearchSource(channel,label,url,name,venue,t,ctx)
  ));
}

function parse12hClock(h,m,ampm){
  let hour=Number(h), minute=Number(m);
  if(!Number.isFinite(hour)||!Number.isFinite(minute)) return null;
  const ap=String(ampm||"").toUpperCase();
  if(ap==="PM"&&hour<12) hour+=12;
  if(ap==="AM"&&hour===12) hour=0;
  return hour*60+minute;
}
function setlistDurationMinutes(text=""){
  const t=String(text||"").replace(/\s+/g," ");
  const m=t.match(/Start time:\s*(\d{1,2}):(\d{2})\s*(AM|PM)[\s\S]{0,220}?End:\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    || t.match(/Show:\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–—-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if(!m) return null;
  let a=parse12hClock(m[1],m[2],m[3]), b=parse12hClock(m[4],m[5],m[6]);
  if(a==null||b==null) return null;
  if(b<a) b+=1440;
  const d=b-a;
  return d>=20&&d<=300?d:null;
}
async function collectSetlistHistoryEvidence(name,start_time,title,ctx){
  const out=[];
  if(!name||!start_time) return out;
  const searchUrl="https://www.setlist.fm/search?query="+encodeURIComponent(name);
  let html="";
  try{html=await fetchTextCached(searchUrl,900,ctx)}catch{
    return [{channel:"artist_history",checked:true,note:"setlist.fm検索の取得に失敗"}];
  }
  const links=linksFromHtml(html,searchUrl)
    .filter(x=>/\/setlist\/[^/]+\/\d{4}\/[^?#]+\.html(?:$|[?#])/.test(x.url));
  const unique=[...new Map(links.map(x=>[x.url,x])).values()].slice(0,8);
  if(!unique.length) return [{channel:"artist_history",checked:true,note:"setlist.fmで過去公演を特定できず"}];

  const pages=await Promise.all(unique.map(async x=>{
    try{
      const page=await fetchTextCached(x.url,900,ctx);
      const text=stripHtml(page);
      if(!sameLooseText(text,name)) return null;
      const duration=setlistDurationMinutes(text);
      if(!duration) return null;
      const tour=(text.match(/Tour:\s*([^#]{2,90}?)(?:Venue:|Set Times:|Doors:|Scheduled:|Start time:)/i)||[])[1]?.trim()||"";
      return {duration,tour,url:x.url,text};
    }catch{return null}
  }));
  const rows=pages.filter(Boolean);
  if(!rows.length) return [{channel:"artist_history",checked:true,note:"setlist.fmに開始・終了の両時刻がある実績なし"}];

  const sameTour=rows.filter(r=>title&&r.tour&&sameLooseText(r.tour,title));
  if(sameTour.length>=2){
    const ds=sameTour.map(x=>x.duration).sort((a,b)=>a-b);
    const med=median(ds);
    out.push({
      channel:"same_tour_recent",duration_minutes:med,checked:true,
      source_group:"setlist_history",sample_count:sameTour.length,
      note:"setlist.fm同ツアー "+sameTour.length+"公演の中央値 "+Math.round(med)+"分"
    });
  }else{
    out.push({channel:"same_tour_recent",checked:true,note:"同ツアー実績は2公演未満"});
  }

  const durations=rows.map(x=>x.duration).sort((a,b)=>a-b);
  const med=median(durations);
  const spread=durations.length>1?durations[durations.length-1]-durations[0]:0;
  out.push({
    channel:"artist_history",
    duration_minutes:med,
    checked:true,
    source_group:"setlist_history",sample_count:rows.length,
    note:"setlist.fm過去 "+rows.length+"公演の中央値 "+Math.round(med)+"分 / 幅 "+spread+"分"
  });
  return out;
}

async function collectLiveEndEvidence({name,venue,start_time,title,venueText,venueUrl,t,ctx}){
  const evidence=[];
  const venueEnd=extractExplicitEndTime(venueText);
  evidence.push({channel:"venue_official",end_time:venueEnd,direct:!!venueEnd,checked:true,note:venueEnd?("会場公式 "+(venueUrl||"")):"会場公式を確認・終演時刻の明記なし"});
  const promoter=await findYumebanchiEvent(name,venue,t,ctx);
  if(promoter){
    const promoterEnd=extractExplicitEndTime(promoter.text);
    evidence.push({channel:"promoter_official",end_time:promoterEnd,direct:!!promoterEnd,checked:true,note:promoterEnd?("夢番地 "+promoter.url):"夢番地を確認・終演時刻の明記なし"});
    const artistUrl=pickArtistOfficialLink(promoter.html,promoter.url);
    if(artistUrl){
      try{
        const artistHtml=await fetchTextCached(artistUrl,300,ctx); const artistText=stripHtml(artistHtml); const artistEnd=extractExplicitEndTime(artistText);
        evidence.push({channel:"artist_official",end_time:artistEnd,direct:!!artistEnd,checked:true,note:artistEnd?("アーティスト公式 "+artistUrl):"アーティスト公式を確認・終演時刻の明記なし"});
      }catch{ evidence.push({channel:"artist_official",checked:true,note:"アーティスト公式の取得に失敗"}); }
    }else evidence.push({channel:"artist_official",checked:true,note:"アーティスト公式URLを特定できず"});
  }else evidence.push({channel:"promoter_official",checked:true,note:"夢番地で一致する公演を特定できず"});

  const ticketEvidence=await collectTicketEvidence(name,venue,t,ctx);
  evidence.push(...ticketEvidence);
  const historyEvidence=await collectSetlistHistoryEvidence(name,start_time,title,ctx);
  evidence.push(...historyEvidence);
  return evidence;
}

const HIROSHIMA_LIVE_VENUES = [
  "広島グリーンアリーナ",
  "上野学園ホール",
  "広島文化学園HBGホール",
  "JMSアステールプラザ",
  "広島クラブクアトロ",
  "BLUE LIVE HIROSHIMA",
  "LIVE VANQUISH",
  "セカンド・クラッチ"
];
function canonicalLiveVenue(text=""){
  const t=String(text||"");
  if(/グリーンアリーナ|県立総合体育館.*大アリーナ/i.test(t)) return "広島グリーンアリーナ";
  if(/上野学園ホール|広島県立文化芸術ホール/i.test(t)) return "上野学園ホール";
  if(/HBGホール|広島文化学園HBG/i.test(t)) return "広島文化学園HBGホール";
  if(/JMS\s*アステールプラザ|アステールプラザ/i.test(t)) return "JMSアステールプラザ";
  if(/クラブクアトロ|CLUB QUATTRO/i.test(t)) return "広島クラブクアトロ";
  if(/BLUE LIVE HIROSHIMA/i.test(t)) return "BLUE LIVE HIROSHIMA";
  if(/LIVE VANQUISH/i.test(t)) return "LIVE VANQUISH";
  if(/セカンド.?クラッチ|SECOND CRUTCH/i.test(t)) return "セカンド・クラッチ";
  if(/Live\s*space\s*Reed|ライブスペース\s*リード|Reed/i.test(t)) return "Live space Reed";
  if(/ALMIGHTY/i.test(t)) return "ALMIGHTY";
  if(/Live\s*Juke|ライブ\s*ジューク/i.test(t)) return "Live Juke";
  if(/Cave-?Be/i.test(t)) return "広島Cave-Be";
  if(/(?:広島)?4\.14/i.test(t)) return "広島4.14";
  if(/\bYise\b/i.test(t)) return "Yise";
  if(/SIX\s*ONE\s*Live\s*STAR/i.test(t)) return "SIX ONE Live STAR";
  if(/広島県民文化センター/i.test(t)) return "広島県民文化センター";
  if(/東区民文化センター|マリモホールディングス東区民文化センター/i.test(t)) return "マリモホールディングス東区民文化センター";
  return "";
}
function looksLikeMusicEvent(text=""){
  const t=String(text||"");
  if(/コンサート|ライブ|LIVE|tour|ツアー|リサイタル|演奏会|音楽|オーケストラ|バンド|歌|シンガー|アーティスト|ワンマン|対バン|FES|FEST|ROCK|JAZZ|ジャズ|DJ|HIP.?HOP|アイドル/i.test(t)) return true;
  if(/ミュージカル|演劇|講演|展示|教室|大会|スポーツ|バレエ|ダンス競技|能楽|文楽|映画|セミナー/i.test(t)) return false;
  return false;
}
function extractStartTime(text=""){
  const t=String(text||"");
  const ps=[
    /(?:開演|START|start)\s*[:：]?\s*([0-2][0-9]:[0-5][0-9])/i,
    /(?:開場[^0-9]{0,20})?([0-2][0-9]:[0-5][0-9])\s*(?:開演|START)/i,
    /([0-2][0-9]:[0-5][0-9])\s*(?:～|〜|から)/,
  ];
  for(const p of ps){const m=t.match(p);if(m)return m[1]}
  return null;
}
function todayBlockFromCultureText(text,t){
  const day=String(t.day);
  const re=new RegExp("(?:^|\\s)"+day+"日\\s+(?:月曜日|火曜日|水曜日|木曜日|金曜日|土曜日|日曜日)\\s+([\\s\\S]*?)(?=\\s+[0-3]?[0-9]日\\s+(?:月曜日|火曜日|水曜日|木曜日|金曜日|土曜日|日曜日)|$)");
  return String(text||"").match(re)?.[1]||"";
}

function daySegmentByRegex(text, startRe, nextRe){
  const t=String(text||"");
  const m=t.match(startRe);
  if(!m) return "";
  const start=(m.index||0)+m[0].length;
  const rest=t.slice(start);
  const n=rest.match(nextRe);
  return (n?rest.slice(0,n.index):rest).trim();
}
function liveDateKey(t){
  return t.year+"-"+String(t.month).padStart(2,"0")+"-"+String(t.day).padStart(2,"0");
}
function futureTokyoDays(count=60){
  const jst=new Date(Date.now()+9*3600000);
  const base=Date.UTC(jst.getUTCFullYear(),jst.getUTCMonth(),jst.getUTCDate());
  const out=[];
  for(let i=0;i<count;i++){
    const d=new Date(base+i*86400000);
    out.push({year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate()});
  }
  return out;
}
async function makeOfficialVenueEvent({name,title,venue,start_time,open_time,venueText,venueUrl,t,ctx,enrichEnd=true}){
  if(!name||!venue) return null;
  const evidence=enrichEnd?await collectLiveEndEvidence({
    name,venue,start_time,title:title||name,
    venueText:venueText||"",venueUrl,t,ctx
  }):[];
  const estimate=enrichEnd?estimateLiveEndTime({
    start_time,evidence,venue,title:title||name,artist:name
  }):{
    end_time_estimate:null,end_time_reference:null,end_time_range_start:null,end_time_range_end:null,
    reference_basis:null,confidence:"none",evidence_count:0,direct_count:0,spread_minutes:null,channels:[]
  };
  return {
    kind:"live",
    date:liveDateKey(t),
    name,
    title:title||name,
    venue,
    open_time:open_time||null,
    start_time:start_time||null,
    end_time:null,
    end_time_estimate:estimate.end_time_estimate,
    end_time_reference:estimate.end_time_reference,
    end_time_range_start:estimate.end_time_range_start,
    end_time_range_end:estimate.end_time_range_end,
    end_time_reference_basis:estimate.reference_basis,
    end_time_confidence:estimate.confidence,
    end_time_evidence_count:estimate.evidence_count,
    end_time_direct_count:estimate.direct_count,
    end_time_spread_minutes:estimate.spread_minutes,
    end_time_channels:estimate.channels,
    source:"会場公式",
    source_url:venueUrl
  };
}


async function buildGreenArenaEvents(t,ctx,enrichEnd=true){
  const url="https://h-jigyoudan.or.jp/sports-center/center-events/";
  let html="";
  try{html=await fetchTextCached(url,300,ctx)}catch{return []}
  const text=stripHtml(html);
  const dateForms=[
    t.year+"年"+t.month+"月"+t.day+"日",
    t.year+"年"+String(t.month).padStart(2,"0")+"月"+String(t.day).padStart(2,"0")+"日",
    t.month+"月"+t.day+"日"
  ];
  const hit=dateForms.map(x=>text.indexOf(x)).find(x=>x>=0);
  if(hit==null||hit<0) return [];
  const snippet=text.slice(Math.max(0,hit-260),Math.min(text.length,hit+420)).replace(/\s+/g," ").trim();
  if(!looksLikeMusicEvent(snippet)) return [];
  const startTime=extractStartTime(snippet);
  let name=snippet.split(/開催日[:：]?/i)[0].trim();
  if(name.length>120) name=name.slice(-120).trim();
  if(!name||/年間・月間予定|イベント・行事/i.test(name)) return [];
  const event=await makeOfficialVenueEvent({
    name,title:name,venue:"広島グリーンアリーナ",
    start_time:startTime,open_time:null,
    venueText:snippet,venueUrl:url,t,ctx,enrichEnd
  });
  return event?[event]:[];
}
async function buildAsterPlazaEvents(t,ctx,enrichEnd=true){
  const url="https://artscouncil-hiroshima.jp/event/?md="+t.year+"-"+String(t.month).padStart(2,"0");
  let html="";
  try{html=await fetchTextCached(url,300,ctx)}catch{return []}
  const text=stripHtml(html);
  const block=todayBlockFromCultureText(text,t);
  if(!block) return [];
  const marker="JMSアステールプラザ";
  const idx=block.indexOf(marker);
  if(idx<0) return [];
  const snippet=block.slice(Math.max(0,idx-260),Math.min(block.length,idx+360)).replace(/\s+/g," ").trim();
  if(!looksLikeMusicEvent(snippet)) return [];
  const startTime=extractStartTime(snippet);
  let name=snippet.slice(0,Math.max(0,snippet.indexOf(marker))).trim();
  name=name.replace(/^.*?(?:\||　)/,"").trim();
  if(name.length>110) name=name.slice(-110).trim();
  if(!name) name="ライブ";
  const event=await makeOfficialVenueEvent({
    name,title:name,venue:"JMSアステールプラザ",
    start_time:startTime,open_time:null,
    venueText:snippet,venueUrl:url,t,ctx,enrichEnd
  });
  return event?[event]:[];
}

async function buildHbgHallEvents(t,ctx,enrichEnd=true){
  const slug=encodeURIComponent(t.year+"年"+t.month+"月");
  const url="https://h-bkk.jp/hall_schedule/"+slug+"/";
  let html="";
  try{html=await fetchTextCached(url,300,ctx)}catch{return []}
  const text=stripHtml(html);
  const d=String(t.day);
  const startRe=new RegExp("(?:^|\\s)0?"+d+"\\s*\\((?:日|月|火|水|木|金|土)\\)","i");
  const nextRe=/(?:^|\s)0?[1-3]?\d\s*\((?:日|月|火|水|木|金|土)\)/;
  const seg=daySegmentByRegex(text,startRe,nextRe);
  if(!seg||!looksLikeMusicEvent(seg)) return [];
  const tm=seg.match(/開場\s*([0-2][0-9]:[0-5][0-9])\s*開演\s*([0-2][0-9]:[0-5][0-9])/)
    || seg.match(/開場\s*([0-2][0-9]:[0-5][0-9])[\s\S]{0,30}?開演\s*([0-2][0-9]:[0-5][0-9])/);
  const openTime=tm?.[1]||null,startTime=tm?.[2]||extractStartTime(seg);
  let name=(tm?seg.slice(tm.index+tm[0].length):seg).split(/売切れ|SOLD OUT|全席|自由席|指定席|夢番地|キャンディープロモーション|TEL/i)[0].trim();
  if(!name){
    name=seg.replace(/開場[\s\S]*?開演\s*[0-2][0-9]:[0-5][0-9]/,"").trim();
  }
  name=name.replace(/\s+/g," ").trim();
  if(name.length>120) name=name.slice(0,120).trim();
  if(!name) return [];
  const event=await makeOfficialVenueEvent({
    name,title:name,venue:"広島文化学園HBGホール",
    start_time:startTime,open_time:openTime,
    venueText:seg,venueUrl:url,t,ctx,enrichEnd
  });
  return event?[event]:[];
}

async function buildBlueLiveEvents(t,ctx,enrichEnd=true){
  const url="https://bluelive.jp/schedule";
  let html="";
  try{html=await fetchTextCached(url,300,ctx)}catch{return []}
  const text=stripHtml(html);
  const mm=String(t.month).padStart(2,"0"),dd=String(t.day).padStart(2,"0");
  const startRe=new RegExp(t.year+"\\/"+mm+"\\/"+dd+"\\s*\\([A-Za-z]{3}\\)","i");
  const nextRe=/\d{4}\/\d{2}\/\d{2}\s*\([A-Za-z]{3}\)/i;
  const seg=daySegmentByRegex(text,startRe,nextRe);
  if(!seg||!looksLikeMusicEvent(seg)||/\[DANCE公演\]|CLOSED EVENT/i.test(seg)) return [];
  const tm=seg.match(/OPEN\/START\s*\|?\s*([0-2][0-9]:[0-5][0-9])\s*\/\s*([0-2][0-9]:[0-5][0-9])/i);
  const openTime=tm?.[1]||null,startTime=tm?.[2]||extractStartTime(seg);
  let before=(tm?seg.slice(0,tm.index):seg).replace(/NOW ON SALE|SOLD OUT|スタンディング|指定席|自由席|シアター|ドリンク[^ ]*/gi," ").replace(/\s+/g," ").trim();
  const pieces=before.split(/\s{2,}|(?<=\])\s+/).map(x=>x.trim()).filter(Boolean);
  let name=pieces.find(x=>x.length>=2&&!/ライブスケジュール|Image|2026|公演|OPEN|PRICE/i.test(x))||before;
  if(name.length>80) name=name.slice(0,80).trim();
  const event=await makeOfficialVenueEvent({
    name,title:before,venue:"BLUE LIVE HIROSHIMA",start_time:startTime,open_time:openTime,
    venueText:seg,venueUrl:url,t,ctx,enrichEnd
  });
  return event?[event]:[];
}
async function buildVanquishEvents(t,ctx,enrichEnd=true){
  const url="https://live-vanquish.com/";
  let html="";
  try{html=await fetchTextCached(url,300,ctx)}catch{return []}
  const text=stripHtml(html);
  const mm=String(t.month).padStart(2,"0"),dd=String(t.day).padStart(2,"0");
  const startRe=new RegExp(t.year+"\\s+"+mm.replace(/^0/,"")+"\\."+dd+"\\s+[A-Z]{3}","i");
  const nextRe=/\d{4}\s+\d{1,2}\.\d{2}\s+[A-Z]{3}/i;
  const seg=daySegmentByRegex(text,startRe,nextRe);
  if(!seg||!looksLikeMusicEvent(seg)) return [];
  const tm=seg.match(/OPEN[：:]\s*([0-2][0-9]:[0-5][0-9])\s*\/\s*([0-2][0-9]:[0-5][0-9])/i);
  const openTime=tm?.[1]||null,startTime=tm?.[2]||extractStartTime(seg);
  let before=(tm?seg.slice(0,tm.index):seg).replace(/\s+/g," ").trim();
  let name=before.split(/料金|お問い合わせ/)[0].trim();
  if(name.length>90) name=name.slice(0,90).trim();
  const event=await makeOfficialVenueEvent({
    name,title:before,venue:"LIVE VANQUISH",start_time:startTime,open_time:openTime,
    venueText:seg,venueUrl:url,t,ctx,enrichEnd
  });
  return event?[event]:[];
}
async function buildDirectVenueLiveEvents(t,ctx,enrichEnd=true){
  const groups=await Promise.all([
    buildGreenArenaEvents(t,ctx,enrichEnd),
    buildAsterPlazaEvents(t,ctx,enrichEnd),
    buildHbgHallEvents(t,ctx,enrichEnd),
    buildBlueLiveEvents(t,ctx,enrichEnd),
    buildVanquishEvents(t,ctx,enrichEnd)
  ]);
  return groups.flat();
}

async function buildCultureHiroshimaLiveEvents(t,ctx,enrichEnd=true){
  const url="https://artscouncil-hiroshima.jp/event/?md="+t.year+"-"+String(t.month).padStart(2,"0");
  let html="";
  try{html=await fetchTextCached(url,300,ctx)}catch{return []}
  const text=stripHtml(html);
  const block=todayBlockFromCultureText(text,t);
  if(!block) return [];
  const found=[];
  for(const venue of HIROSHIMA_LIVE_VENUES){
    const idx=block.indexOf(venue);
    if(idx<0) continue;
    const left=Math.max(0,idx-220), right=Math.min(block.length,idx+220);
    const snippet=block.slice(left,right).replace(/\s+/g," ").trim();
    if(!looksLikeMusicEvent(snippet)) continue;
    let name=snippet.slice(0,Math.max(0,snippet.indexOf(venue))).trim();
    name=name.replace(/^.*?(?:\||　)/,"").trim();
    if(name.length>100) name=name.slice(-100).trim();
    if(!name) name="ライブ";
    const startTime=extractStartTime(snippet);
    const evidence=enrichEnd?await collectLiveEndEvidence({
      name,venue,start_time:startTime,title:name,
      venueText:snippet,venueUrl:url,t,ctx
    }):[];
    const estimate=enrichEnd?estimateLiveEndTime({
      start_time:startTime,evidence,venue,title:name,artist:name
    }):{
      end_time_estimate:null,end_time_reference:null,end_time_range_start:null,end_time_range_end:null,
      reference_basis:null,confidence:"none",evidence_count:0,direct_count:0,spread_minutes:null,channels:[]
    };
    found.push({
      kind:"live",
      date:liveDateKey(t),
      name,
      venue,
      open_time:null,
      start_time:startTime,
      end_time:null,
      end_time_estimate:estimate.end_time_estimate,
      end_time_reference:estimate.end_time_reference,
      end_time_range_start:estimate.end_time_range_start,
      end_time_range_end:estimate.end_time_range_end,
      end_time_reference_basis:estimate.reference_basis,
      end_time_confidence:estimate.confidence,
      end_time_evidence_count:estimate.evidence_count,
      end_time_direct_count:estimate.direct_count,
      end_time_spread_minutes:estimate.spread_minutes,
      end_time_channels:estimate.channels,
      source:"カルチャーひろしま",
      source_url:url
    });
  }
  return found;
}
function mergeLiveEvents(rows){
  const out=[];
  const seen=new Set();
  for(const e of rows){
    if(!e) continue;
    const key=[e.date||"",e.venue||"",e.start_time||"",String(e.name||"").toLowerCase().replace(/\s+/g,"")].join("|");
    if(seen.has(key)) continue;
    seen.add(key); out.push(e);
  }
  return out;
}
async function buildQuattroEventsForDay(t,ctx,enrichEnd=true){
  const ym=t.year+String(t.month).padStart(2,"0");
  const url="https://www.club-quattro.com/hiroshima/schedule/?ym="+ym;
  let html="";
  try{html=await fetchTextCached(url,300,ctx)}catch{return []}
  const text=stripHtml(html);
  const day=String(t.day).padStart(2,"0");
  const dayRe=new RegExp("(?:^|\\s)"+day+"\\s+(?:MON|TUE|WED|THU|FRI|SAT|SUN)\\.\\s+([\\s\\S]{0,500}?)(?=\\s+[0-3][0-9]\\s+(?:MON|TUE|WED|THU|FRI|SAT|SUN)\\.|$)","i");
  const m=text.match(dayRe);
  if(!m) return [];
  const seg=m[1].replace(/SOLD OUT|NEW|QUATTRO WEB 先行/gi," ").replace(/\s+/g," ").trim();
  const tm=seg.match(/開場\/開演\s*([0-2][0-9]:[0-5][0-9])\s*\/\s*([0-2][0-9]:[0-5][0-9])/);
  let name=seg.split(/開場\/開演|料金|お問い合わせ先/)[0].trim();
  const words=name.split(" ");
  if(words.length>=2){
    const half=Math.floor(words.length/2);
    if(words.length%2===0&&words.slice(0,half).join(" ")===words.slice(half).join(" ")) name=words.slice(0,half).join(" ");
  }
  if(!name) return [];
  const startTime=tm?tm[2]:null;
  let estimate={
    end_time_estimate:null,end_time_reference:null,end_time_range_start:null,end_time_range_end:null,
    reference_basis:null,confidence:"none",evidence_count:0,direct_count:0,spread_minutes:null,channels:[]
  };
  if(enrichEnd){
    const evidence=await collectLiveEndEvidence({
      name,venue:"広島クラブクアトロ",start_time:startTime,title:name,venueText:seg,venueUrl:url,t,ctx
    });
    estimate=estimateLiveEndTime({
      start_time:startTime,evidence,venue:"広島クラブクアトロ",title:name,artist:name
    });
  }
  return [{
    kind:"live",date:liveDateKey(t),name,venue:"広島クラブクアトロ",
    open_time:tm?tm[1]:null,start_time:startTime,end_time:null,
    end_time_estimate:estimate.end_time_estimate,end_time_reference:estimate.end_time_reference,
    end_time_range_start:estimate.end_time_range_start,end_time_range_end:estimate.end_time_range_end,
    end_time_reference_basis:estimate.reference_basis,end_time_confidence:estimate.confidence,
    end_time_evidence_count:estimate.evidence_count,end_time_direct_count:estimate.direct_count,
    end_time_spread_minutes:estimate.spread_minutes,end_time_channels:estimate.channels,
    source:"HIROSHIMA CLUB QUATTRO",source_url:url
  }];
}

async function getHiroshimaEventsCached(ctx) {
  const cache=caches.default;
  const liveKey=new Request("https://taxi-sales-nav.local/events/hiroshima/current-v3");
  const lastGoodKey=new Request("https://taxi-sales-nav.local/events/hiroshima/last-good-v3");

  const hit=await cache.match(liveKey);
  if(hit){
    try{
      const payload=await hit.json();
      return {...payload,cache_state:"hit"};
    }catch{}
  }

  let fresh=null;
  try{
    fresh=await buildHiroshimaEvents(ctx);
  }catch(e){
    fresh=null;
  }

  if(fresh?.ok && Array.isArray(fresh.events) && fresh.events.length>0){
    const currentResponse=new Response(JSON.stringify(fresh),{
      headers:{"content-type":"application/json;charset=UTF-8","cache-control":"public,max-age=1800"}
    });
    const backupResponse=new Response(JSON.stringify(fresh),{
      headers:{"content-type":"application/json;charset=UTF-8","cache-control":"public,max-age=172800"}
    });
    ctx?.waitUntil(Promise.all([
      cache.put(liveKey,currentResponse),
      cache.put(lastGoodKey,backupResponse)
    ]));
    return {...fresh,cache_state:"refreshed"};
  }

  const lastGood=await cache.match(lastGoodKey);
  if(lastGood){
    try{
      const payload=await lastGood.json();
      return {...payload,cache_state:"last_good",stale:true};
    }catch{}
  }

  return fresh||{
    ok:true,
    area:"hiroshima",
    generated_at:Math.floor(Date.now()/1000),
    coverage:"upcoming_60_days",
    range_days:60,
    cache_state:"empty",
    events:[]
  };
}

async function buildHiroshimaEvents(ctx) {
  const today=tokyoParts();
  const days=futureTokyoDays(60);
  const all=[];
  for(const t of days){
    const enrichEnd=liveDateKey(t)===liveDateKey(today);
    const [quattro,direct,culture]=await Promise.all([
      buildQuattroEventsForDay(t,ctx,enrichEnd),
      buildDirectVenueLiveEvents(t,ctx,enrichEnd),
      buildCultureHiroshimaLiveEvents(t,ctx,enrichEnd)
    ]);
    all.push(...quattro,...direct,...culture);
  }
  const mergedEvents=mergeLiveEvents(all).sort((a,b)=>
    String(a.date||"").localeCompare(String(b.date||""))||
    String(a.start_time||"99:99").localeCompare(String(b.start_time||"99:99"))
  );
  return {
    ok:true,
    area:"hiroshima",
    generated_at:Math.floor(Date.now()/1000),
    coverage:"upcoming_60_days",
    range_days:60,
    end_time_logic:{
      channel_count:LIVE_END_CHANNELS.length,
      channels:LIVE_END_CHANNELS.map(([id,label,weight])=>({id,label,weight})),
      operational_goal:"営業判断で体感8割程度の有用性を目標。ユーザーには誤差幅や根拠の強弱を表示せず、終演時間の案内はすべて『過去公演参考』に統一する。",
      acceptable_error_minutes:30,
      rule:"当日の公演は終演参考まで取得。将来公演は日付・開演・会場を先に広く収集し、当日になったら終演参考を補完する。"
    },
    venues_covered:HIROSHIMA_LIVE_VENUES,
    events:mergedEvents,
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
  const [lines,trafficAlerts] = await Promise.all([
    Promise.all(LINES.map(async ([code,name])=>{
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
    })),
    loadHiroshimaTrafficAlerts(ctx)
  ]);
  return {
    ok:true,
    area:"hiroshima",
    generated_at:Math.floor(Date.now()/1000),
    source_host:"www.train-guide.westjr.co.jp",
    cache_seconds:20,
    summary:summarize(lines),
    traffic_alerts:trafficAlerts,
    lines,
  };
}

const JR_LAST_TRAIN_STATIONS = [
  {id:"hiroshima-west",name:"広島駅",toward:"岩国方面",lat:34.3974,lon:132.4756,path:"3863022001",radius_km:4.0},
  {id:"nishihiroshima-east",name:"西広島駅",toward:"広島方面",lat:34.3970,lon:132.4280,path:"3865022002",radius_km:4.5},
  {id:"miyajimaguchi-east",name:"宮島口駅",toward:"広島方面",lat:34.3119,lon:132.3024,path:"3868022002",radius_km:6.0},
  {id:"otake-east",name:"大竹駅",toward:"広島方面",lat:34.2113,lon:132.2238,path:"3871022002",radius_km:7.0},
  {id:"iwakuni-east",name:"岩国駅",toward:"広島方面",lat:34.1717,lon:132.2256,path:"3872022001",radius_km:8.0}
];

function tokyoDateKey(d=new Date()){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d);
  const m=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return m.year+m.month+m.day;
}
function serviceMinute(h,m){ return (h<4?h+24:h)*60+m; }
function decodeHtmlText(html){
  return String(html||"")
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;|&#160;/g," ")
    .replace(/&amp;/g,"&")
    .replace(/&#x3a;|&#58;/gi,":")
    .replace(/\s+/g," ");
}
function lastClockFromTimetableHtml(html){
  const text=decodeHtmlText(html);
  const times=[];
  for(const m of text.matchAll(/(?:^|[^\d])([0-2]?\d):([0-5]\d)(?!\d)/g)){
    const h=Number(m[1]),min=Number(m[2]);
    if(h<=23) times.push({h,min,service:serviceMinute(h,min)});
  }
  if(!times.length) return null;
  times.sort((a,b)=>a.service-b.service);
  const x=times[times.length-1];
  return String(x.h).padStart(2,"0")+":"+String(x.min).padStart(2,"0");
}
async function fetchJrLastTrainStation(st,dateKey,ctx){
  const url="https://timetable.jr-odekake.net/station-timetable/"+st.path+"?date="+dateKey;
  const cacheKey=new Request("https://taxi-jr-last-train.local/"+st.id+"?date="+dateKey);
  const cache=caches.default;
  let res=await cache.match(cacheKey);
  let source="cache";
  if(!res){
    source="live";
    const up=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0","Accept":"text/html"}});
    if(!up.ok) throw new Error("jr timetable "+st.id+" http "+up.status);
    res=new Response(await up.text(),{headers:{"Content-Type":"text/html;charset=utf-8","Cache-Control":"public,max-age=21600"}});
    ctx?.waitUntil(cache.put(cacheKey,res.clone()));
  }
  const html=await res.text();
  const last=lastClockFromTimetableHtml(html);
  return {...st,last_train:last,source};
}
async function buildJrLastTrains(ctx,dateKey=""){
  const key=/^\d{8}$/.test(dateKey)?dateKey:tokyoDateKey();
  const rows=await Promise.all(JR_LAST_TRAIN_STATIONS.map(async st=>{
    try{return await fetchJrLastTrainStation(st,key,ctx)}
    catch(e){return {...st,last_train:null,source:"error",error:String(e?.message||e)}}
  }));
  return {
    ok:true,
    area:"hiroshima",
    date:key,
    generated_at:Math.floor(Date.now()/1000),
    source:"JR西日本 駅時刻表",
    note:"時刻表ベース。実際の運行・遅延による通過時刻とは異なる場合があります。",
    stations:rows
  };
}


function researchTrainKey(line,tr){
  return String(line.code||line.name||'')+':'+String(tr.no||tr.dest||tr.pos||'unknown');
}
function researchPositionKey(tr){
  const t=String(tr.positionText||'').replace(/(?:〜|～)?#+/g,'').replace(/[〜～]+$/,'').trim();
  return t || String(tr.pos||'');
}
function researchCompactPayload(data){
  const trains=[];
  for(const line of (data.lines||[])){
    for(const tr of (line.trains||[])){
      trains.push({
        k:researchTrainKey(line,tr),
        l:String(line.name||line.code||''),
        n:String(tr.no||''),
        p:researchPositionKey(tr),
        d:Number(tr.delayMinutes||0)
      });
    }
  }
  return {t:Number(data.generated_at||Math.floor(Date.now()/1000)),trains};
}
export class JrResearchStore{
  constructor(state){this.state=state}
  async fetch(req){
    const u=new URL(req.url);
    if(req.method==='POST'&&u.pathname==='/record'){
      const x=await req.json();
      return json(await this.record(x));
    }
    if(req.method==='GET'&&u.pathname==='/summary'){
      const limit=Math.max(12,Math.min(2016,Number(u.searchParams.get('limit')||288)));
      return json(await this.summary(limit));
    }
    return json({ok:false,error:'not_found'},404);
  }
  async record(x){
    const now=Number(x.t||Math.floor(Date.now()/1000));
    const prev=await this.state.storage.get('last_trains')||{};
    const next={};
    const suspicious=[];
    const byPosition=new Map();
    let maxDelay=0, delayed=0, delayGrowth=0, stopped5=0, stopped10=0;

    for(const tr of (Array.isArray(x.trains)?x.trains:[])){
      const key=String(tr.k||'');
      if(!key) continue;
      const pos=String(tr.p||'');
      const delay=Math.max(0,Number(tr.d||0));
      const old=prev[key]||null;
      let stationarySec=0;
      if(old&&pos&&old.p===pos){
        stationarySec=Math.max(0,Number(old.stationarySec||0)+(now-Number(old.t||now)));
      }
      const delta=old?delay-Number(old.d||0):0;
      if(delay>0) delayed++;
      if(delta>0) delayGrowth+=delta;
      maxDelay=Math.max(maxDelay,delay);
      if(stationarySec>=300) stopped5++;
      if(stationarySec>=600) stopped10++;
      next[key]={p:pos,d:delay,t:now,stationarySec,l:tr.l,n:tr.n};
      if(pos){
        const a=byPosition.get(pos)||[];
        a.push({key,l:tr.l,n:tr.n,delay,stationarySec,delta});
        byPosition.set(pos,a);
      }
    }

    let queueMax=0;
    for(const [position,rows] of byPosition){
      const active=rows.filter(r=>r.stationarySec>=300||r.delay>=5);
      queueMax=Math.max(queueMax,active.length);
      if(active.length>=2){
        suspicious.push({type:'cluster',position,count:active.length,maxDelay:Math.max(...active.map(r=>r.delay)),maxStopSec:Math.max(...active.map(r=>r.stationarySec)),lines:[...new Set(active.map(r=>r.l).filter(Boolean))]});
      }
    }
    for(const [key,v] of Object.entries(next)){
      if(v.stationarySec>=600){
        suspicious.push({type:'long_stop',position:v.p,train:v.n,line:v.l,delay:v.d,stopSec:v.stationarySec});
      }
    }

    const score=
      Math.min(4,stopped10*2)+
      Math.min(4,queueMax>=2?queueMax:0)+
      Math.min(4,Math.floor(maxDelay/5))+
      Math.min(3,Math.floor(delayGrowth/3));

    const sample={
      t:now,
      delayed,
      maxDelay,
      delayGrowth,
      stopped5,
      stopped10,
      queueMax,
      score,
      suspicious:suspicious.slice(0,12)
    };
    await this.state.storage.put('last_trains',next);
    await this.state.storage.put('sample:'+String(now),sample);

    const lastAnomaly=await this.state.storage.get('last_anomaly')||null;
    if(score>=5){
      const event={...sample,id:'anomaly_'+now};
      await this.state.storage.put('event:'+String(now),event);
      await this.state.storage.put('last_anomaly',event);
    }

    const cutoff=now-90*24*60*60;
    const oldSamples=await this.state.storage.list({prefix:'sample:',limit:200});
    for(const [k] of oldSamples){
      const ts=Number(String(k).slice(7));
      if(ts&&ts<cutoff) await this.state.storage.delete(k);
    }
    const oldEvents=await this.state.storage.list({prefix:'event:',limit:100});
    for(const [k] of oldEvents){
      const ts=Number(String(k).slice(6));
      if(ts&&ts<cutoff) await this.state.storage.delete(k);
    }
    return {ok:true,sample,lastAnomaly};
  }
  async summary(limit){
    const rows=await this.state.storage.list({prefix:'sample:',reverse:true,limit});
    const events=await this.state.storage.list({prefix:'event:',reverse:true,limit:50});
    const samples=[...rows.values()];
    const ev=[...events.values()];
    const normal=samples.filter(x=>Number(x.score||0)<5);
    const avg=(arr,k)=>arr.length?Math.round(arr.reduce((s,x)=>s+Number(x[k]||0),0)/arr.length*10)/10:0;
    return {
      ok:true,
      samples:samples.length,
      baseline:{
        avgDelayed:avg(normal,'delayed'),
        avgMaxDelay:avg(normal,'maxDelay'),
        avgStopped5:avg(normal,'stopped5'),
        avgQueueMax:avg(normal,'queueMax')
      },
      recent:samples.slice(0,48),
      anomalyEvents:ev.slice(0,20)
    };
  }
}
async function recordJrResearch(env,data){
  if(!env.JR_RESEARCH) return null;
  const id=env.JR_RESEARCH.idFromName('hiroshima');
  const stub=env.JR_RESEARCH.get(id);
  const r=await stub.fetch('https://jr-research.local/record',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(researchCompactPayload(data))
  });
  return r.ok?await r.json():null;
}

export default {
  async scheduled(controller, env, ctx) {
    try{
      const data=await buildHiroshima(ctx);
      await recordJrResearch(env,data);
    }catch(e){
      console.log("jr_research_scheduled_error",String(e?.message||e));
    }
  },
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
      if (url.pathname === "/api/jr/research/summary") {
        if(!env.JR_RESEARCH) return json({ok:false,error:"research_store_unavailable"},503,origin);
        const id=env.JR_RESEARCH.idFromName("hiroshima");
        const stub=env.JR_RESEARCH.get(id);
        const r=await stub.fetch("https://jr-research.local/summary?limit="+encodeURIComponent(url.searchParams.get("limit")||"288"));
        return new Response(await r.text(),{status:r.status,headers:{...corsHeaders(origin),"content-type":"application/json;charset=UTF-8","cache-control":"no-store"}});
      }
      if (url.pathname === "/api/jr/last-trains/hiroshima") return json(await buildJrLastTrains(ctx,url.searchParams.get("date")||""),200,origin);
      if (url.pathname === "/api/sports/hiroshima") return json(await buildHiroshimaSports(ctx),200,origin);
      if (url.pathname === "/api/events/live-end-validation") return json({
        ok:true,
        generated_at:Math.floor(Date.now()/1000),
        rule:"過去実績1件は断定・予測に使わず参考時間。複数の同ツアー・同形式実績が揃えば中央値とばらつきから終演目安へ昇格。",
        cases:validateHistoricalDurationCases()
      },200,origin);
      if (url.pathname === "/api/events/hiroshima") return json(await getHiroshimaEventsCached(ctx),200,origin);
      if (url.pathname === "/api/bus/hiroshima") return json(await buildHiroshimaBus(ctx),200,origin);
      return json({ok:false,error:"not_found"},404,origin);
    } catch (e) {
      return json({ok:false,error:"upstream_fetch_failed",detail:String(e?.message||e)},502,origin);
    }
  }
};
