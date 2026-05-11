(function(){
  const BASE_W = 920;
  const BASE_H = 560;
  const HEADER_H = 86;
  const GAP_X = 24;
  const GAP_TOP = 18;
  const GAP_BOTTOM = 22;
  const MIN_SCALE = 0.62;
  const MAX_SCALE = 1.18;

  function clamp(n,min,max){
    return Math.max(min, Math.min(n, max));
  }

  function lockScroll(){
    window.scrollTo(0,0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }

  function applyScale(){
    const vw = window.innerWidth || document.documentElement.clientWidth || BASE_W;
    const vh = window.innerHeight || document.documentElement.clientHeight || BASE_H + HEADER_H;

    const availableW = Math.max(320, vw - GAP_X * 2);
    const availableH = Math.max(240, vh - HEADER_H - GAP_TOP - GAP_BOTTOM);
    const scale = clamp(Math.min(availableW / BASE_W, availableH / BASE_H), MIN_SCALE, MAX_SCALE);

    document.documentElement.style.setProperty('--header-h', HEADER_H + 'px');
    document.documentElement.style.setProperty('--stage-scale', String(scale));
    lockScroll();
  }

  function renderClock(){
    const el = document.getElementById('datetimeText');
    if(!el) return;
    const now = new Date();
    const week = ['日','月','火','水','木','金','土'][now.getDay()];
    const mm = String(now.getMinutes()).padStart(2,'0');
    const hh = String(now.getHours()).padStart(2,'0');
    el.textContent = `${now.getMonth()+1}/${now.getDate()}（${week}） ${hh}:${mm}`;
  }

  window.addEventListener('resize', applyScale, {passive:true});
  window.addEventListener('orientationchange', function(){ setTimeout(applyScale, 120); }, {passive:true});
  window.addEventListener('scroll', lockScroll, {passive:true});
  document.addEventListener('DOMContentLoaded', function(){
    applyScale();
    renderClock();
    setInterval(renderClock, 30000);
  });
  applyScale();
})();
