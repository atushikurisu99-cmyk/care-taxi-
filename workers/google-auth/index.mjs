const enc=new TextEncoder();

function b64url(bytes){
  let s='';
  for(const b of bytes) s+=String.fromCharCode(b);
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function unb64url(s){
  s=s.replace(/-/g,'+').replace(/_/g,'/');
  while(s.length%4) s+='=';
  const raw=atob(s);
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
async function hmac(secret,text){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(text))));
}
async function signedPayload(secret,obj){
  const body=b64url(enc.encode(JSON.stringify(obj)));
  return body+'.'+await hmac(secret,body);
}
async function verifySigned(secret,token){
  const [body,sig]=String(token||'').split('.');
  if(!body||!sig) return null;
  if(await hmac(secret,body)!==sig) return null;
  try{return JSON.parse(new TextDecoder().decode(unb64url(body)))}catch{return null}
}
async function sha256(text){
  const b=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(text)));
  return [...b].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function json(data,status=200,headers={}){
  return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json;charset=UTF-8',...headers}});
}
function corsHeaders(req,env){
  const origin=req.headers.get('origin')||'';
  const allowed=allowedOrigins(env);
  const ok=allowed.includes(origin);
  return ok?{
    'access-control-allow-origin':origin,
    'access-control-allow-headers':'authorization,content-type',
    'access-control-allow-methods':'GET,POST,OPTIONS',
    'vary':'Origin'
  }:{};
}
function allowedOrigins(env){
  return String(env.ALLOWED_RETURN_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
}
function validPairId(value){
  return /^pair_[A-Za-z0-9_-]{24,120}$/.test(String(value||''));
}
function validClaimSecret(value){
  return /^claim_[A-Za-z0-9_-]{40,180}$/.test(String(value||''));
}
function validAppDeviceToken(value){
  return /^adev_[A-Za-z0-9_-]{40,180}$/.test(String(value||''));
}
function randomSecret(prefix){
  const bytes=new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return prefix+b64url(bytes);
}

function originAllowed(req,env){
  const origin=req.headers.get('origin')||'';
  return allowedOrigins(env).includes(origin);
}

function html(body,status=200){
  return new Response(body,{status,headers:{'content-type':'text/html;charset=UTF-8','cache-control':'no-store'}});
}


function oauthConfigured(env){
  return !!(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET&&env.SESSION_SECRET);
}
async function googleTokenExchange(code,redirectUri,env){
  const body=new URLSearchParams({
    code,
    client_id:env.GOOGLE_CLIENT_ID,
    client_secret:env.GOOGLE_CLIENT_SECRET,
    redirect_uri:redirectUri,
    grant_type:'authorization_code'
  });
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  const d=await r.json();
  if(!r.ok) throw new Error('token_exchange_failed');
  return d;
}
async function googleUserInfo(accessToken){
  const r=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{authorization:'Bearer '+accessToken}});
  const d=await r.json();
  if(!r.ok||!d.sub) throw new Error('userinfo_failed');
  return d;
}
async function createFolder(accessToken){
  const r=await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name',{
    method:'POST',
    headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},
    body:JSON.stringify({name:'タクシー営業ナビ',mimeType:'application/vnd.google-apps.folder'})
  });
  const d=await r.json();
  if(!r.ok||!d.id) throw new Error('drive_folder_failed');
  return d.id;
}
async function createSpreadsheet(accessToken){
  const r=await fetch('https://sheets.googleapis.com/v4/spreadsheets',{
    method:'POST',
    headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},
    body:JSON.stringify({properties:{title:'タクシー営業ナビ_データ'}})
  });
  const d=await r.json();
  if(!r.ok||!d.spreadsheetId) throw new Error('sheet_create_failed');
  return d.spreadsheetId;
}
async function moveFileToFolder(accessToken,fileId,folderId){
  const r=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(fileId)+'?addParents='+encodeURIComponent(folderId)+'&fields=id,parents',{
    method:'PATCH',headers:{authorization:'Bearer '+accessToken}
  });
  if(!r.ok) throw new Error('sheet_move_failed');
}
async function readStore(env,uid){
  const id=env.USER_STORE.idFromName(uid);
  const stub=env.USER_STORE.get(id);
  const r=await stub.fetch('https://store.local/profile');
  return r.ok?await r.json():null;
}
async function writeStore(env,uid,data){
  const id=env.USER_STORE.idFromName(uid);
  const stub=env.USER_STORE.get(id);
  const r=await stub.fetch('https://store.local/profile',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
  if(!r.ok) throw new Error('store_failed');
}
async function deleteStore(env,uid){
  const id=env.USER_STORE.idFromName(uid);
  const stub=env.USER_STORE.get(id);
  const r=await stub.fetch('https://store.local/profile',{method:'DELETE'});
  if(!r.ok&&r.status!==404) throw new Error('store_delete_failed');
}

async function ensureGoogleFiles(accessToken,profile){
  let folderId=profile.folderId||null;
  let spreadsheetId=profile.spreadsheetId||null;
  if(!folderId) folderId=await createFolder(accessToken);
  if(!spreadsheetId){
    spreadsheetId=await createSpreadsheet(accessToken);
    await moveFileToFolder(accessToken,spreadsheetId,folderId);
  }
  return {folderId,spreadsheetId};
}
async function authStart(req,env){
  if(!oauthConfigured(env)) return json({ok:false,error:'google_oauth_not_configured'},503);
  const u=new URL(req.url);
  const pairId=u.searchParams.get('pair_id')||'';
  if(!validPairId(pairId)) return json({ok:false,error:'invalid_pair_id'},400);

  const pair=await readStore(env,'pair:'+pairId);
  if(!pair||pair.status!=='pending'||Number(pair.exp||0)<Date.now()){
    return json({ok:false,error:'invalid_or_expired_pair'},400);
  }

  const state=await signedPayload(env.SESSION_SECRET,{
    pairId,
    exp:Date.now()+10*60*1000,
    nonce:crypto.randomUUID()
  });
  const redirectUri=new URL('/oauth/callback',req.url).toString();
  const q=new URLSearchParams({
    client_id:env.GOOGLE_CLIENT_ID,
    redirect_uri:redirectUri,
    response_type:'code',
    scope:'openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/gmail.send',
    access_type:'offline',
    include_granted_scopes:'true',
    state
  });
  return Response.redirect('https://accounts.google.com/o/oauth2/v2/auth?'+q.toString(),302);
}
async function authCallback(req,env){
  const u=new URL(req.url);
  const state=await verifySigned(env.SESSION_SECRET,u.searchParams.get('state'));
  if(!state||Number(state.exp)<Date.now()||!validPairId(state.pairId)){
    return json({ok:false,error:'invalid_state'},400);
  }

  const code=u.searchParams.get('code');
  if(!code) return json({ok:false,error:u.searchParams.get('error')||'missing_code'},400);

  const pair=await readStore(env,'pair:'+state.pairId);
  if(!pair||pair.status!=='pending'||Number(pair.exp||0)<Date.now()){
    return json({ok:false,error:'pair_expired'},410);
  }

  const redirectUri=new URL('/oauth/callback',req.url).toString();
  const token=await googleTokenExchange(code,redirectUri,env);
  const user=await googleUserInfo(token.access_token);
  const uid=(await sha256('taxi-nav:'+user.sub)).slice(0,24);
  const prev=await readStore(env,uid)||{};
  const files=await ensureGoogleFiles(token.access_token,prev);

  await writeStore(env,uid,{
    uid,
    email:user.email||'',
    name:user.name||'',
    picture:user.picture||'',
    refreshToken:token.refresh_token||prev.refreshToken||'',
    grantedScopes:String(token.scope||prev.grantedScopes||''),
    folderId:files.folderId,
    spreadsheetId:files.spreadsheetId,
    connectedAt:prev.connectedAt||Date.now(),
    updatedAt:Date.now()
  });

  await writeStore(env,'pair:'+state.pairId,{
    ...pair,
    status:'complete',
    uid,
    email:user.email||'',
    exp:Date.now()+10*60*1000,
    completedAt:Date.now()
  });

  return html(`<!doctype html><html lang="ja"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Google連携完了</title><body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#071019;color:#fff;margin:0;min-height:100vh;display:grid;place-items:center"><main style="text-align:center;padding:28px"><div style="font-size:56px">✓</div><h1>Google連携が完了しました</h1><p style="color:#aab8c4;line-height:1.7">この画面を閉じて、タクシー営業ナビへ戻ってください。<br>アプリ側で連携状態を自動確認します。</p><button onclick="window.close()" style="margin-top:18px;padding:14px 28px;border:0;border-radius:14px;font-size:18px;font-weight:800">閉じる</button></main><script>try{window.opener&&window.opener.postMessage({type:'taxi-google-pair-complete'},'*')}catch(e){};<\/script></body></html>`);
}
async function refreshGoogleAccessToken(refreshToken,env){
  if(!refreshToken) throw new Error('missing_refresh_token');
  const body=new URLSearchParams({
    client_id:env.GOOGLE_CLIENT_ID,
    client_secret:env.GOOGLE_CLIENT_SECRET,
    refresh_token:refreshToken,
    grant_type:'refresh_token'
  });
  const r=await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',
    headers:{'content-type':'application/x-www-form-urlencoded'},
    body
  });
  const d=await r.json();
  if(!r.ok||!d.access_token) throw new Error('refresh_token_failed');
  return d.access_token;
}
function b64urlText(text){
  const bytes=enc.encode(text);
  let bin=''; for(const b of bytes) bin+=String.fromCharCode(b);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function buildMimeMessage({from,to,subject,bodyText,attachments=[]}){
  const safeSubject=String(subject||'');
  const boundary='taxi_nav_'+crypto.randomUUID().replace(/-/g,'');
  const lines=[
    'From: '+from,
    'To: '+to,
    'Subject: =?UTF-8?B?'+btoa(unescape(encodeURIComponent(safeSubject)))+'?=',
    'MIME-Version: 1.0',
    'Content-Type: multipart/mixed; boundary="'+boundary+'"',
    '',
    '--'+boundary,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(String(bodyText||''))))
  ];
  for(const a of (Array.isArray(attachments)?attachments:[])){
    const filename=String(a?.filename||'attachment.bin').replace(/[\r\n"]/g,'_');
    const mime=String(a?.mimeType||'application/octet-stream');
    const base64=String(a?.base64||'').replace(/^data:[^,]*,/, '');
    if(!base64) continue;
    lines.push(
      '--'+boundary,
      'Content-Type: '+mime+'; name="'+filename+'"',
      'Content-Disposition: attachment; filename="'+filename+'"',
      'Content-Transfer-Encoding: base64',
      '',
      base64
    );
  }
  lines.push('--'+boundary+'--','');
  return lines.join('\r\n');
}

async function getSpreadsheetMeta(accessToken,spreadsheetId){
  const r=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(spreadsheetId)+'?fields=sheets.properties',{
    headers:{authorization:'Bearer '+accessToken}
  });
  const d=await r.json();
  if(!r.ok) throw new Error('sheet_meta_failed');
  return d;
}
async function ensureWorksheet(accessToken,spreadsheetId,title){
  const meta=await getSpreadsheetMeta(accessToken,spreadsheetId);
  const found=(meta.sheets||[]).find(s=>s?.properties?.title===title);
  if(found) return found.properties.sheetId;
  const r=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(spreadsheetId)+':batchUpdate',{
    method:'POST',
    headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},
    body:JSON.stringify({requests:[{addSheet:{properties:{title}}}]})
  });
  const d=await r.json();
  if(!r.ok) throw new Error('sheet_add_failed');
  return d?.replies?.[0]?.addSheet?.properties?.sheetId;
}
async function sheetsSync(req,env){
  const auth=req.headers.get('authorization')||'';
  const sessionToken=auth.startsWith('Bearer ')?auth.slice(7):'';
  const session=await verifySigned(env.SESSION_SECRET,sessionToken);
  if(!session||Number(session.exp)<Date.now()) return json({ok:false,error:'unauthorized'},401,corsHeaders(req,env));
  const p=await readStore(env,session.uid);
  if(!p||!p.refreshToken||!p.spreadsheetId) return json({ok:false,error:'google_reconnect_required'},409,corsHeaders(req,env));
  const input=await req.json();
  const sheetName=String(input?.sheetName||'日報データ').trim().slice(0,80)||'日報データ';
  const values=Array.isArray(input?.values)?input.values:[];
  if(!values.length) return json({ok:false,error:'missing_values'},400,corsHeaders(req,env));
  const accessToken=await refreshGoogleAccessToken(p.refreshToken,env);
  await ensureWorksheet(accessToken,p.spreadsheetId,sheetName);
  const range="'"+sheetName.replace(/'/g,"''")+"'!A:Z";
  const clear=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(p.spreadsheetId)+'/values/'+encodeURIComponent(range)+':clear',{
    method:'POST',headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},body:'{}'
  });
  if(!clear.ok) throw new Error('sheet_clear_failed');
  const target="'"+sheetName.replace(/'/g,"''")+"'!A1";
  const r=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(p.spreadsheetId)+'/values/'+encodeURIComponent(target)+'?valueInputOption=USER_ENTERED',{
    method:'PUT',
    headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},
    body:JSON.stringify({majorDimension:'ROWS',values})
  });
  const d=await r.json();
  if(!r.ok) throw new Error('sheet_write_failed:'+String(d?.error?.message||r.status));
  return json({ok:true,spreadsheetId:p.spreadsheetId,sheetName,updatedRows:d.updatedRows||values.length},200,corsHeaders(req,env));
}

