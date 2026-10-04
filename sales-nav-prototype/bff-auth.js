// Same-origin BFF authentication layer.
// Google tokens never enter browser storage. The browser only uses HttpOnly cookies issued by /api.
(()=>{
  let bffPairTimer=null;

  function stopPairPolling(){
    if(bffPairTimer){clearInterval(bffPairTimer);bffPairTimer=null}
  }

  async function bffSession(){
    try{
      const r=await fetch('/api/session',{cache:'no-store',credentials:'same-origin'});
      const d=await r.json().catch(()=>({}));
      return r.ok&&d?.ok&&d?.connected?d:null;
    }catch(e){return null}
  }

  async function bffPairStatus(showError=false){
    try{
      const r=await fetch('/api/google/pair-status',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        cache:'no-store',
        body:'{}'
      });
      const d=await r.json().catch(()=>({}));
      if(r.status===410){
        stopPairPolling();
        if(showError&&typeof toast==='function') toast('Google連携の確認時間が切れました');
        return false;
      }
      if(!r.ok||!d?.ok){
        if(showError&&typeof toast==='function') toast('Google連携の確認に失敗しました');
        return false;
      }
      if(d.status==='complete'){
        stopPairPolling();
        await window.refreshGoogleAuthStatus();
        if(typeof toast==='function') toast('Googleアカウントを連携しました');
        return true;
      }
      return false;
    }catch(e){
      if(showError&&typeof toast==='function') toast('Google連携の確認に失敗しました');
      return false;
    }
  }

  function startPairPolling(){
    stopPairPolling();
    let count=0;
    bffPairTimer=setInterval(async()=>{
      count++;
      const done=await bffPairStatus(false);
      if(done||count>=400) stopPairPolling();
    },1500);
    bffPairStatus(false);
  }

  window.beginGoogleConnect=async function(){
    const host=location.hostname;
    if(host!=='taxi-sales-nav.pages.dev'&&!host.endsWith('.taxi-sales-nav.pages.dev')){
      console.error('Google BFF requires Cloudflare Pages origin',{origin:location.origin});
      if(typeof toast==='function') toast('このホーム画面は旧URLです。Google連携は新URLへの移行が必要です');
      return;
    }
    let authWindow=null;
    try{authWindow=window.open('about:blank','_blank')}catch(e){}
    try{
      const r=await fetch('/api/google/start',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        cache:'no-store',
        body:'{}'
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d?.ok||!d.authUrl) throw new Error(d?.error||('HTTP '+r.status));
      startPairPolling();
      if(authWindow){
        try{authWindow.location.href=d.authUrl}catch(e){location.href=d.authUrl}
      }else{
        location.href=d.authUrl;
      }
    }catch(e){
      try{authWindow?.close()}catch(_){}
      console.error(e);
      if(typeof toast==='function') toast('Google連携を開始できませんでした');
    }
  };

  window.resumeGooglePairing=async function(){
    try{
      const r=await fetch('/api/google/pair-status',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        cache:'no-store',
        body:'{}'
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d?.ok) return false;
      if(d.status==='complete'){
        await window.refreshGoogleAuthStatus();
        return true;
      }
      if(d.status==='pending'){
        startPairPolling();
        return true;
      }
    }catch(e){}
    return false;
  };

  window.refreshGoogleAuthStatus=async function(){
    const d=await bffSession();
    if(!d){
      if(typeof renderGoogleAuthStatus==='function') renderGoogleAuthStatus(null);
      return false;
    }
    if(typeof renderGoogleAuthStatus==='function') renderGoogleAuthStatus(d);
    return true;
  };

  window.ensureGoogleAuthSession=async function(showError=false){
    const ok=await window.refreshGoogleAuthStatus();
    if(!ok&&showError&&typeof toast==='function') toast('Google連携が必要です');
    return ok;
  };

  window.disconnectGoogleAccount=async function(){
    try{
      await fetch('/api/google/disconnect',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        cache:'no-store',
        body:'{}'
      });
    }catch(e){}
    stopPairPolling();
    if(typeof renderGoogleAuthStatus==='function') renderGoogleAuthStatus(null);
    if(typeof toast==='function') toast('この端末のGoogle連携を解除しました');
  };

  window.sendGoogleTestMail=async function(){
    const ok=await window.ensureGoogleAuthSession(true);
    const to=(typeof getGoogleMailRecipient==='function'?getGoogleMailRecipient():'')||(window.googleAuthProfile?.email||'');
    if(!ok||!to){if(typeof toast==='function') toast('Google連携を確認してください');return}
    const btn=document.getElementById('googleAuthTestMailBtn');
    if(btn){btn.disabled=true;btn.textContent='送信中…'}
    try{
      const r=await fetch('/api/google/mail',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        body:JSON.stringify({
          to,
          subject:'タクシー営業ナビ Gmail送信テスト',
          bodyText:'タクシー営業ナビからのテストメールです。\nGoogle連携とGmail送信が正常に動作しています。'
        })
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d?.ok) throw new Error(d?.error||('HTTP '+r.status));
      if(typeof toast==='function') toast('テストメールを送信しました：'+to);
    }catch(e){
      console.error(e);
      if(typeof toast==='function') toast('メール送信に失敗しました');
    }finally{
      if(btn){btn.disabled=false;btn.textContent='テストメール送信'}
    }
  };

  window.syncDailyReportsToGoogleSheets=async function(silent=false){
    const ok=await window.ensureGoogleAuthSession(!silent);
    if(!ok){if(!silent&&typeof toast==='function')toast('Google連携を確認してください');return false}
    try{
      const r=await fetch('/api/google/sheets',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        body:JSON.stringify({sheetName:'日報データ',values:dailyReportsSheetValues()})
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d?.ok) throw new Error(d?.error||('HTTP '+r.status));
      if(!silent&&typeof toast==='function') toast('Google Sheetsへ同期しました');
      return true;
    }catch(e){
      console.error(e);
      if(!silent&&typeof toast==='function') toast('Sheets同期に失敗しました');
      return false;
    }
  };

  const legacyMonthlySend=window.sendMonthlyReportMail;
  window.sendMonthlyReportMail=async function(){
    saveMonthlyReportSettings();
    const connected=await window.ensureGoogleAuthSession(true);
    const monthKey=document.getElementById('monthlyReportMonth')?.value||monthKeyNow();
    const rows=monthlyRows(monthKey);
    const to=String(document.getElementById('monthlyReportTo')?.value||'').trim();
    const subject=String(document.getElementById('monthlyReportSubject')?.value||monthlyDefaultSubject(monthKey)).trim();
    const bodyText=String(document.getElementById('monthlyReportBody')?.value||monthlyDefaultBody(monthKey));
    if(!rows.length){toast('対象月の日報がありません');return}
    if(!connected){toast('Google連携を確認してください');return}
    if(!to){toast('送信先メールを入力してください');return}
    const btns=[...document.querySelectorAll('#monthlyReport .monthly-report-actions button')];
    btns.forEach(b=>b.disabled=true);
    try{
      const synced=await window.syncDailyReportsToGoogleSheets(true);
      if(!synced) throw new Error('sheet_sync_failed');
      const base64=monthlyWorkbookBase64(monthKey);
      const r=await fetch('/api/google/mail',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        body:JSON.stringify({
          to,subject,bodyText,
          attachments:[{
            filename:monthlyReportFilename(monthKey),
            mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            base64
          }]
        })
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok||!d?.ok) throw new Error(d?.error||('HTTP '+r.status));
      const histKey='taxi_monthly_report_send_history_v1';
      let hist=[];try{hist=JSON.parse(localStorage.getItem(histKey)||'[]')}catch(e){}
      hist.push({monthKey,to,subject,messageId:d.messageId||'',sentAt:Date.now()});
      try{localStorage.setItem(histKey,JSON.stringify(hist.slice(-200)))}catch(e){}
      toast('月報をメール送信しました');
    }catch(e){
      console.error(e);
      toast('月報メール送信に失敗しました');
    }finally{
      btns.forEach(b=>b.disabled=false);
    }
  };

  // Re-check after the old inline boot code has run.
  setTimeout(()=>{window.resumeGooglePairing();window.refreshGoogleAuthStatus()},0);
  window.addEventListener('pageshow',()=>{window.resumeGooglePairing();window.refreshGoogleAuthStatus()});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'){window.resumeGooglePairing();window.refreshGoogleAuthStatus()}
  });
})();
