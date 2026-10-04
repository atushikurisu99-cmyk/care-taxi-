const GOOGLE_AUTH_WORKER_URL='https://taxi-google-auth.atushi-works.workers.dev';
const PAIR_COOKIE='__Host-taxi_ga_pair';
const DEVICE_COOKIE='__Host-taxi_app_device';

function json(data,status=200,extraHeaders={}){
  return new Response(JSON.stringify(data),{
    status,
    headers:{
      'content-type':'application/json;charset=UTF-8',
      'cache-control':'no-store, max-age=0',
      ...extraHeaders
    }
  });
}
function parseCookies(request){
  const out={};
  const raw=request.headers.get('cookie')||'';
  for(const part of raw.split(';')){
    const i=part.indexOf('=');
    if(i<0) continue;
    const k=part.slice(0,i).trim();
    const v=part.slice(i+1).trim();
    if(k) out[k]=decodeURIComponent(v);
  }
  return out;
}
function b64urlEncodeText(text){
  const bytes=new TextEncoder().encode(text);
  let s='';
  for(const b of bytes) s+=String.fromCharCode(b);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64urlDecodeText(value){
  let s=String(value||'').replace(/-/g,'+').replace(/_/g,'/');
  while(s.length%4) s+='=';
  const raw=atob(s);
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function encodePair(pair){
  return b64urlEncodeText(JSON.stringify({
    pairId:String(pair?.pairId||''),
    claimSecret:String(pair?.claimSecret||''),
    expiresAt:Number(pair?.expiresAt||0)
  }));
}
function decodePair(value){
  try{
    const p=JSON.parse(b64urlDecodeText(value));
    if(!p?.pairId||!p?.claimSecret||!Number(p?.expiresAt)) return null;
    return p;
  }catch{return null}
}
function cookie(name,value,maxAge,strict=true){
  return name+'='+encodeURIComponent(value)+'; Path=/; Max-Age='+String(maxAge)+'; HttpOnly; Secure; SameSite='+(strict?'Strict':'Lax');
}
function clearCookie(name){
  return name+'=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict';
}
function requestOrigin(request){
  return new URL(request.url).origin;
}
function sameOriginWrite(request){
  if(!['POST','PUT','PATCH','DELETE'].includes(request.method)) return true;
  const origin=request.headers.get('origin')||'';
  return origin===requestOrigin(request);
}
async function workerFetch(env,path,init={},origin=''){
  const headers=new Headers(init.headers||{});
  if(origin) headers.set('origin',origin);
  const req=new Request(GOOGLE_AUTH_WORKER_URL+path,{...init,headers});
  if(env?.GOOGLE_AUTH&&typeof env.GOOGLE_AUTH.fetch==='function') return env.GOOGLE_AUTH.fetch(req);
  return fetch(req);
}
async function readJson(response){
  return response.json().catch(()=>({}));
}
async function sessionFromDevice(request,env){
  const cookies=parseCookies(request);
  const appDeviceToken=cookies[DEVICE_COOKIE]||'';
  if(!appDeviceToken) return {ok:false,error:'not_connected',status:401};
  const r=await workerFetch(env,'/session/refresh',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({appDeviceToken})
  },requestOrigin(request));
  const d=await readJson(r);
  if(!r.ok||!d?.ok||!d?.session) return {ok:false,error:d?.error||'session_refresh_failed',status:r.status||401};
  return {ok:true,session:d.session,appDeviceToken};
}
async function profileFromSession(request,env,session){
  const r=await workerFetch(env,'/me',{
    headers:{authorization:'Bearer '+session,'cache-control':'no-store'}
  },requestOrigin(request));
  const d=await readJson(r);
  if(!r.ok||!d?.ok) return {ok:false,error:d?.error||'profile_failed',status:r.status||401};
  return {ok:true,profile:d};
}
async function handleSession(request,env){
  const s=await sessionFromDevice(request,env);
  if(!s.ok) return json({ok:true,connected:false,reason:s.error},200);
  const p=await profileFromSession(request,env,s.session);
  if(!p.ok) return json({ok:true,connected:false,reason:p.error},200);
  return json({...p.profile,connected:true},200);
}
async function handleGoogleStart(request,env){
  const r=await workerFetch(env,'/pair/start',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:'{}'
  },requestOrigin(request));
  const d=await readJson(r);
  if(!r.ok||!d?.ok||!d?.pairId||!d?.claimSecret||!d?.authUrl){
    return json({ok:false,error:d?.error||'pair_start_failed'},r.status||500);
  }
  const expiresIn=Math.max(60,Math.min(900,Number(d.expiresIn)||600));
  const pair={pairId:d.pairId,claimSecret:d.claimSecret,expiresAt:Date.now()+expiresIn*1000};
  return json({ok:true,authUrl:d.authUrl,expiresIn},200,{
    'set-cookie':cookie(PAIR_COOKIE,encodePair(pair),expiresIn)
  });
}
async function handleGooglePairStatus(request,env){
  const cookies=parseCookies(request);
  const pair=decodePair(cookies[PAIR_COOKIE]||'');
  if(!pair) return json({ok:true,status:'none'},200);
  if(Date.now()>pair.expiresAt){
    return json({ok:false,error:'pair_expired'},410,{'set-cookie':clearCookie(PAIR_COOKIE)});
  }
  const r=await workerFetch(env,'/pair/status',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({pairId:pair.pairId,claimSecret:pair.claimSecret})
  },requestOrigin(request));
  const d=await readJson(r);
  if(r.status===410) return json({ok:false,error:'pair_expired'},410,{'set-cookie':clearCookie(PAIR_COOKIE)});
  if(!r.ok||!d?.ok) return json({ok:false,error:d?.error||'pair_status_failed'},r.status||500);
  if(d.status!=='complete'||!d.appDeviceToken) return json({ok:true,status:'pending'},200);

  const headers=new Headers({'content-type':'application/json;charset=UTF-8','cache-control':'no-store, max-age=0'});
  headers.append('set-cookie',cookie(DEVICE_COOKIE,d.appDeviceToken,31536000));
  headers.append('set-cookie',clearCookie(PAIR_COOKIE));

  const p=d.session?await profileFromSession(request,env,d.session):{ok:false};
  return new Response(JSON.stringify({
    ok:true,
    status:'complete',
    connected:true,
    profile:p.ok?p.profile:{email:d.email||''}
  }),{status:200,headers});
}
async function handleGoogleDisconnect(request,env){
  const s=await sessionFromDevice(request,env);
  const headers=new Headers({'content-type':'application/json;charset=UTF-8','cache-control':'no-store, max-age=0'});
  headers.append('set-cookie',clearCookie(DEVICE_COOKIE));
  headers.append('set-cookie',clearCookie(PAIR_COOKIE));
  if(s.ok){
    await workerFetch(env,'/session/revoke',{
      method:'POST',
      headers:{authorization:'Bearer '+s.session,'content-type':'application/json'},
      body:JSON.stringify({appDeviceToken:s.appDeviceToken})
    },requestOrigin(request)).catch(()=>null);
  }
  return new Response(JSON.stringify({ok:true}),{status:200,headers});
}
async function handleGoogleProxy(request,env,target){
  const s=await sessionFromDevice(request,env);
  if(!s.ok) return json({ok:false,error:'google_reconnect_required'},401);
  const raw=await request.text();
  const r=await workerFetch(env,target,{
    method:'POST',
    headers:{authorization:'Bearer '+s.session,'content-type':'application/json'},
    body:raw||'{}'
  },requestOrigin(request));
  const body=await r.text();
  return new Response(body,{
    status:r.status,
    headers:{'content-type':'application/json;charset=UTF-8','cache-control':'no-store, max-age=0'}
  });
}

export async function onRequest(context){
  const {request,env}=context;
  if(!sameOriginWrite(request)) return json({ok:false,error:'origin_not_allowed'},403);

  const u=new URL(request.url);
  const path=u.pathname.replace(/^\/api\/?/,'');
  try{
    if(path==='session'&&request.method==='GET') return handleSession(request,env);
    if(path==='google/start'&&request.method==='POST') return handleGoogleStart(request,env);
    if(path==='google/pair-status'&&request.method==='POST') return handleGooglePairStatus(request,env);
    if(path==='google/disconnect'&&request.method==='POST') return handleGoogleDisconnect(request,env);
    if(path==='google/mail'&&request.method==='POST') return handleGoogleProxy(request,env,'/gmail/send');
    if(path==='google/sheets'&&request.method==='POST') return handleGoogleProxy(request,env,'/sheets/sync');
    return json({ok:false,error:'not_found'},404);
  }catch(e){
    return json({ok:false,error:String(e&&e.message||e)},500);
  }
}