async function gmailSend(req,env){
  const auth=req.headers.get('authorization')||'';
  const sessionToken=auth.startsWith('Bearer ')?auth.slice(7):'';
  const session=await verifySigned(env.SESSION_SECRET,sessionToken);
  if(!session||Number(session.exp)<Date.now()) return json({ok:false,error:'unauthorized'},401,corsHeaders(req,env));
  const p=await readStore(env,session.uid);
  if(!p||!p.refreshToken) return json({ok:false,error:'google_reconnect_required'},409,corsHeaders(req,env));
  const input=await req.json();
  const to=String(input?.to||'').trim();
  const subject=String(input?.subject||'').trim();
  const bodyText=String(input?.bodyText||'');
  if(!to||!subject) return json({ok:false,error:'missing_to_or_subject'},400,corsHeaders(req,env));
  const accessToken=await refreshGoogleAccessToken(p.refreshToken,env);
  const raw=b64urlText(buildMimeMessage({
    from:p.email||'me',
    to,subject,bodyText,
    attachments:Array.isArray(input?.attachments)?input.attachments:[]
  }));
  const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{
    method:'POST',
    headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},
    body:JSON.stringify({raw})
  });
  const d=await r.json();
  if(!r.ok) throw new Error('gmail_send_failed:'+String(d?.error?.message||r.status));
  return json({ok:true,messageId:d.id||null,threadId:d.threadId||null},200,corsHeaders(req,env));
}


