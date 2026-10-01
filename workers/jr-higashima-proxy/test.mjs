import worker from "./index.mjs";

const stationPayload = {stations:[
  {info:{code:"A",name:"広島"}},
  {info:{code:"B",name:"海田市"}},
]};
const posPayload = {update:"test",trains:[
  {no:"101",pos:"A_B",direction:"1",dest:{text:"呉"},delayMinutes:7,numberOfCars:4},
  {no:"102",pos:"B",direction:"0",dest:"広島",delayMinutes:0,numberOfCars:3},
]};

const mem = new Map();
globalThis.caches = {default:{
  async match(req){ const v=mem.get(req.url); return v ? v.clone() : undefined; },
  async put(req,res){ mem.set(req.url,res.clone()); }
}};
globalThis.fetch = async (url)=>{
  if(String(url).endsWith("_st.json")) return new Response(JSON.stringify(stationPayload),{status:200});
  if(String(url).endsWith(".json")) return new Response(JSON.stringify(posPayload),{status:200});
  throw new Error("unexpected "+url);
};
const pending=[];
const ctx={waitUntil(p){ pending.push(p); }};
const req=new Request("https://worker.example/api/jr/hiroshima",{headers:{Origin:"https://atushikurisu99-cmyk.github.io"}});
const res=await worker.fetch(req,{},ctx);
await Promise.all(pending);
if(res.status!==200) throw new Error("status "+res.status);
const body=await res.json();
if(body.summary.line_count!==6) throw new Error("line count");
if(body.summary.delayed_trains!==6) throw new Error("delayed count");
if(body.lines[0].trains[0].positionText!=="広島〜海田市") throw new Error("station conversion");
if(res.headers.get("Access-Control-Allow-Origin")!=="https://atushikurisu99-cmyk.github.io") throw new Error("cors");
console.log(JSON.stringify({ok:true,summary:body.summary,positionText:body.lines[0].trains[0].positionText}));
