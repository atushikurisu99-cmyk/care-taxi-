/* SCALE PATCH v18.0
   - 画面全体の上下バウンスを停止
   - LOCATION内のタッチだけは location.js に任せる
   - iPad Safari で青帯下がガクガク動く原因になりやすい scrollTo 連発を廃止
*/
(function(){
  const BASE_W = 920;
  const BASE_H = 560;
  const HEADER_H = 86;
  const GAP_X = 24;
  const GAP_TOP = 18;
  const GAP_BOTTOM = 22;
  const MAX_SCALE = 1.18;
  const MIN_SCALE = 0.62;

  function clampScale(n){
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, n));
  }

  function apply(){
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const aw = Math.max(320, vw - GAP_X * 2);
    const ah = Math.max(240, vh - HEADER_H - GAP_TOP - GAP_BOTTOM);
    const scale = clampScale(Math.min(aw / BASE_W, ah / BASE_H));

    document.documentElement.style.setProperty('--stage-scale', String(scale));
    document.documentElement.style.setProperty('--header-h', HEADER_H + 'px');
    document.documentElement.style.setProperty('--app-h', vh + 'px');
  }

  function lockPage(){
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    document.addEventListener('gesturestart', function(e){ e.preventDefault(); }, {passive:false});
    document.addEventListener('gesturechange', function(e){ e.preventDefault(); }, {passive:false});
    document.addEventListener('gestureend', function(e){ e.preventDefault(); }, {passive:false});

    document.addEventListener('touchmove', function(e){
      const target = e.target;
      const inLocation = target && target.closest && target.closest('.location-board');
      if(!inLocation){
        e.preventDefault();
      }
    }, {passive:false});
  }

  window.addEventListener('resize', apply, {passive:true});
  window.addEventListener('orientationchange', function(){
    window.setTimeout(apply, 160);
  }, {passive:true});

  lockPage();
  apply();
})();