async function pairStart(req,env){
  if(req.method!=='POST') return json({ok:false,error:'method_not_allowed'},405,corsHeaders(req,env));
  if(!originAllowed(req,env)) return json({ok:false,error:'origin_not_allowed'},403,corsHeaders(req,env));
  const pairId='pair_'+randomSecret('').replace(/[^A-Za-z0-9_-]/g,'');
  const claimSecret=randomSecret('claim_');
  const claimHash=await sha256(claimSecret);
  await writeStore(env,'pair:'+pairId,{
    pairId,
    claimHash,
    status:'pending',
    exp:Date.now()+10*60*1000,
    createdAt:Date.now()
  });
  return json({
    ok:true,
    pairId,
    claimSecret,
    authUrl:new URL('/oauth/start?pair_id='+encodeURIComponent(pairId),req.url).toString(),
    expiresIn:600
  },200,corsHeaders(req,env));
}

async function pairStatus(req,env){
  if(req.method!=='POST') return json({ok:false,error:'method_not_allowed'},405,corsHeaders(req,env));
  if(!originAllowed(req,env)) return json({ok:false,error:'origin_not_allowed'},403,corsHeaders(req,env));
  const input=await req.json().catch(()=>({}));
  const pairId=String(input?.pairId||'');
  const claimSecret=String(input?.claimSecret||'');
  if(!validPairId(pairId)||!validClaimSecret(claimSecret)) return json({ok:false,error:'invalid_pair_claim'},400,corsHeaders(req,env));

  const p=await readStore(env,'pair:'+pairId);
  if(!p) return json({ok:false,error:'pair_not_found'},404,corsHeaders(req,env));
  if(Number(p.exp||0)<Date.now()){
    await deleteStore(env,'pair:'+pairId);
    return json({ok:false,error:'pair_expired'},410,corsHeaders(req,env));
  }
  if(await sha256(claimSecret)!==p.claimHash) return json({ok:false,error:'pair_forbidden'},403,corsHeaders(req,env));
  if(p.status!=='complete'||!p.uid) return json({ok:true,status:'pending'},200,corsHeaders(req,env));

  const profile=await readStore(env,p.uid);
  if(!profile?.refreshToken) return json({ok:false,error:'google_reconnect_required'},409,corsHeaders(req,env));

  let appDeviceToken=String(p.appDeviceToken||'');
  if(!validAppDeviceToken(appDeviceToken)){
    appDeviceToken=randomSecret('adev_');
    const tokenHash=await sha256(appDeviceToken);
    await writeStore(env,'appdevice:'+tokenHash,{
      uid:p.uid,
      createdAt:Date.now(),
      updatedAt:Date.now(),
      revoked:false
    });
    await writeStore(env,'pair:'+pairId,{...p,appDeviceToken,issuedAt:Date.now()});
  }

  const session=await signedPayload(env.SESSION_SECRET,{uid:p.uid,exp:Date.now()+30*24*60*60*1000});
  return json({
    ok:true,
    status:'complete',
    session,
    appDeviceToken,
    email:profile.email||'',
    folderId:profile.folderId||null,
    spreadsheetId:profile.spreadsheetId||null
  },200,corsHeaders(req,env));
}

