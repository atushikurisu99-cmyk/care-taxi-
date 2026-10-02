import worker from "./index.mjs";

const stationPayload = {stations:[
  {info:{code:"A",name:"広島"}},
  {info:{code:"B",name:"海田市"}},
]};
const posPayload = {update:"test",trains:[
  {no:"101",pos:"A_B",direction:"1",dest:{text:"呉"},delayMinutes:7,numberOfCars:4},
  {no:"102",pos:"B",direction:"0",dest:"広島",delayMinutes:0,numberOfCars:3},
]};

const parts = new Intl.DateTimeFormat("ja-JP", {
  timeZone:"Asia/Tokyo", year:"numeric", month:"2-digit", day:"2-digit"
}).formatToParts(new Date());
const p={};
for(const x of parts) if(x.type!=="literal") p[x.type]=x.value;
const year=p.year, month=p.month, day=p.day, mmdd=month+day;

const scheduleHtml = `
<html><body>
<div>${Number(month)}/${Number(day)} 広島 マツダスタジアム 18:00
<a href="/scores/${year}/${mmdd}/carp-test.html">試合速報</a></div>
</body></html>`;

const scoreHtml = `
<html><body>
<div>広島東洋カープ</div>
<div>マツダスタジアム</div>
<div>開始 18:00</div>
<div>終了 21:15</div>
</body></html>`;

const eventHtml = `
<html><body>
<div>${day} FRI. TEST ARTIST TEST ARTIST 開場/開演 18:00 / 19:00 料金 前売</div>
<div>31 SAT. NEXT EVENT 開場/開演 18:00 / 19:00</div>
</body></html>`;

const mem = new Map();
globalThis.caches = {default:{
  async match(req){ const v=mem.get(req.url); return v ? v.clone() : undefined; },
  async put(req,res){ mem.set(req.url,res.clone()); }
}};
globalThis.fetch = async (url)=>{
  const s=String(url);
  if(s.includes("npb.jp/games/") && s.includes("schedule_")) return new Response(scheduleHtml,{status:200});
  if(s.includes("npb.jp/scores/")) return new Response(scoreHtml,{status:200});
  if(s.includes("club-quattro.com/hiroshima/schedule")) return new Response(eventHtml,{status:200});
  if(s.endsWith("_st.json")) return new Response(JSON.stringify(stationPayload),{status:200});
  if(s.endsWith(".json")) return new Response(JSON.stringify(posPayload),{status:200});
  throw new Error("unexpected "+url);
};
const pending=[];
const ctx={waitUntil(p){ pending.push(p); }};

async function call(path){
  const req=new Request("https://worker.example"+path,{headers:{Origin:"https://atushikurisu99-cmyk.github.io"}});
  const res=await worker.fetch(req,{},ctx);
  await Promise.all(pending.splice(0));
  if(res.status!==200) throw new Error(path+" status "+res.status+" "+await res.text());
  if(res.headers.get("Access-Control-Allow-Origin")!=="https://atushikurisu99-cmyk.github.io") throw new Error(path+" cors");
  return await res.json();
}

const jr=await call("/api/jr/hiroshima");
if(jr.summary.line_count!==6) throw new Error("line count");
if(jr.summary.delayed_trains!==6) throw new Error("delayed count");
if(jr.lines[0].trains[0].positionText!=="広島〜海田市") throw new Error("station conversion");

const sports=await call("/api/sports/hiroshima");
const carp=sports.sports?.[0];
if(carp?.team!=="広島東洋カープ") throw new Error("carp missing");
if(carp?.status!=="ended") throw new Error("carp status "+carp?.status);
if(carp?.end_time!=="21:15") throw new Error("carp end time "+carp?.end_time);

const events=await call("/api/events/hiroshima");
if(!Array.isArray(events.events)) throw new Error("events array missing");
if(events.events.length!==1) throw new Error("event count "+events.events.length);
if(events.events[0].name!=="TEST ARTIST") throw new Error("event name "+events.events[0].name);
if(events.events[0].start_time!=="19:00") throw new Error("event time "+events.events[0].start_time);

console.log(JSON.stringify({
  ok:true,
  jr:jr.summary,
  sports:{status:carp.status,end_time:carp.end_time},
  event:{name:events.events[0].name,start_time:events.events[0].start_time}
}));
