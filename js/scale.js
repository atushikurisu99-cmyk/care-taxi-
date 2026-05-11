(function(){
  const BASE_W=920, BASE_H=560, HEADER_H=86;
  const GAP_X=24, GAP_TOP=18, GAP_BOTTOM=22, MAX_SCALE=1.18, MIN_SCALE=0.62;
  function clamp(n){return Math.max(MIN_SCALE,Math.min(MAX_SCALE,n));}
  function apply(){
    const vw=window.innerWidth||document.documentElement.clientWidth;
    const vh=window.innerHeight||document.documentElement.clientHeight;
    const aw=Math.max(320,vw-GAP_X*2);
    const ah=Math.max(240,vh-HEADER_H-GAP_TOP-GAP_BOTTOM);
    const scale=clamp(Math.min(aw/BASE_W,ah/BASE_H));
    document.documentElement.style.setProperty('--stage-scale',String(scale));
    document.documentElement.style.setProperty('--header-h',HEADER_H+'px');
    window.scrollTo(0,0);
  }
  function lockGestures(){
    document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
    document.addEventListener('gesturechange',e=>e.preventDefault(),{passive:false});
    document.addEventListener('gestureend',e=>e.preventDefault(),{passive:false});
    let last=0;
    document.addEventListener('touchend',e=>{const now=Date.now(); if(now-last<350)e.preventDefault(); last=now;},{passive:false});
  }
  window.addEventListener('resize',apply,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(apply,120),{passive:true});
  lockGestures(); apply();
})();
