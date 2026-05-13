(function(){
  function fitShell(){
    const root = document.documentElement;
    const designW = 687;
    const designH = 553;
    const margin = 0;
    const scale = Math.min((window.innerWidth - margin) / designW, (window.innerHeight - margin) / designH);
    root.style.setProperty('--app-scale', Math.max(0.1, scale).toFixed(5));
    window.scrollTo(0,0);
  }

  function render(){
    fitShell();
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="app-shell">
        <div id="header-root"></div>
        <main class="app-main" aria-label="管理画面">
          <div class="panel location-panel" id="location-root"></div>
          <div class="panel detail-panel" id="detail-root"></div>
          <div class="panel days-panel" id="days-root"></div>
          <div class="panel status-panel" id="status-root"></div>
        </main>
      </div>
    `;

    window.CareTaxiHeader.render(document.getElementById('header-root'));
    window.CareTaxiDetail.render(document.getElementById('detail-root'));
    window.CareTaxiDays.render(document.getElementById('days-root'));
    window.CareTaxiStatus.render(document.getElementById('status-root'));
    window.CareTaxiLocation.render(document.getElementById('location-root'));
    window.CareTaxiScrollLock.lockPage();
  }

  window.addEventListener('resize', fitShell, { passive:true });
  window.addEventListener('orientationchange', () => setTimeout(fitShell, 60), { passive:true });

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', render);
  }else{
    render();
  }
})();
