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

  window.addEventListener('resize', applyScale, {passive:true});
  window.addEventListener('orientationchange', function(){ setTimeout(applyScale, 120); }, {passive:true});
  applyScale();
})();
