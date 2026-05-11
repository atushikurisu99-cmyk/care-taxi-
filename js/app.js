(function(){
  const BASE_W = 920;
  const BASE_H = 560;
  const HEADER_H = 86;
  const MIN_X_GAP = 24;
  const MIN_Y_GAP_TOP = 18;
  const MIN_Y_GAP_BOTTOM = 22;
  const MAX_SCALE = 1.18;

  function clampScale(value){
    return Math.max(0.62, Math.min(value, MAX_SCALE));
  }

  function applyScale(){
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const availableW = Math.max(320, vw - (MIN_X_GAP * 2));
    const availableH = Math.max(240, vh - HEADER_H - MIN_Y_GAP_TOP - MIN_Y_GAP_BOTTOM);
    const scale = clampScale(Math.min(availableW / BASE_W, availableH / BASE_H));
    document.documentElement.style.setProperty('--stage-scale', String(scale));
    document.documentElement.style.setProperty('--header-h', HEADER_H + 'px');
    window.scrollTo(0,0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }



  function lockPinchZoom(){
    document.addEventListener('gesturestart', function(e){ e.preventDefault(); }, {passive:false});
    document.addEventListener('gesturechange', function(e){ e.preventDefault(); }, {passive:false});
    document.addEventListener('gestureend', function(e){ e.preventDefault(); }, {passive:false});
    document.addEventListener('touchmove', function(e){
      if(e.touches && e.touches.length > 1){ e.preventDefault(); }
    }, {passive:false});
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(e){
      const now = Date.now();
      if(now - lastTouchEnd <= 300){ e.preventDefault(); }
      lastTouchEnd = now;
    }, {passive:false});
  }

  function boot(){
    lockPinchZoom();
    applyScale();
    if(window.CareTaxiData && window.CareTaxiData.dateLabel){
      const dateTime = document.getElementById('dateTime');
      if(dateTime) dateTime.textContent = window.CareTaxiData.dateLabel;
    }
    if(window.CareTaxiTimeline){
      window.CareTaxiTimeline.render();
      window.CareTaxiTimeline.renderStatus();
    }
  }

  window.addEventListener('resize', applyScale, {passive:true});
  window.addEventListener('orientationchange', function(){ setTimeout(applyScale, 120); }, {passive:true});
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }
})();