async function refreshAppSession(req,env){
  if(req.method!=='POST') return json({ok:false,error:'method_not_allowed'},405,corsHeaders(req,env));
  if(!originAllowed(req,env)) return json({ok:false,error:'origin_not_allowed'},403,corsHeaders(req,env));
  const input=await req.json().catch(()=>({}));
  const appDeviceToken=String(input?.appDeviceToken||'');
  if(!validAppDeviceToken(appDeviceToken)) return json({ok:false,error:'invalid_device_token'},400,corsHeaders(req,env));
  const tokenHash=await sha256(appDeviceToken);
  const device=await readStore(env,'appdevice:'+tokenHash);
  if(!device?.uid||device.revoked) return json({ok:false,error:'device_not_found'},404,corsHeaders(req,env));
  const profile=await readStore(env,device.uid);
  if(!profile?.refreshToken) return json({ok:false,error:'google_reconnect_required'},409,corsHeaders(req,env));
  await writeStore(env,'appdevice:'+tokenHash,{...device,updatedAt:Date.now()});
  const session=await signedPayload(env.SESSION_SECRET,{uid:device.uid,exp:Date.now()+30*24*60*60*1000});
  return json({ok:true,session,email:profile.email||''},200,corsHeaders(req,env));
}

async function revokeAppDevice(req,env){
  if(req.method!=='POST') return json({ok:false,error:'method_not_allowed'},405,corsHeaders(req,env));
  const auth=req.headers.get('authorization')||'';
  const sessionToken=auth.startsWith('Bearer ')?auth.slice(7):'';
  const session=await verifySigned(env.SESSION_SECRET,sessionToken);
  if(!session||Number(session.exp)<Date.now()) return json({ok:false,error:'unauthorized'},401,corsHeaders(req,env));
  const input=await req.json().catch(()=>({}));
  const appDeviceToken=String(input?.appDeviceToken||'');
  if(!validAppDeviceToken(appDeviceToken)) return json({ok:false,error:'invalid_device_token'},400,corsHeaders(req,env));
  const tokenHash=await sha256(appDeviceToken);
  const device=await readStore(env,'appdevice:'+tokenHash);
  if(device?.uid&&device.uid!==session.uid) return json({ok:false,error:'forbidden'},403,corsHeaders(req,env));
  await deleteStore(env,'appdevice:'+tokenHash);
  return json({ok:true},200,corsHeaders(req,env));
}


