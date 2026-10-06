const fs = require('node:fs/promises');

const TZ='Asia/Tokyo';
const OUT='sales-nav-prototype/data/hiroshima-demand-events.json';
const USER_AGENT='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36 taxi-sales-nav-collector/1.0';

function jstDate(){
  return new Intl.DateTimeFormat('sv-SE',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
function addDays(ymd,n){
  const d=new Date(ymd+'T00:00:00+09:00'); d.setDate(d.getDate()+n);
  return new Intl.DateTimeFormat('sv-SE',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
}
function stripHtml(s=''){
  return String(s).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();
}
function norm(s=''){ return stripHtml(s).normalize('NFKC').replace(/\s+/g,' ').trim(); }
function int(v){ const n=Number(String(v??'').replace(/[^0-9.-]/g,'')); return Number.isFinite(n)?n:null; }
function ymd(y,m,d){return String(y)+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
function eraYear(s=''){const m=String(s).match(/令和\s*(\d+)年/);return m?2018+Number(m[1]):null}
function dateFrom(s='',fallbackYear){
  s=norm(s);
  let m=s.match(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日/); if(m)return ymd(m[1],m[2],m[3]);
  m=s.match(/(20\d{2})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/); if(m)return ymd(m[1],m[2],m[3]);
  m=s.match(/(?:^|\s)(\d{1,2})[\/.](\d{1,2})(?:\D|$)/); if(m&&fallbackYear)return ymd(fallbackYear,m[1],m[2]);
  return null;
}
function endDateFrom(s='',fallbackYear){
  s=norm(s);
  const a=[...s.matchAll(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日/g)]; if(a.length>1){const m=a.at(-1);return ymd(m[1],m[2],m[3])}
  const m=s.match(/(\d{1,2})[\/.](\d{1,2})\D{0,10}(?:-|〜|～|~|→)\D{0,10}(\d{1,2})[\/.](\d{1,2})/); if(m&&fallbackYear)return ymd(fallbackYear,m[3],m[4]);
  return null;
}
function startTime(s=''){const m=norm(s).match(/(?:開演|開始|試合開始|START)\D{0,12}([0-2]?\d:[0-5]\d)/i)||norm(s).match(/([0-2]?\d:[0-5]\d)\s*(?:開演|開始)/);return m?m[1].padStart(5,'0'):null}
function endTime(s=''){const m=norm(s).match(/(?:終演|終了)\D{0,12}([0-2]?\d:[0-5]\d)/i)||norm(s).match(/([0-2]?\d:[0-5]\d)\s*(?:終演|終了)/);return m?m[1].padStart(5,'0'):null}
function statedPeople(s=''){
  s=norm(s);
  let m=s.match(/(?:来場|参加|観客|入場|動員|延べ|先着)\D{0,40}約?\s*(\d+(?:\.\d+)?)\s*万人/); if(m)return Math.round(Number(m[1])*10000);
  m=s.match(/(?:来場者|参加者|観客|入場者|動員数|延べ|先着)\D{0,40}約?\s*([\d,]{2,})\s*人/); if(m)return int(m[1]);
  return null;
}
const CAP=[
 ['マツダスタジアム',33000,/マツダスタジアム|MAZDA Zoom-Zoom/i],
 ['エディオンピースウイング広島',28520,/エディオンピースウイング|Eピース/i],
 ['広島グリーンアリーナ',10000,/広島グリーンアリーナ|県立総合体育館/i],
 ['広島サンプラザホール',6000,/広島サンプラザ/i],
 ['広島文化学園HBGホール',2001,/HBGホール|広島文化学園/i],
 ['上野学園ホール',1730,/上野学園ホール|県立文化芸術ホール/i],
 ['広島国際会議場 フェニックスホール',1504,/フェニックスホール|広島国際会議場/i],
 ['JMSアステールプラザ',1204,/JMSアステール|アステールプラザ/i],
 ['BLUE LIVE HIROSHIMA',830,/BLUE LIVE HIROSHIMA/i],
 ['広島クラブクアトロ',800,/広島クラブクアトロ|CLUB QUATTRO/i],
 ['LIVE VANQUISH',450,/LIVE VANQUISH/i],
 ['セカンド・クラッチ',300,/セカンド.?クラッチ|SECOND CRUTCH/i],
];
function venueInfo(s=''){
  for(const [name,capacity,re] of CAP) if(re.test(s)) return {name,capacity};
  let m=norm(s).match(/(?:会場|開催場所|場所)[:：]?\s*([^。|｜]{2,70})/);
  return {name:m?m[1].trim():null,capacity:null};
}
function inHiroshimaCity(s=''){
  s=norm(s);
  if(/東広島市|廿日市市|呉市|福山市|三原市|尾道市|三次市|庄原市|江田島市|大竹市|安芸高田市/.test(s)) return false;
  return /広島市|中区|南区|西区|東区|安芸区|安佐南区|安佐北区|佐伯区|フェニックスホール|グリーンアリーナ|ピースウイング|マツダスタジアム|サンプラザ|HBGホール|上野学園ホール|アステールプラザ|BLUE LIVE|クラブクアトロ|VANQUISH|セカンド.?クラッチ/.test(s);
}
function typeOf(s=''){
  s=norm(s);
  if(/学会|会議|シンポジ|カンファレンス|フォーラム|研究会|講演会/.test(s)) return 'convention';
  if(/野球|サッカー|バスケ|バレー|試合|プロレス|格闘技|スポーツ|マラソン/.test(s)) return 'sports';
  if(/祭|フェス|花火|パレード|フード/.test(s)) return 'festival';
  if(/演劇|舞台|ミュージカル|落語|お笑い|新喜劇/.test(s)) return 'theater';
  if(/コンサート|ライブ|LIVE|音楽|演奏会|リサイタル|オーケストラ|歌|ツアー/.test(s)) return 'music';
  return 'event';
}
function key(e){return [e.date||'',norm(e.venue||''),norm(e.name||'').replace(/[\s「」『』【】()（）・!！?？:：,，.。\-ー〜～]/g,'').slice(0,80)].join('|')}
function merge(events){
  const out=[],map=new Map();
  for(const e of events){
    if(!e?.date||!e?.name||!inHiroshimaCity((e.venue||'')+' '+(e.address||'')+' '+(e.source_text||''))) continue;
    const k=key(e),i=map.get(k);
    if(i==null){map.set(k,out.length);out.push({...e,sources:[e.source],source_urls:[e.source_url].filter(Boolean),verification_count:1});continue}
    const x=out[i]; const ss=[...new Set([...(x.sources||[]),e.source].filter(Boolean))];
    out[i]={...x,...e,
      start_time:e.start_time||x.start_time||null,end_time:e.end_time||x.end_time||null,
      people:Math.max(Number(x.people||0),Number(e.people||0))||null,
      people_basis:Number(e.people||0)>=Number(x.people||0)?(e.people_basis||x.people_basis):(x.people_basis||e.people_basis),
      sources:ss,source_urls:[...new Set([...(x.source_urls||[]),e.source_url].filter(Boolean))],verification_count:ss.length
    };
  }
  return out;
}
async function fetchText(url,timeout=20000){
  const ac=new AbortController(); const timer=setTimeout(()=>ac.abort(),timeout);
  try{
    const r=await fetch(url,{signal:ac.signal,redirect:'follow',headers:{'user-agent':USER_AGENT,'accept':'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8','accept-language':'ja,en;q=0.8'}});
    const text=await r.text();
    if(!r.ok) throw new Error('HTTP '+r.status);
    if(text.length<200) throw new Error('short response '+text.length);
    return text;
  }finally{clearTimeout(timer)}
}
function eventBase({name,date,venue,source,url,text,kind,start,end,people,people_basis,end_date,address}){
  const vi=venueInfo(venue||text||'');
  return {date,end_date:end_date||date,name:norm(name),venue:vi.name||norm(venue),address:address||null,
    start_time:start||startTime(text),end_time:end||endTime(text),event_type:kind||typeOf(name+' '+text),
    people:people||statedPeople(text)||vi.capacity||null,
    people_basis:people_basis||(statedPeople(text)?'official_stated':vi.capacity?'venue_capacity_reference':null),
    source,source_url:url,source_text:norm(text).slice(0,500)};
}

async function sourceICCH(){
  const url='https://www.pcf.city.hiroshima.jp/icch/event.cgi'; const html=await fetchText(url); const events=[];
  const rows=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  for(const row of rows){
    const cells=[...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>norm(x[1]));
    if(cells.length<7)continue; const day=Number(cells[0]); if(!day)continue;
    const prefix=html.slice(Math.max(0,(row.index||0)-14000),row.index||0);
    const marks=[...prefix.matchAll(/令和\s*(\d+)年\s*(\d{1,2})月のイベント/g)]; const mk=marks.at(-1); if(!mk)continue;
    const date=ymd(2018+Number(mk[1]),Number(mk[2]),day);
    events.push(eventBase({name:cells[2],date,venue:'広島国際会議場 フェニックスホール',source:'広島国際会議場公式',url,
      text:cells.join(' '),start:(cells[5].match(/([0-2]?\d:[0-5]\d)/)||[])[1]||null,end:(cells[6].match(/([0-2]?\d:[0-5]\d)/)||[])[1]||null}));
  }
  return events;
}
async function sourceCandy(){
  const url='https://www.candy-p.com/schedule/'; const html=await fetchText(url); const text=norm(html); const events=[];
  const dates=[...text.matchAll(/(20\d{2})\/(\d{2})\/(\d{2})/g)];
  for(let i=0;i<dates.length;i++){const m=dates[i],st=m.index||0,en=i+1<dates.length?(dates[i+1].index||text.length):Math.min(text.length,st+700),seg=text.slice(st,en);const vi=venueInfo(seg);if(!vi.name)continue;
    const before=text.slice(Math.max(0,st-180),st);let name=before.split(/SOLD OUT|発売中|詳細/).pop().trim(); if(name.length>120)name=name.slice(-120);
    events.push(eventBase({name,date:ymd(m[1],m[2],m[3]),venue:vi.name,source:'CANDY PROMOTION',url,text:seg}));
  } return events;
}
async function sourceEplus(){
  const urls=[
    'https://eplus.jp/sf/live/chugoku-shikoku/hiroshima',
    'https://eplus.jp/sf/play/chugoku-shikoku/hiroshima',
    'https://eplus.jp/sf/sports/chugoku-shikoku/hiroshima',
    'https://eplus.jp/sf/event/chugoku-shikoku/hiroshima',
    'https://eplus.jp/sf/anime/chugoku-shikoku/hiroshima'
  ]; const events=[];
  for(const url of urls){const html=await fetchText(url);const text=norm(html);const dates=[...text.matchAll(/(20\d{2})\/(\d{1,2})\/(\d{1,2})\([^)]+\)/g)];
    for(let i=0;i<dates.length;i++){const m=dates[i],st=m.index||0,en=i+1<dates.length?(dates[i+1].index||text.length):Math.min(text.length,st+800),seg=text.slice(st,en);if(!/広島県/.test(seg))continue;const vi=venueInfo(seg);if(!vi.name)continue;
      let name=seg.slice(m[0].length).split(/開演|開場|会場|\(広島県\)/)[0].replace(/先着|抽選|受付中|受付終了|予定枚数終了/g,' ').trim();if(!name)continue;
      events.push(eventBase({name,date:ymd(m[1],m[2],m[3]),venue:vi.name,source:'イープラス',url,text:seg}));}
  } return events;
}
async function sourceLawson(){
  const url='https://l-tike.com/search/?pref=34&size=100'; const html=await fetchText(url); const text=norm(html); const events=[];
  const re=/(コンサート|演劇・ステージ・舞台|クラシック・オペラ|スポーツ|イベント)\s+(.{2,150}?)\s+公演日[:：]\s*(20\d{2})\/(\d{1,2})\/(\d{1,2})[\s\S]{0,220}?会場[:：]\s*([^（(]{2,100})(?:（広島県\)|\(広島県\))/g;
  for(const m of text.matchAll(re)){const venue=norm(m[6]);if(!inHiroshimaCity(venue))continue;events.push(eventBase({name:m[2],date:ymd(m[3],m[4],m[5]),venue,source:'ローチケ',url,text:m[0]}));}
  return events;
}
async function sourceDive(){
  const list='https://dive-hiroshima.com/events/'; const html=await fetchText(list); const links=[...html.matchAll(/href=["']([^"']*\/events\/events-[^"'?#]+\/?)[^"']*["']/gi)].map(m=>new URL(m[1],list).href); const uniq=[...new Set(links)].slice(0,50);const events=[];
  for(const url of uniq){let page;try{page=await fetchText(url)}catch{continue} const full=norm(page); const h1=norm((page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)||[])[1]||'');if(!h1)continue;
    const i=full.indexOf('INFORMATION');const info=i>=0?full.slice(i,Math.min(full.length,i+2600)):full;
    const period=(info.match(/開催期間\s*[:：]?\s*([\s\S]{1,180}?)(?=開催時間|開催場所|対象者|料金|住所|Webサイト|主催|$)/)||[])[1]||'';
    const venue=(info.match(/開催場所\s*[:：]?\s*([\s\S]{1,140}?)(?=対象者|料金|住所|Webサイト|主催|$)/)||[])[1]||'';
    const address=(info.match(/住所\s*[:：]?\s*([\s\S]{1,120}?)(?=Webサイト|主催|お問い合わせ|$)/)||[])[1]||'';
    const d=dateFrom(period,new Date().getFullYear());if(!d||!inHiroshimaCity(venue+' '+address))continue;
    const passive=/展示|展覧会|美術館|水族館|ライトアップ|イルミネーション|企画展|特別展/.test(h1);
    const people=statedPeople(full); if(passive&&!people)continue;
    events.push(eventBase({name:h1,date:d,end_date:endDateFrom(period,Number(d.slice(0,4)))||d,venue,source:'Dive! Hiroshima',url,text:info,people,people_basis:people?'official_stated':null,address:norm(address)}));
  } return events;
}
async function sourceCVB(){
  const url='https://www.hiroshimacvb.jp/calendar/'; const html=await fetchText(url); const events=[]; const rows=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  for(const row of rows){const cells=[...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>norm(x[1]));if(cells.length<4)continue;
    const [name,venue,period,domesticRaw,overseasRaw]=cells;const d=dateFrom(period,new Date().getFullYear());if(!d||!inHiroshimaCity(venue))continue;
    const domestic=int(domesticRaw)||0,overseas=int(overseasRaw)||0,people=domestic+overseas;if(people<100)continue;
    events.push(eventBase({name,date:d,end_date:endDateFrom(period,Number(d.slice(0,4)))||d,venue,source:'広島観光コンベンションビューロー',url,text:cells.join(' '),kind:'convention',people,people_basis:'official_participants'}));}
  return events;
}
async function sourceSports(){
  const events=[];
  const specs=[
    ['サンフレッチェ広島公式','https://www.sanfrecce.co.jp/tickets/schedule','エディオンピースウイング広島',/(\d{1,2})\.(\d{1,2})\s*\[[^\]]+\]\s*([0-2]?\d:[0-5]\d)\s*K\.O\.\s+([\s\S]{1,80}?)(?=\s+[☆★]|\s+販売|\s+\d{1,2}\/\d{1,2}|$)/g,'soccer'],
    ['広島サンダーズ公式','https://www.hiroshima-thunders.com/game/score/2026/index.html',null,/(\d{1,2})\s+(\d{1,2})\s+(?:MON|TUE|WED|THU|FRI|SAT|SUN)\s+([0-2]?\d:[0-5]\d)\s+試合開始[\s\S]{0,80}?広島サンダーズ\s+VS\s+(?:Image:\s*)?([^\s][\s\S]{1,30}?)\s+会場\s+([^（(]{2,60})\s*(?:（広島）|\(広島\))/g,'volleyball']
  ];
  const now=new Date();const year=now.getFullYear();
  for(const [source,url,fixedVenue,re,kind] of specs){const text=norm(await fetchText(url));for(const m of text.matchAll(re)){let mo=Number(m[1]),day=Number(m[2]),venue=fixedVenue,opponent,start;if(kind==='soccer'){start=m[3];opponent=m[4]}else{start=m[3];opponent=m[4];venue=m[5]}if(!inHiroshimaCity(venue))continue;events.push(eventBase({name:(kind==='soccer'?'サンフレッチェ広島':'広島サンダーズ')+' vs '+norm(opponent),date:ymd(year,mo,day),venue,source,url,text:m[0],kind:'sports',start}));}}
  return events;
}
const SOURCES=[
  ['icch',sourceICCH],['candy',sourceCandy],['eplus',sourceEplus],['lawson',sourceLawson],
  ['dive',sourceDive],['cvb',sourceCVB],['sports',sourceSports]
];
async function main(){
  const today=jstDate(),cutoff=addDays(today,120),all=[],health={};
  for(const [id,fn] of SOURCES){const started=Date.now();try{const rows=await fn();all.push(...rows);health[id]={ok:true,count:rows.length,ms:Date.now()-started};}catch(e){health[id]={ok:false,count:null,ms:Date.now()-started,error:String(e?.message||e).slice(0,240)};}}
  const merged=merge(all).filter(e=>e.date>=today&&e.date<=cutoff).sort((a,b)=>a.date.localeCompare(b.date)||(Number(b.people||0)-Number(a.people||0))||String(a.start_time||'99:99').localeCompare(String(b.start_time||'99:99')));
  const payload={ok:true,generated_at:new Date().toISOString(),area:'広島市',coverage:{from:today,to:cutoff},purpose:'taxi_driver_demand_facts',source_health:health,
    rules:{convention_min_people:100,display_principle:'需要を断定せず、日付・時刻・会場・人数規模・何の集まりかを判断材料として保持する',failure_policy:'取得失敗と0件を分離する'},
    counts:{raw:all.length,merged:merged.length},events:merged.map(({source_text,...e})=>e)};
  await fs.mkdir('sales-nav-prototype/data',{recursive:true});await fs.writeFile(OUT,JSON.stringify(payload,null,2)+'\n');
  console.log(JSON.stringify({health,counts:payload.counts,first:payload.events.slice(0,12).map(x=>({date:x.date,name:x.name,venue:x.venue,people:x.people,source:x.source}))},null,2));
  if(Object.values(health).every(x=>!x.ok)) process.exitCode=2;
}
main().catch(e=>{console.error(e);process.exit(1)});