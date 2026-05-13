(function(){
  function viewportW(){return window.innerWidth || document.documentElement.clientWidth || 1024;}
  function viewportH(){return window.innerHeight || document.documentElement.clientHeight || 768;}
  function fitShell(){
    var root=document.documentElement;
    var designW=687, designH=553;
    var scale=Math.min(viewportW()/designW, viewportH()/designH);
    if(!isFinite(scale) || scale<=0){scale=1;}
    root.style.setProperty('--app-scale', Math.max(0.1, scale).toFixed(5));
    try{window.scrollTo(0,0);}catch(e){}
  }
  function render(){
    fitShell();
    var app=document.getElementById('app');
    app.innerHTML='<div class="app-shell"><div id="header-root"></div><main class="app-main" aria-label="管理画面"><div class="panel location-panel" id="location-root"></div><div class="panel detail-panel" id="detail-root"></div><div class="panel days-panel" id="days-root"></div><div class="panel status-panel" id="status-root"></div></main></div>';
    window.CareTaxiHeader.render(document.getElementById('header-root'));
    window.CareTaxiDetail.render(document.getElementById('detail-root'));
    window.CareTaxiDays.render(document.getElementById('days-root'));
    window.CareTaxiStatus.render(document.getElementById('status-root'));
    window.CareTaxiLocation.render(document.getElementById('location-root'));
    window.CareTaxiScrollLock.lockPage();
  }
  window.addEventListener('resize',fitShell,false);
  window.addEventListener('orientationchange',function(){setTimeout(fitShell,80);},false);
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',render,false);}else{render();}
})();