async function me(req,env){
  const auth=req.headers.get('authorization')||'';
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  const session=await verifySigned(env.SESSION_SECRET,token);
  if(!session||Number(session.exp)<Date.now()) return json({ok:false,error:'unauthorized'},401,corsHeaders(req,env));
  const p=await readStore(env,session.uid);
  if(!p) return json({ok:false,error:'not_found'},404,corsHeaders(req,env));
  const scopes=String(p.grantedScopes||'').split(/\s+/).filter(Boolean);
  const has=s=>scopes.includes(s);
  return json({
    ok:true,
    userId:p.uid,
    email:p.email,
    name:p.name,
    folderId:p.folderId||null,
    spreadsheetId:p.spreadsheetId||null,
    capabilities:{
      driveFile:has('https://www.googleapis.com/auth/drive.file'),
      spreadsheets:has('https://www.googleapis.com/auth/spreadsheets'),
      gmailSend:has('https://www.googleapis.com/auth/gmail.send')
    }
  },200,corsHeaders(req,env));
}

export class UserStore{
  constructor(state){this.state=state}
  async fetch(req){
    if(req.method==='GET'){
      const p=await this.state.storage.get('profile');
      return p?json(p):json({ok:false},404);
    }
    if(req.method==='POST'){
      const p=await req.json();
      await this.state.storage.put('profile',p);
      return json({ok:true});
    }
    if(req.method==='DELETE'){
      await this.state.storage.delete('profile');
      return json({ok:true});
    }
    return new Response('method not allowed',{status:405});
  }
}

