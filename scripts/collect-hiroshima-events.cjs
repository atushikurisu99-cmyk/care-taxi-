const fs = require('node:fs/promises');

const TZ='Asia/Tokyo';
const OUT='sales-nav-prototype/data/hiroshima-demand-events.json';
const STATUS_OUT='sales-nav-prototype/data/hiroshima-demand-source-status.json';
const DEBUG_DIR='tmp/event-source-debug';
async function saveDebug(name,content){
  try{await fs.mkdir(DEBUG_DIR,{recursive:true});await fs.writeFile(DEBUG_DIR+'/'+name,String(content||'').slice(0,300000));}catch{}
}
const USER_AGENT='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36 taxi-sales-nav-collector/1.0';
let browser=null;
async function browserHtml(url){
  if(!browser){
    const {chromium}=require('playwright');
    browser=await chromium.launch({headless:true});
  }
  const page=await browser.newPage({userAgent:USER_AGENT,locale:'ja-JP'});
  try{
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForTimeout(3500);
    return await page.content();
  } finally { await page.close(); }
}
async function closeBrowser(){ if(browser){await browser.close();browser=null;} }

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
  m=s.match(/(\d{1,2})月\s*(\d{1,2})日/); if(m&&fallbackYear)return ymd(fallbackYear,m[1],m[2]);
  return null;
}
function endDateFrom(s='',fallbackYear){
  s=norm(s);
  const a=[...s.matchAll(/(20\d{2})年\s*(\d{1,2})月\s*(\d{1,2})日/g)]; if(a.length>1){const m=a.at(-1);return ymd(m[1],m[2],m[3])}
  let m=s.match(/(\d{1,2})[\/.](\d{1,2})\D{0,10}(?:-|〜|～|~|→)\D{0,10}(\d{1,2})[\/.](\d{1,2})/); if(m&&fallbackYear)return ymd(fallbackYear,m[3],m[4]);
  const jp=[...s.matchAll(/(\d{1,2})月\s*(\d{1,2})日/g)];
  if(jp.length>=2&&fallbackYear){const z=jp.at(-1);return ymd(fallbackYear,z[1],z[2]);}
  m=s.match(/(\d{1,2})月\s*(\d{1,2})日\D{0,10}(?:-|〜|～|~|→)\D{0,10}(\d{1,2})日/);
  if(m&&fallbackYear)return ymd(fallbackYear,m[1],m[3]);
  return null;
}
function startTime(s=''){const m=norm(s).match(/(?:開演|開始|試合開始|START)\D{0,12}([0-2]?\d:[0-5]\d)/i)||norm(s).match(/([0-2]?\d:[0-5]\d)\s*(?:開演|開始)/);return m?m[1].padStart(5,'0'):null}
function endTime(s=''){const m=norm(s).match(/(?:終演|終了)\D{0,12}([0-2]?\d:[0-5]\d)/i)||norm(s).match(/([0-2]?\d:[0-5]\d)\s*(?:終演|終了)/);return m?m[1].padStart(5,'0'):null}
function statedPeople(s=''){
  s=norm(s);
  let m=s.match(/(?:来場|参加|観客|入場|動員|延べ|先着|定員|募集人数|参加予定|参加見込)\D{0,50}約?\s*(\d+(?:\.\d+)?)\s*万人/); if(m)return Math.round(Number(m[1])*10000);
  m=s.match(/(?:来場者|参加者|観客|入場者|動員数|延べ|先着|定員|募集人数|参加予定|参加見込)\D{0,50}約?\s*([\d,]{2,})\s*(?:人|名|席)/); if(m)return int(m[1]);
  return null;
}
function officialPeopleFromText(s=''){
  const t=norm(s);
  // AXIES and similar plans sometimes split one expected total into several categories.
  let m=t.match(/参加者数見込み?\D{0,120}/);
  if(m){
    const nums=[...m[0].matchAll(/([\d,]{2,})\s*名/g)].map(x=>int(x[1])).filter(Boolean);
    if(nums.length>=2) return {people:nums.reduce((a,b)=>a+b,0),basis:'official_expected_participants'};
  }
  // When official registration explicitly says venue capacity has been reached,
  // the published capacity is a valid in-person count proxy.
  if(/定員|capacity/i.test(t) && /満席|定員に達|reached capacity|registration.*closed/i.test(t)){
    const cap=t.match(/(?:maximum capacity|定員|capacity)\D{0,30}([\d,]{3,})/i);
    if(cap) return {people:int(cap[1]),basis:'official_registration_capacity_reached'};
  }
  const p=statedPeople(t);
  return p?{people:p,basis:'official_stated'}:{people:null,basis:null};
}
const CAP=[
 ['マツダスタジアム',33000,/マツダスタジアム|MAZDA Zoom-Zoom/i],
 ['エディオンピースウイング広島',28520,/エディオンピースウイング|Eピース/i],
 ['広島グリーンアリーナ',10000,/広島グリーンアリーナ|県立総合体育館/i],
 ['広島サンプラザホール',6000,/広島サンプラザ/i],
 ['広島文化学園HBGホール',2001,/HBGホール|広島文化学園/i],
 ['上野学園ホール',1730,/上野学園ホール|県立文化芸術ホール/i],
 ['広島国際会議場 フェニックスホール',1504,/フェニックスホール/i],
 ['JMSアステールプラザ',1204,/JMSアステール|アステールプラザ/i],
 ['BLUE LIVE HIROSHIMA',830,/BLUE\s*LIVE(?:\s*HIROSHIMA|\s*広島)/i],
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
  return /広島市|中区|南区|西区|東区|安芸区|安佐南区|安佐北区|佐伯区|広島国際会議場|広島コンベンションホール|リーガロイヤルホテル広島|ヒルトン広島|ホテルグランヴィア広島|グランドプリンスホテル広島|広島大学霞キャンパス|広島大学東千田キャンパス|広仁会館|広島県医師会館|広島県民文化センター|フェニックスホール|グリーンアリーナ|ピースウイング|マツダスタジアム|サンプラザ|HBGホール|上野学園ホール|アステールプラザ|BLUE LIVE|クラブクアトロ|VANQUISH|セカンド.?クラッチ/.test(s);
}
function typeOf(s=''){
  s=norm(s);
  if(/学会|学術大会|年次大会|会議|シンポジ|カンファレンス|フォーラム|研究会|講演会/.test(s)) return 'convention';
  if(/野球|サッカー|バスケ|バレー|試合|プロレス|格闘技|スポーツ|マラソン/.test(s)) return 'sports';
  if(/祭|フェス|花火|パレード|フード/.test(s)) return 'festival';
  if(/演劇|舞台|ミュージカル|落語|独演会|お笑い|新喜劇|PARCO PRODUCE/.test(s)) return 'theater';
  if(/コンサート|ライブ|LIVE|音楽|演奏会|リサイタル|オーケストラ|歌|ツアー/.test(s)) return 'music';
  return 'event';
}
function key(e){return [e.date||'',norm(e.venue||''),norm(e.name||'').replace(/[\s「」『』【】()（）・!！?？:：,，.。\-ー〜～]/g,'').slice(0,80)].join('|')}
function merge(events){
  const out=[];
  const nkey=s=>norm(s||'').toLowerCase().replace(/[\s「」『』【】()（）・!！?？:：,，.。\-ー〜～]/g,'');
  for(const e of events){
    if(!e?.date||!e?.name||!inHiroshimaCity((e.venue||'')+' '+(e.address||'')+' '+(e.source_text||''))) continue;
    e.name=String(e.name)
      .replace(/^▼\s*/,'')
      .replace(/^▽\s*/,'')
      .replace(/^(?:販売終了|販売期間中|予定枚数終了|販売停止[^\s]*|発売中|受付中|受付終了)\s*/,'')
      .replace(/^(?:一般発売|先行|プリセール|プレリザーブ|抽選)(?:[^／/]{0,80})?[／/]\s*/,'')
      .trim();
    if(!e.name) continue;
    const en=nkey(e.name),ev=nkey(e.venue);
    const i=out.findIndex(x=>{
      if(String(x.date)!==String(e.date))return false;
      const xv=nkey(x.venue);
      const icchAlias=(xv===nkey('広島国際会議場')&&ev===nkey('広島国際会議場 フェニックスホール'))||
                      (ev===nkey('広島国際会議場')&&xv===nkey('広島国際会議場 フェニックスホール'));
      if(xv!==ev&&!icchAlias)return false;
      const xn=nkey(x.name);
      if(xn===en || (xn.length>=3&&en.length>=3&&(xn.includes(en)||en.includes(xn)))) return true;
      return !!(x.start_time&&e.start_time&&x.start_time===e.start_time&&x.event_type===e.event_type);
    });
    if(i<0){out.push({...e,sources:[e.source],source_urls:[e.source_url].filter(Boolean),verification_count:1});continue}
    const x=out[i]; const ss=[...new Set([...(x.sources||[]),e.source].filter(Boolean))];
    const preferName=String(e.name||'').length>String(x.name||'').length?e.name:x.name;
    const preferVenue=/フェニックスホール/.test(String(e.venue||''))?e.venue:(/フェニックスホール/.test(String(x.venue||''))?x.venue:(e.venue||x.venue));
    const inferred=typeOf(preferName);
    const specificType=[inferred,e.event_type,x.event_type].find(t=>t&&t!=='event')||'event';
    out[i]={...x,...e,name:preferName,venue:preferVenue,event_type:specificType,
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
    const buf=Buffer.from(await r.arrayBuffer());
    if(!r.ok) throw new Error('HTTP '+r.status);
    if(buf.length<200) throw new Error('short response '+buf.length);
    const ct=String(r.headers.get('content-type')||'').toLowerCase();
    let charset=(ct.match(/charset=([^;\s]+)/)||[])[1]||'';
    const ascii=buf.subarray(0,4000).toString('latin1');
    if(!charset) charset=(ascii.match(/charset=["']?([^"'\s/>;]+)/i)||[])[1]||'';
    charset=charset.toLowerCase().replace(/["']/g,'');
    if(/shift.?jis|sjis|windows-31j|cp932/.test(charset)||/pcf\.city\.hiroshima\.jp/.test(url)){
      return new TextDecoder('shift_jis').decode(buf);
    }
    return new TextDecoder('utf-8').decode(buf);
  }finally{clearTimeout(timer)}
}
async function fetchTextBrowserFallback(url,timeout=20000){
  try{return await fetchText(url,timeout)}catch(e){
    const html=await browserHtml(url);
    if(!html||html.length<200) throw e;
    return html;
  }
}
function eventBase({name,date,venue,source,url,text,kind,start,end,people,people_basis,end_date,address}){
  const vi=venueInfo(venue||text||'');
  return {date,end_date:end_date||date,name:norm(name),venue:vi.name||norm(venue),address:address||null,
    start_time:start||startTime(text),end_time:end||endTime(text),event_type:kind||typeOf(name),
    people:people||statedPeople(text)||vi.capacity||null,
    people_basis:people_basis||(statedPeople(text)?'official_stated':vi.capacity?'venue_capacity_reference':null),
    source,source_url:url,source_text:norm(text).slice(0,500)};
}

async function sourceICCH(){
  const url='https://www.pcf.city.hiroshima.jp/icch/event.cgi'; let html=await fetchText(url); let events=[];
  const rows=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  for(const row of rows){
    const cells=[...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>norm(x[1]));
    if(cells.length<7)continue; const day=Number(cells[0]); if(!day)continue;
    const prefix=html.slice(Math.max(0,(row.index||0)-14000),row.index||0);
    const marks=[...prefix.matchAll(/令和\s*(\d+)年\s*(\d{1,2})月のイベント/g)]; const mk=marks.at(-1); if(!mk)continue;
    const date=ymd(2018+Number(mk[1]),Number(mk[2]),day);
    events.push(eventBase({name:cells[2],date,venue:'広島国際会議場',source:'広島国際会議場公式',url,
      text:cells.join(' '),start:(cells[5].match(/([0-2]?\d:[0-5]\d)/)||[])[1]||null,end:(cells[6].match(/([0-2]?\d:[0-5]\d)/)||[])[1]||null}));
  }
  if(!events.length){
    try{
      html=await browserHtml(url);
      const rows2=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
      for(const row of rows2){
        const cells=[...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>norm(x[1]));
        if(cells.length<7)continue; const day=Number(cells[0]); if(!day)continue;
        const prefix=html.slice(Math.max(0,(row.index||0)-14000),row.index||0);
        const marks=[...prefix.matchAll(/令和\s*(\d+)年\s*(\d{1,2})月のイベント/g)]; const mk=marks.at(-1); if(!mk)continue;
        const date=ymd(2018+Number(mk[1]),Number(mk[2]),day);
        events.push(eventBase({name:cells[2],date,venue:'広島国際会議場',source:'広島国際会議場公式',url,text:cells.join(' '),
          start:(cells[5].match(/([0-2]?\d:[0-5]\d)/)||[])[1]||null,end:(cells[6].match(/([0-2]?\d:[0-5]\d)/)||[])[1]||null}));
      }
    }catch{}
  }
  return events;
}
async function sourceCandy(){
  const url='https://www.candy-p.com/schedule/'; const html=await fetchText(url); const events=[];
  const sections=[...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3[^>]*>|$)/gi)];
  for(const sec of sections){
    let artist=norm(sec[1]).replace(/^▼\s*/,'').trim(); if(!artist)continue;
    const body=norm(sec[2]);
    const re=/(20\d{2})\/(\d{2})\/(\d{2})[^0-9]{0,24}?([^0-9]{2,120}?)\s+([0-2]\d:[0-5]\d)\s*\/\s*([0-2]\d:[0-5]\d)/g;
    for(const m of body.matchAll(re)){
      const vi=venueInfo(m[4]); if(!vi.name)continue;
      events.push(eventBase({name:artist,date:ymd(m[1],m[2],m[3]),venue:vi.name,source:'CANDY PROMOTION',url,text:m[0],kind:(/PARCO|劇|舞台|ミュージカル|落語|お笑い|新喜劇/.test(artist)?'theater':'music'),start:m[6]}));
    }
  }
  return events;
}
async function sourceEplus(){
  const urls=[
    ['live','music','https://eplus.jp/sf/live/chugoku-shikoku/hiroshima'],
    ['play','theater','https://eplus.jp/sf/play/chugoku-shikoku/hiroshima'],
    ['sports','sports','https://eplus.jp/sf/sports/chugoku-shikoku/hiroshima'],
    ['event','event','https://eplus.jp/sf/event/chugoku-shikoku/hiroshima'],
    ['anime','music','https://eplus.jp/sf/anime/chugoku-shikoku/hiroshima']
  ];
  const events=[];
  for(const [id,kind,url] of urls){
    let html='';
    try{ html=await fetchTextBrowserFallback(url,22000); }
    catch(e){ await saveDebug('eplus-'+id+'-error.txt',String(e?.message||e)); continue; }
    const text=norm(html);
    await saveDebug('eplus-'+id+'.txt',text);

    // Eplus currently prints dates with optional whitespace after slash:
    // "2026/ 10/17(土)" and ranges such as "2026/ 9/19(土) 2026/ 10/12(月・祝)".
    const dates=[...text.matchAll(/(20\d{2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\([^)]+\)/g)];
    for(let i=0;i<dates.length;i++){
      const m=dates[i];
      const st=(m.index||0)+m[0].length;
      const en=i+1<dates.length?(dates[i+1].index||text.length):Math.min(text.length,st+900);
      let seg=text.slice(st,en).replace(/^\s*(?:先着|抽選|一般発売|受付中)\s*/,'').trim();
      const prefCandidates=[seg.indexOf('(広島県)'),seg.indexOf('（広島県）')].filter(x=>x>=0);
      const prefPos=prefCandidates.length?Math.min(...prefCandidates):-1;
      if(prefPos<0) continue;
      const lead=seg.slice(0,prefPos);

      // Only accept a venue token that appears inside this event's own
      // "title + venue(広島県)" block. Never borrow a venue from the next event.
      const venueHits=[];
      for(const [vn,capacity,re] of CAP){
        const mm=lead.match(re);
        if(mm) venueHits.push({name:vn,capacity,pos:lead.indexOf(mm[0]),matched:mm[0]});
      }
      venueHits.sort((a,b)=>a.pos-b.pos);
      const vh=venueHits[0];
      if(!vh||vh.pos<0) continue;

      let head=lead.slice(0,vh.pos);
      let name=head
        .replace(/^(?:先着|抽選|一般発売|受付中|受付終了|予定枚数終了)\s*/g,'')
        .replace(/\s+(?:先着|抽選|受付中|受付終了|予定枚数終了).*$/g,'')
        .trim();
      if(!name || name.length>160) continue;

      const sm=seg.match(/(?:開演|開始|上映開始)\s*[:：]\s*([0-2]?\d:[0-5]\d)/);
      const em=seg.match(/(?:終演|終了)\s*[:：]\s*([0-2]?\d:[0-5]\d)/);
      events.push(eventBase({
        name,date:ymd(m[1],m[2],m[3]),venue:vh.name,source:'イープラス',url,text:seg,
        kind,start:sm?.[1]||null,end:em?.[1]||null
      }));
    }
  }
  return events;
}
async function sourceLawson(){
  // The main l-tike host intermittently fails over HTTP/2 in GitHub Actions.
  // cdn.l-tike.com serves the same search results as static HTML and is stable
  // enough for scheduled collection.
  const urls=[
    'https://cdn.l-tike.com/search/?pref=34&size=100',
    'https://cdn.l-tike.com/search/?pref=34&tig=100&size=100'
  ];
  const events=[];
  for(const url of urls){
    const html=await fetchText(url,25000);
    const text=norm(html);
    await saveDebug('lawson-'+(url.includes('tig=100')?'concert':'all')+'.txt',text);

    // Example:
    // コンサート キュウソネコカミ 公演日：2026/10/16(金)
    // 会場：ＬＩＶＥ ＶＡＮＱＵＩＳＨ（広島県）
    const blocks=[...text.matchAll(/(コンサート|演劇・ステージ・舞台|クラシック・オペラ|スポーツ|イベント)\s+([\s\S]{2,180}?)\s+公演日[:：]\s*(20\d{2})\/(\d{1,2})\/(\d{1,2})\([^)]+\)[\s\S]{0,260}?会場[:：]\s*([^（(]{2,120})(?:（広島県\)|\(広島県\))/g)];
    for(const m of blocks){
      const category=m[1],name=norm(m[2]).replace(/^(?:先着|抽選|一般発売)\s*/,'').trim();
      const rawVenue=norm(m[6]);
      if(!name||!rawVenue) continue;
      if(name.length>120||/公演日[:：]|会場[:：]|販売方法|申込\/詳細/.test(name)) continue;
      const vi=venueInfo(rawVenue);
      const venue=vi.name||rawVenue;
      if(!inHiroshimaCity(venue)) continue;
      const kind=category==='スポーツ'?'sports':
                 /演劇|舞台|クラシック|オペラ/.test(category)?'theater':
                 category==='コンサート'?'music':'event';
      events.push(eventBase({
        name,date:ymd(m[3],m[4],m[5]),venue,source:'ローチケ',url,text:m[0],kind
      }));
    }
  }
  return merge(events);
}
async function sourceWorkerEvents(){
  const url='https://taxi-jr-higashima-proxy.atushi-works.workers.dev/api/events/hiroshima?collector='+Date.now();
  const raw=await fetchText(url,25000);
  const d=JSON.parse(raw);
  if(d?.ok!==true||!Array.isArray(d.events)) throw new Error('invalid worker event feed');
  return d.events.map(e=>eventBase({
    name:e.display_name||e.name||e.title,
    date:e.date,
    venue:e.venue,
    source:'会場・プレイガイド統合Worker',
    url:e.source_url||url,
    text:[e.name,e.title,e.venue,e.event_type].filter(Boolean).join(' '),
    kind:e.event_type||null,
    start:e.start_time||null,
    end:e.end_time||e.end_time_estimate||null
  })).filter(e=>e.name&&e.date&&e.venue);
}

async function sourcePia(){
  // PIA venue pages load ticket rows from /pia/rlsInfo.do.
  // Query that endpoint directly instead of relying on browser-side Ajax.
  const venues=[
    ['広島サンプラザホール','HSSP'],
    ['広島文化学園HBGホール','HRBG'],
    ['JMSアステールプラザ','ASTP'],
    ['広島クラブクアトロ','CQUH'],
    ['LIVE VANQUISH','LVQS'],
    ['BLUE LIVE HIROSHIMA','BLIV'],
    ['広島国際会議場 フェニックスホール','HRKK'],
    ['上野学園ホール','HBGH'],
    ['広島グリーンアリーナ','HSG1']
  ];
  const events=[];
  for(const [fallbackVenue,code] of venues){
    const endpoints=[
      'https://t.pia.jp/pia/rlsInfo.do?page=1&venueCd='+encodeURIComponent(code)+'&includeSaleEnd=fuzzy',
      'https://ticket-search.pia.jp/pia/rlsInfo.do?page=1&venueCd='+encodeURIComponent(code)+'&includeSaleEnd=fuzzy'
    ];
    let text='';
    let usedUrl='';
    for(const url of endpoints){
      try{
        const html=await fetchText(url,20000);
        const candidate=norm(html);
        await saveDebug('pia-rls-'+code+'.txt',candidate);
        if(candidate.length>80 && !/エラー|Error|Not Found/i.test(candidate)){
          text=candidate; usedUrl=url; break;
        }
      }catch{}
    }
    if(!text) continue;

    const re=/／\s*([^／]{2,180}?)\s+(20\d{2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\([^)]+\)\s+([^()]{2,140}?)\s*\(広島県\)/g;
    for(const m of text.matchAll(re)){
      let name=norm(m[1])
        .replace(/^(?:販売終了|販売期間中|予定枚数終了|発売前|発売中|受付中|受付終了)\s*/,'')
        .replace(/^(?:一般発売|先行|プリセール|プレリザーブ|抽選)(?:[^／]{0,100}?)?[／/]\s*/,'')
        .replace(/^(?:一般発売|先行|プリセール|プレリザーブ|抽選)\s*/,'')
        .trim();
      if(!name) continue;
      const rawVenue=norm(m[5]);
      const vi=venueInfo(rawVenue);
      const venue=vi.name||fallbackVenue;
      if(!inHiroshimaCity(venue)) continue;
      events.push(eventBase({
        name,date:ymd(m[2],m[3],m[4]),venue,source:'チケットぴあ',url:usedUrl,text:m[0]
      }));
    }

    // Ajax response may omit the "／" prefix; accept compact ticket rows too.
    const compact=/(?:一般発売|先行|プリセール|プレリザーブ|抽選)\s+([^\d]{2,160}?)\s+(20\d{2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*\([^)]+\)\s+([^()]{2,140}?)\s*\(広島県\)/g;
    for(const m of text.matchAll(compact)){
      const name=norm(m[1])
        .replace(/^(?:販売終了|販売期間中|予定枚数終了|発売前|発売中|受付中|受付終了)\s*/,'')
        .replace(/^(?:一般発売|先行|プリセール|プレリザーブ|抽選)(?:[^／]{0,100}?)?[／/]\s*/,'')
        .trim();
      if(!name) continue;
      const vi=venueInfo(norm(m[5]));
      const venue=vi.name||fallbackVenue;
      if(!inHiroshimaCity(venue)) continue;
      events.push(eventBase({
        name,date:ymd(m[2],m[3],m[4]),venue,source:'チケットぴあ',url:usedUrl,text:m[0]
      }));
    }
  }
  return merge(events);
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
  const pageUrl='https://www.hiroshimacvb.jp/calendar/';
  const jsonUrl='https://www.hiroshimacvb.jp/calendar/calendar.json?_='+Date.now();
  const events=[];
  let raw='';
  try{raw=await fetchText(jsonUrl,20000)}catch(e){
    await saveDebug('cvb-json-error.txt',String(e?.message||e));
    return [];
  }
  await saveDebug('cvb-calendar.json',raw);

  let data=null;
  try{data=JSON.parse(raw)}catch(e){
    await saveDebug('cvb-json-parse-error.txt',String(e?.message||e)+'\n'+raw.slice(0,2000));
    return [];
  }

  const today=jstDate();
  const currentYear=Number(today.slice(0,4));
  let latestPublishedDate=null;
  for(const [yearKey,months] of Object.entries(data||{})){
    const year=Number(String(yearKey).replace(/^y/i,''));
    if(!Number.isFinite(year)||year<currentYear||year>currentYear+1||!months||typeof months!=='object') continue;

    const seen=new Set();
    for(const [monthKey,rows] of Object.entries(months)){
      if(!Array.isArray(rows)) continue;
      for(const row of rows){
        if(!row||typeof row!=='object') continue;
        const entryId=String(row.entry_id||'');
        const title=norm(row.title||'');
        const venue=norm(row._place||row.place||'');
        const period=norm(row.date_str||'');
        if(!title||!venue||!period) continue;

        const unique=entryId||[title,venue,period].join('|');
        if(seen.has(unique)) continue;
        seen.add(unique);

        if(!inHiroshimaCity(venue)) continue;

        const domestic=int(row.join_jp)||0;
        const overseas=int(row._join)||0;
        const people=domestic+overseas;
        if(people<100) continue;

        const date=dateFrom(period,year);
        if(!date) continue;
        const endDate=endDateFrom(period,year)||date;
        if(!latestPublishedDate||endDate>latestPublishedDate) latestPublishedDate=endDate;
        if(date<today) continue;

        events.push(eventBase({
          name:title,date,end_date:endDate,venue,
          source:'広島観光コンベンションビューロー',url:pageUrl,
          text:[title,venue,period,row.category,row.join_jp,row._join,row.countries].filter(Boolean).join(' '),
          kind:'convention',people,people_basis:'official_participants'
        }));
      }
    }
  }
  // An empty future list is not the same as "there are no conventions".
  // HCVB sometimes publishes only part of the year. Surface that as stale
  // so the collector retains other/previous sources instead of treating 0 as truth.
  if(!events.length && latestPublishedDate && latestPublishedDate<today){
    throw new Error('HCVB calendar has no future data; latest published date='+latestPublishedDate);
  }
  return events;
}
async function sourceConventionOfficialEnrichment(){
  const icch='https://www.pcf.city.hiroshima.jp/icch/event.cgi';
  const html=await fetchText(icch,20000);
  const today=jstDate(),cutoff=addDays(today,120);
  const known={
    '第65回日本鼻科学会総会・学術講演会':['https://www.gakkai.co.jp/jrs65/guide/entry.html'],
    '第69回秋季日本歯周病学会学術大会':['https://web.apollon.nta.co.jp/jspf69/sanka.html'],
    'プラスチック成形加工学会 第34回秋季大会 成形加工シンポジア ’26':['https://pub.confit.atlas.jp/ja/event/jspp2026symp','https://www.jspp.or.jp/kikaku/kikaku_top.html'],
    '応用物理学会 先進パワー半導体分科会第13回講演会':['https://adps13.hiroshima-u.ac.jp/'],
    '大学 ICT 推進協議会 2026 年度年次大会 (AXIES2026)':['https://axies.jp/about/plan/2026%E5%B9%B4%E5%BA%A6%EF%BC%88%E4%BB%A4%E5%92%8C8%E5%B9%B4%E5%BA%A6%EF%BC%89%E4%BA%8B%E6%A5%AD%E8%A8%88%E7%94%BB/','https://axies.jp/conf/axies2026/'],
    '第13回 日本スポーツ理学療法学術大会':['https://www.hpta.or.jp/latest-information/5846']
  };
  const out=[];
  const rows=[...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  for(const row of rows){
    const rawCells=[...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>x[1]);
    const cells=rawCells.map(norm);
    if(cells.length<7) continue;
    const day=Number(cells[0]); if(!day) continue;
    const prefix=html.slice(Math.max(0,(row.index||0)-14000),row.index||0);
    const marks=[...prefix.matchAll(/令和\s*(\d+)年\s*(\d{1,2})月のイベント/g)]; const mk=marks.at(-1); if(!mk) continue;
    const date=ymd(2018+Number(mk[1]),Number(mk[2]),day);
    if(date<today||date>cutoff) continue;
    const name=cells[2]; if(typeOf(name)!=='convention') continue;

    const urls=[...(known[name]||[])];
    const href=(rawCells[2]?.match(/href=["']([^"']+)["']/i)||[])[1];
    if(href){ try{urls.unshift(new URL(href,icch).href)}catch{} }
    const unique=[...new Set(urls)].slice(0,3);
    let best={people:null,basis:null},checked=0;
    for(const url of unique){
      let page=''; try{page=await fetchTextBrowserFallback(url,18000)}catch{continue}
      checked++;
      const r=officialPeopleFromText(page);
      if(Number(r.people||0)>Number(best.people||0)) best=r;
    }
    // Special official facts that are published in stable organizer pages.
    if(/AXIES2026/.test(name)) best={people:1850,basis:'official_expected_participants'};
    out.push(eventBase({
      name,date,venue:'広島国際会議場',source:'主催者公式',url:unique[0]||icch,
      text:name,kind:'convention',
      start:(cells[5].match(/([0-2]?\d:[0-5]\d)/)||[])[1]||null,
      end:(cells[6].match(/([0-2]?\d:[0-5]\d)/)||[])[1]||null,
      people:best.people,people_basis:best.basis
    }));
    out[out.length-1].official_detail_checked=checked;
    out[out.length-1].participants_status=best.people?'published':'not_published_on_checked_sources';
  }
  return out;
}

async function sourceSports(){
  const events=[];
  const today=jstDate();
  const year=Number(today.slice(0,4)),month=Number(today.slice(5,7));

  // Sanfrecce
  {
    const source='サンフレッチェ広島公式',url='https://www.sanfrecce.co.jp/tickets/schedule';
    const text=norm(await fetchText(url));
    const re=/(\d{1,2})\.(\d{1,2})\s*\[[^\]]+\]\s*([0-2]?\d:[0-5]\d)\s*K\.O\.\s+([\s\S]{1,80}?)(?=\s+[☆★]|\s+販売|\s+\d{1,2}\/\d{1,2}|$)/g;
    for(const m of text.matchAll(re)){
      let y=year,mo=Number(m[1]),d=Number(m[2]); if(mo<month-6)y++;
      events.push(eventBase({name:'サンフレッチェ広島 vs '+norm(m[4]),date:ymd(y,mo,d),venue:'エディオンピースウイング広島',source,url,text:m[0],kind:'sports',start:m[3]}));
    }
  }

  // Hiroshima Dragonflies: read list view because it exposes HOME/AWAY, opponent, time and venue together.
  for(let offset=0;offset<4;offset++){
    const dt=new Date(Date.UTC(year,month-1+offset,1)),y=dt.getUTCFullYear(),mo=dt.getUTCMonth()+1;
    const source='広島ドラゴンフライズ公式',url='https://hiroshimadragonflies.com/schedule/list/?month='+mo+'&year='+y;
    let text=''; try{text=norm(await browserHtml(url))}catch{continue}
    const re=/HOME[\s\S]{0,160}?(\d{1,2})\/(\d{1,2})\s*\([^)]+\)\s*([0-2]?\d:[0-5]\d)[\s\S]{0,90}?location_on\s*([\s\S]{2,90}?)(?=\s+(?:Image:|sports_basketball|試合情報|confirmation_number|チケット))/g;
    for(const m of text.matchAll(re)){
      const venue=norm(m[4]).replace(/\s+$/,'');
      if(!inHiroshimaCity(venue))continue;
      const tail=text.slice((m.index||0)+m[0].length,Math.min(text.length,(m.index||0)+m[0].length+100));
      let op=norm((tail.match(/(?:Image:\s*)?([^\s]{1,24})\s+(?:sports_basketball|試合情報|confirmation_number)/)||[])[1]||'');
      if(/^sports_basketball$/i.test(op)) op='';
      const label=op?('広島ドラゴンフライズ vs '+op):'広島ドラゴンフライズ';
      events.push(eventBase({name:label,date:ymd(y,m[1],m[2]),venue,source,url,text:m[0]+' '+tail,kind:'sports',start:m[3]}));
    }
  }

  // Hiroshima Thunders
  {
    const source='広島サンダーズ公式',url='https://www.hiroshima-thunders.com/game/score/2026/index.html';
    const text=norm(await fetchText(url));
    const re=/(\d{1,2})\s+(\d{1,2})\s+(?:MON|TUE|WED|THU|FRI|SAT|SUN)\s+([0-2]?\d:[0-5]\d)\s+試合開始[\s\S]{0,80}?広島サンダーズ\s+VS\s+(?:Image:\s*)?([^\s][\s\S]{1,30}?)\s+会場\s+([^（(]{2,60})\s*(?:（広島）|\(広島\))/g;
    for(const m of text.matchAll(re)){
      let y=year,mo=Number(m[1]); if(mo<month-6)y++;
      const venue=norm(m[5]);if(!inHiroshimaCity(venue))continue;
      events.push(eventBase({name:'広島サンダーズ vs '+norm(m[4]),date:ymd(y,mo,m[2]),venue,source,url,text:m[0],kind:'sports',start:m[3]}));
    }
  }

  // NPB future Hiroshima home games at Mazda Stadium.
  for(let offset=0;offset<2;offset++){
    const dt=new Date(Date.UTC(year,month-1+offset,1)),y=dt.getUTCFullYear(),mo=dt.getUTCMonth()+1;
    const source='NPB',url='https://npb.jp/games/'+y+'/schedule_'+String(mo).padStart(2,'0')+'_detail.html';
    let text='';try{text=norm(await fetchText(url))}catch{continue}
    const days=[...text.matchAll(/(?:^|\s)(\d{1,2})\/(\d{1,2})（[^）]+）/g)];
    for(let i=0;i<days.length;i++){
      const dm=days[i],st=dm.index||0,en=i+1<days.length?(days[i+1].index||text.length):Math.min(text.length,st+1800),seg=text.slice(st,en);
      const re=/広島\s+(?:\d+\s*-\s*\d+|[-－])\s*([^\s]{1,12})\s+マツダスタジアム\s+([0-2]?\d:[0-5]\d)/g;
      for(const m of seg.matchAll(re)){
        events.push(eventBase({name:'広島東洋カープ vs '+norm(m[1]),date:ymd(y,dm[1],dm[2]),venue:'マツダスタジアム',source,url,text:m[0],kind:'sports',start:m[2]}));
      }
    }
  }
  return events;
}
const SOURCES=[
  ['icch',sourceICCH],['candy',sourceCandy],['worker_events',sourceWorkerEvents],['eplus',sourceEplus],['lawson',sourceLawson],['pia',sourcePia],
  ['dive',sourceDive],['cvb',sourceCVB],['convention_official',sourceConventionOfficialEnrichment],['sports',sourceSports]
];
async function main(){
  const today=jstDate(),cutoff=addDays(today,120),all=[],health={};
  let previous=null;
  try{previous=JSON.parse(await fs.readFile(OUT,'utf8'))}catch{previous=null}
  const sourceOnly=String(process.env.EVENT_SOURCE_ONLY||'').trim();
  const activeSources=sourceOnly?SOURCES.filter(([id])=>id===sourceOnly):SOURCES;
  if(sourceOnly&&!activeSources.length) throw new Error('unknown EVENT_SOURCE_ONLY '+sourceOnly);
  const establishedSources=new Set(['icch','candy','worker_events','eplus','lawson','pia','dive','sports','cvb']);
  for(const [id,fn] of activeSources){
    const started=Date.now();
    try{
      const rows=await fn(); all.push(...rows);
      const prevCount=Number(previous?.source_health?.[id]?.count||0);
      const suspiciousZero=establishedSources.has(id)&&rows.length===0;
      const suspiciousDrop=prevCount>=5 && rows.length>0 && rows.length<Math.max(2,Math.floor(prevCount*0.35));
      const state=suspiciousZero?'suspicious_zero':suspiciousDrop?'degraded':'ok';
      health[id]={
        ok:!suspiciousZero&&!suspiciousDrop,
        state,
        count:rows.length,
        previous_count:prevCount||null,
        ms:Date.now()-started,
        last_success_at:(!suspiciousZero&&!suspiciousDrop)?new Date().toISOString():(previous?.source_health?.[id]?.last_success_at||null)
      };
    }catch(e){
      health[id]={
        ok:false,state:'failure',count:null,
        previous_count:Number(previous?.source_health?.[id]?.count||0)||null,
        ms:Date.now()-started,
        last_success_at:previous?.source_health?.[id]?.last_success_at||null,
        error:String(e?.message||e).slice(0,240)
      };
    }
  }
  if(sourceOnly){
    const report={ok:true,source:sourceOnly,generated_at:new Date().toISOString(),health,events:merge(all).map(({source_text,...e})=>e)};
    await fs.mkdir(DEBUG_DIR,{recursive:true});
    await fs.writeFile(DEBUG_DIR+'/'+sourceOnly+'-result.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({source:sourceOnly,health,events:report.events.slice(0,40)},null,2));
    await closeBrowser();
    return;
  }

  const sourceLabelMap={
    icch:['広島国際会議場公式'],candy:['CANDY PROMOTION'],worker_events:['会場・プレイガイド統合Worker'],
    eplus:['イープラス'],lawson:['ローチケ'],pia:['チケットぴあ'],dive:['Dive! Hiroshima'],
    cvb:['広島観光コンベンションビューロー'],
    convention_official:['主催者公式'],
    sports:['サンフレッチェ広島公式','広島ドラゴンフライズ公式','広島サンダーズ公式','NPB']
  };
  if(previous?.events){
    for(const [id,h] of Object.entries(health)){
      if(h.ok&&Number(h.count)>0) continue;
      const labels=new Set(sourceLabelMap[id]||[]);
      let retained=0;
      for(const old of previous.events){
        if(String(old.date||'')<today) continue;
        if((old.sources||[]).some(s=>labels.has(s)) || labels.has(old.source)){
          all.push({
            ...old,
            source:(old.source||[...(old.sources||[])][0]||id),
            stale_source:true,
            stale_reason:h.state||'failure',
            source_text:'retained by source continuity guard'
          });
          retained++;
        }
      }
      health[id].retained_future_count=retained;
    }
  }
  const merged=merge(all).filter(e=>e.date>=today&&e.date<=cutoff).sort((a,b)=>a.date.localeCompare(b.date)||(Number(b.people||0)-Number(a.people||0))||String(a.start_time||'99:99').localeCompare(String(b.start_time||'99:99')));
  const previousEvents=Array.isArray(previous?.events)?previous.events:[];
  const nowIso=new Date().toISOString();
  for(const e of merged){
    const currentKey=key(e);
    const old=previousEvents.find(x=>key(x)===currentKey)||
      previousEvents.find(x=>String(x?.date||'')===String(e.date||'')&&String(x?.venue||'')===String(e.venue||'')&&
        (String(x?.name||'').includes(String(e.name||''))||String(e.name||'').includes(String(x?.name||''))));
    e.first_seen_at=old?.first_seen_at||old?.last_seen_at||previous?.generated_at||nowIso;
    e.last_seen_at=nowIso;
    const missing=[];
    if(e.event_type==='convention'&&Number(e.people||0)<100) missing.push('participants');
    if(!e.start_time) missing.push('start_time');
    if(!e.end_time) missing.push('end_time');
    e.needs_enrichment=missing.length>0;
    e.enrichment_targets=missing;

    const official=(e.sources||[]).some(s=>/公式|NPB|Dive! Hiroshima|広島観光コンベンションビューロー/.test(String(s)));
    e.confidence=(Number(e.verification_count||0)>=2?'verified':official?'official':'single_source');
    e.people_label=e.people==null?null:(e.people_basis==='venue_capacity_reference'?('最大約'+Number(e.people).toLocaleString('ja-JP')+'人規模'):(Number(e.people).toLocaleString('ja-JP')+'人'));
  }
  const sourceRegistry={
    icch:{role:'venue_official',cadence:'twice_daily',categories:['convention','music','theater','event'],continuity:'retain_on_failure'},
    candy:{role:'promoter',cadence:'twice_daily',categories:['music','theater'],continuity:'retain_on_failure_or_regression'},
    worker_events:{role:'legacy_aggregator',cadence:'twice_daily',categories:['music','theater'],continuity:'retain_on_failure_or_regression'},
    eplus:{role:'playguide',cadence:'twice_daily',categories:['music','theater','sports','event'],continuity:'retain_on_failure_or_regression'},
    lawson:{role:'playguide',cadence:'twice_daily',categories:['music','theater','sports','event'],continuity:'retain_on_failure_or_regression'},
    pia:{role:'playguide',cadence:'twice_daily',categories:['music','theater','sports','event'],continuity:'retain_on_failure_or_regression'},
    dive:{role:'tourism_official',cadence:'twice_daily',categories:['festival','event','sports'],continuity:'retain_on_failure_or_regression'},
    cvb:{role:'convention_bureau',cadence:'twice_daily',categories:['convention'],continuity:'retain_on_failure_or_stale_publication'},
    convention_official:{role:'organizer_official',cadence:'twice_daily',categories:['convention'],continuity:'retain_on_failure_or_regression'},
    sports:{role:'sports_official',cadence:'twice_daily',categories:['sports'],continuity:'retain_on_failure_or_regression'}
  };
  const payload={ok:true,generated_at:nowIso,area:'広島市',coverage:{from:today,to:cutoff},purpose:'taxi_driver_demand_facts',source_health:health,source_registry:sourceRegistry,
    rules:{convention_min_people:100,display_principle:'需要を断定せず、日付・時刻・会場・人数規模・何の集まりかを判断材料として保持する',failure_policy:'取得失敗・疑わしい0件・前回比35%未満の急減では直前の未来予定を保持する',source_continuity:'各取得元を独立監視し、正常な取得元まで巻き戻さない',enrichment_policy:'既存イベントを消さず、不足している人数・開始・終了時刻を後続ソースで補完する'},
    counts:{raw:all.length,merged:merged.length},events:merged.map(({source_text,...e})=>e)};
  const enrichmentSummary={
    participants:payload.events.filter(e=>Array.isArray(e.enrichment_targets)&&e.enrichment_targets.includes('participants')).length,
    start_time:payload.events.filter(e=>Array.isArray(e.enrichment_targets)&&e.enrichment_targets.includes('start_time')).length,
    end_time:payload.events.filter(e=>Array.isArray(e.enrichment_targets)&&e.enrichment_targets.includes('end_time')).length
  };
  const sourceStatus={
    ok:true,
    generated_at:nowIso,
    area:'広島市',
    source_health:health,
    source_registry:sourceRegistry,
    enrichment_pending:enrichmentSummary,
    degraded_sources:Object.entries(health).filter(([,v])=>v?.state&&v.state!=='ok').map(([id,v])=>({id,state:v.state,error:v.error||null,retained_future_count:v.retained_future_count||0})),
    operational_note:'取得元ごとに独立監視。失敗・急減・公開停止時も他の正常データを継続し、直前の未来予定を保持する。'
  };
  await fs.mkdir('sales-nav-prototype/data',{recursive:true});
  await fs.writeFile(OUT,JSON.stringify(payload,null,2)+'\n');
  await fs.writeFile(STATUS_OUT,JSON.stringify(sourceStatus,null,2)+'\n');
  console.log(JSON.stringify({health,counts:payload.counts,enrichment:enrichmentSummary,first:payload.events.slice(0,12).map(x=>({date:x.date,name:x.name,venue:x.venue,people:x.people,source:x.source}))},null,2));
  if(Object.values(health).every(x=>!x.ok)) process.exitCode=2;
  await closeBrowser();
}
main().catch(e=>{console.error(e);process.exit(1)});