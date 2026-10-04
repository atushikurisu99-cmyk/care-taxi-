(()=>{
 const WORKER='https://taxi-google-auth.atushi-works.workers.dev';
 const NEW_ORIGIN='https://taxi-sales-nav.pages.dev';
 const COMPLETE_KEY='taxi_origin_migration_complete_v1';

 function bytesToB64url(bytes){
  let s=''; for(const b of bytes)s+=String.fromCharCode(b);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 }
 function b64urlToBytes(s){
  s=String(s||'').replace(/-/g,'+').replace(/_/g,'/');
  while(s.length%4)s+='=';
  const raw=atob(s); return Uint8Array.from(raw,c=>c.charCodeAt(0));
 }
 function textBytes(s){return new TextEncoder().encode(s)}
 function bytesText(b){return new TextDecoder().decode(b)}
 function randomBytes(n){const b=new Uint8Array(n);crypto.getRandomValues(b);return b}
 function meaningfulTaxiKeys(){
  const out={};
  for(let i=0;i<localStorage.length;i++){
   const k=localStorage.key(i);
   if(!k||!k.startsWith('taxi_')) continue;
   if(k.startsWith('taxi_google_auth_session')) continue;
   if(k.startsWith('taxi_google_auth_app_device')) continue;
   if(k.startsWith('taxi_google_auth_active_pair')) continue;
   if(k===COMPLETE_KEY) continue;
   try{out[k]=localStorage.getItem(k)}catch(e){}
  }
  return out;
 }
 async function exportGpsDb(){
  if(typeof readGpsDbStore!=='function') return {raw:[],analysis:[]};
  try{
   if(typeof flushGpsDbWrites==='function') await flushGpsDbWrites();
   const [raw,analysis]=await Promise.all([readGpsDbStore('raw'),readGpsDbStore('analysis')]);
   return {raw:Array.isArray(raw)?raw:[],analysis:Array.isArray(analysis)?analysis:[]};
  }catch(e){return {raw:[],analysis:[]}}
 }
 async function makePayload(){
  return {
   version:1,
   sourceOrigin:location.origin,
   exportedAt:Date.now(),
   localStorage:meaningfulTaxiKeys(),
   gpsDb:await exportGpsDb()
  };
 }
 async function encryptPayload(payload){
  const keyBytes=randomBytes(32),iv=randomBytes(12);
  const key=await crypto.subtle.importKey('raw',keyBytes,{name:'AES-GCM'},false,['encrypt']);
  const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,textBytes(JSON.stringify(payload))));
  return {
   key:bytesToB64url(keyBytes),
   blob:bytesToB64url(new Uint8Array([...iv,...cipher]))
  };
 }
 async function decryptPayload(blob,keyText){
  const all=b64urlToBytes(blob),iv=all.slice(0,12),cipher=all.slice(12);
  const key=await crypto.subtle.importKey('raw',b64urlToBytes(keyText),{name:'AES-GCM'},false,['decrypt']);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);
  return JSON.parse(bytesText(new Uint8Array(plain)));
 }
 async function post(path,body){
  const r=await fetch(WORKER+path,{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify(body),
   cache:'no-store'
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok||!d?.ok) throw new Error(d?.error||('HTTP '+r.status));
  return d;
 }
 async function uploadEncrypted(blob){
  const start=await post('/migration/start',{});
  const size=60000,total=Math.ceil(blob.length/size);
  if(total>256) throw new Error('migration_too_large');
  for(let i=0;i<total;i++){
   await post('/migration/put',{
    migrationId:start.migrationId,
    migrationSecret:start.migrationSecret,
    index:i,total,
    chunk:blob.slice(i*size,(i+1)*size)
   });
  }
  return start;
 }
 async function writeGpsDb(data){
  if(!data||!('indexedDB' in window)) return;
  const req=indexedDB.open('taxi-sales-nav-gps-v1',1);
  const db=await new Promise((resolve,reject)=>{
   req.onupgradeneeded=()=>{
    const d=req.result;
    if(!d.objectStoreNames.contains('raw')) d.createObjectStore('raw',{keyPath:'id'});
    if(!d.objectStoreNames.contains('analysis')) d.createObjectStore('analysis',{keyPath:'id'});
   };
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error);
  });
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(['raw','analysis'],'readwrite');
   const raw=tx.objectStore('raw'),analysis=tx.objectStore('analysis');
   for(const row of (Array.isArray(data.raw)?data.raw:[])) if(row&&row.id) raw.put(row);
   for(const row of (Array.isArray(data.analysis)?data.analysis:[])) if(row&&row.id) analysis.put(row);
   tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error);
  });
 }
 function hasExistingDestinationData(){
  let count=0;
  for(let i=0;i<localStorage.length;i++){
   const k=localStorage.key(i);
   if(k&&k.startsWith('taxi_')&&!k.startsWith('taxi_google_auth_')&&k!==COMPLETE_KEY) count++;
  }
  return count>3;
 }
 async function applyPayload(payload){
  if(!payload||payload.version!==1) throw new Error('migration_payload_invalid');
  const existing=hasExistingDestinationData();
  if(existing){
   const ok=confirm('新しいアプリ側にもデータがあります。旧アプリのデータを上書きして移行しますか？');
   if(!ok) throw new Error('migration_cancelled');
  }
  const src=payload.localStorage||{};
  for(const [k,v] of Object.entries(src)){
   if(!k.startsWith('taxi_')||k.startsWith('taxi_google_auth_')) continue;
   try{localStorage.setItem(k,String(v??''))}catch(e){}
  }
  await writeGpsDb(payload.gpsDb||{});
  localStorage.setItem(COMPLETE_KEY,JSON.stringify({at:Date.now(),from:payload.sourceOrigin||''}));
 }
 async function importFromUrl(){
  if(location.origin!==NEW_ORIGIN) return false;
  const u=new URL(location.href);
  const migrationId=u.searchParams.get('migration');
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));
  const secret=hash.get('migration_secret');
  const key=hash.get('migration_key');
  if(!migrationId||!secret||!key) return false;
  try{
   if(typeof toast==='function')toast('旧アプリのデータを移行しています…');
   const meta=await post('/migration/meta',{migrationId,migrationSecret:secret});
   let blob='';
   for(let i=0;i<meta.total;i++){
    const part=await post('/migration/get',{migrationId,migrationSecret:secret,index:i});
    blob+=part.chunk;
   }
   const payload=await decryptPayload(blob,key);
   await applyPayload(payload);
   await post('/migration/delete',{migrationId,migrationSecret:secret}).catch(()=>null);
   if(typeof toast==='function')toast('データ移行が完了しました');
   setTimeout(()=>location.replace(NEW_ORIGIN+'/?migrated=1'),700);
   return true;
  }catch(e){
   console.error(e);
   if(typeof toast==='function')toast('データ移行に失敗しました');
   return false;
  }
 }
 window.migrateLegacyOriginToCloudflare=async function(){
  if(location.origin===NEW_ORIGIN) return false;
  try{
   if(typeof toast==='function')toast('新しいアプリへデータを安全に移行します');
   const payload=await makePayload();
   const enc=await encryptPayload(payload);
   const m=await uploadEncrypted(enc.blob);
   const dest=new URL(NEW_ORIGIN+'/');
   dest.searchParams.set('migration',m.migrationId);
   dest.hash='migration_secret='+encodeURIComponent(m.migrationSecret)+'&migration_key='+encodeURIComponent(enc.key);
   location.href=dest.toString();
   return true;
  }catch(e){
   console.error(e);
   if(typeof toast==='function')toast('データ移行を開始できませんでした');
   return false;
  }
 };
 setTimeout(importFromUrl,0);
})();