export default{
  async fetch(req,env){
    try{
      if(req.method==='OPTIONS') return new Response(null,{status:204,headers:corsHeaders(req,env)});
      const u=new URL(req.url);
      if(u.pathname==='/health') return json({ok:true,googleConfigured:oauthConfigured(env)});
      if(u.pathname==='/oauth/start') return authStart(req,env);
      if(u.pathname==='/oauth/callback') return authCallback(req,env);
      if(u.pathname==='/pair/start'&&req.method==='POST') return pairStart(req,env);
      if(u.pathname==='/pair/status'&&req.method==='POST') return pairStatus(req,env);
      if(u.pathname==='/session/refresh'&&req.method==='POST') return refreshAppSession(req,env);
      if(u.pathname==='/session/revoke'&&req.method==='POST') return revokeAppDevice(req,env);
      if(u.pathname==='/me') return me(req,env);
      if(u.pathname==='/gmail/send'&&req.method==='POST') return gmailSend(req,env);
      if(u.pathname==='/sheets/sync'&&req.method==='POST') return sheetsSync(req,env);
      return json({ok:false,error:'not_found'},404,corsHeaders(req,env));
    }catch(e){
      return json({ok:false,error:String(e&&e.message||e)},500,corsHeaders(req,env));
    }
  }
};
