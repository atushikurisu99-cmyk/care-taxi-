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
function fallbackLiveEndGuide(start_time, venue=""){
  const start=hhmmToMinutes(start_time);
  if(start==null) return {time:null,range_start:null,range_end:null,basis:null};
  const v=String(venue||"");
  let minutes=120, margin=30, basis="ライブ公演の一般参考幅";
  if(/グリーンアリーナ|アリーナ|ドーム|スタジアム/i.test(v)){
    minutes=150; margin=45; basis="アリーナ公演の参考幅";
  }else if(/HBG|ホール|アステール|文化会館|県民文化センター/i.test(v)){
    minutes=130; margin=30; basis="ホール公演の参考幅";
  }else if(/QUATTRO|クアトロ|VANQUISH|BLUE LIVE|SECOND|セカンド|Live|ライブ/i.test(v)){
    minutes=120; margin=30; basis="ライブハウス公演の参考幅";
  }
  return {
    time:minutesToHHMM(start+minutes),
    range_start:minutesToHHMM(start+minutes-margin),
    range_end:minutesToHHMM(start+minutes+margin),
    basis
  };
}
function estimateLiveEndTime({start_time,evidence=[],venue=""}={}){
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
    if(ev?.checked && !ev?.end_time){
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
      direct:!!ev?.direct
    });
  }

  if(!usable.length){
    const ref=fallbackLiveEndGuide(start_time,venue);
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
  else if(pool.length>=3 && spread<=25) confidence="medium";

  // 直接情報なしで1件だけの推定は表示しない。
  const publishable=directs.length>=1 || pool.length>=2;

  const ref=publishable?{time:null,range_start:null,range_end:null,basis:null}:fallbackLiveEndGuide(start_time,venue);
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
  {artist:"ONE OK ROCK",start_time:"21:15",duration_minutes:110,channel:"same_tour_recent",context:"通常ツアー"},
  {artist:"Official HIGE DANdism",start_time:"19:05",duration_minutes:125,channel:"same_tour_recent",context:"通常ツアー"},
  {artist:"Ado",start_time:"18:00",duration_minutes:158,channel:"same_tour_recent",context:"スタジアム"},
  {artist:"Kodaline",start_time:"19:30",duration_minutes:90,channel:"artist_history",context:"単独公演"},
  {artist:"The Warning",start_time:"14:10",duration_minutes:40,channel:"artist_history",context:"フェス"},
  {artist:"Beyoncé",start_time:"20:35",duration_minutes:170,channel:"same_tour_recent",context:"スタジアム"},
  {artist:"Rina Katahira",start_time:"20:00",duration_minutes:80,channel:"artist_history",context:"ライブハウス"},
  {artist:"Kendrick Lamar & SZA",start_time:"20:10",duration_minutes:160,channel:"same_tour_recent",context:"スタジアム"},
  {artist:"L",start_time:"18:00",duration_minutes:130,channel:"artist_history",context:"ホール"},
  {artist:"betcover!!",start_time:"18:10",duration_minutes:95,channel:"artist_history",context:"ライブハウス"},
];
function validateHistoricalDurationCases(){
  return LIVE_END_VALIDATION_CASES.map(c=>{
    const start=hhmmToMinutes(c.start_time);
    const ref=start==null?null:minutesToHHMM(start+c.duration_minutes);
    return {
      artist:c.artist,context:c.context,start_time:c.start_time,
      reference_end_time:ref,duration_minutes:c.duration_minutes,
      display:ref?("終演参考 "+ref+"頃"):"参考時間なし",
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
async function collectLiveEndEvidence({name,venue,start_time,venueText,venueUrl,t,ctx}){
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
  return evidence;
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
    if (name) {
      const startTime=time?time[2]:null;
      const evidence=await collectLiveEndEvidence({
        name,
        venue:"広島クラブクアトロ",
        start_time:startTime,
        venueText:seg,
        venueUrl:url,
        t,
        ctx
      });
      const estimate=estimateLiveEndTime({start_time:startTime,evidence,venue:"広島クラブクアトロ"});
      events.push({
        kind:"live",
        name,
        venue:"広島クラブクアトロ",
        open_time:time?time[1]:null,
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
        source:"HIROSHIMA CLUB QUATTRO",
        source_url:url,
      });
    }
  }
  return {
    ok:true,
    area:"hiroshima",
    generated_at:Math.floor(Date.now()/1000),
    coverage:"partial",
    end_time_logic:{
      channel_count:LIVE_END_CHANNELS.length,
      channels:LIVE_END_CHANNELS.map(([id,label,weight])=>({id,label,weight})),
      rule:"公式の直接終演時刻を最優先。直接情報がない場合は独立した2系統以上が一致した時だけ終演目安を公開。45分超の外れ値は除外。"
    },
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
      if (url.pathname === "/api/events/live-end-validation") return json({
        ok:true,
        generated_at:Math.floor(Date.now()/1000),
        rule:"過去実績1件は断定・予測に使わず参考時間。複数の同ツアー・同形式実績が揃えば中央値とばらつきから終演目安へ昇格。",
        cases:validateHistoricalDurationCases()
      },200,origin);
      if (url.pathname === "/api/events/hiroshima") return json(await buildHiroshimaEvents(ctx),200,origin);
      if (url.pathname === "/api/bus/hiroshima") return json(await buildHiroshimaBus(ctx),200,origin);
      return json({ok:false,error:"not_found"},404,origin);
    } catch (e) {
      return json({ok:false,error:"upstream_fetch_failed",detail:String(e?.message||e)},502,origin);
    }
  }
};
