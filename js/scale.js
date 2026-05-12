(function(){

  const BASE_W = 920;
  const BASE_H = 560;

  const HEADER_H = 86;

  const GAP_X = 24;
  const GAP_TOP = 18;
  const GAP_BOTTOM = 22;

  const MAX_SCALE = 1.18;
  const MIN_SCALE = 0.62;

  function clamp(n){
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, n));
  }

  function getViewport(){
    const vv = window.visualViewport;

    if(vv){
      return {
        width: vv.width,
        height: vv.height
      };
    }

    return {
      width: window.innerWidth || document.documentElement.clientWidth,
      height: window.innerHeight || document.documentElement.clientHeight
    };
  }

  function apply(){

    const vp = getViewport();

    const aw = Math.max(320, vp.width - GAP_X * 2);

    const ah = Math.max(
      240,
      vp.height - HEADER_H - GAP_TOP - GAP_BOTTOM
    );

    const scale = clamp(
      Math.min(
        aw / BASE_W,
        ah / BASE_H
      )
    );

    document.documentElement.style.setProperty(
      '--stage-scale',
      String(scale)
    );

    document.documentElement.style.setProperty(
      '--header-h',
      HEADER_H + 'px'
    );

    document.documentElement.style.setProperty(
      '--stage-w',
      BASE_W + 'px'
    );

    document.documentElement.style.setProperty(
      '--stage-h',
      BASE_H + 'px'
    );
  }

  function lockGestures(){

    document.addEventListener(
      'gesturestart',
      e => e.preventDefault(),
      { passive:false }
    );

    document.addEventListener(
      'gesturechange',
      e => e.preventDefault(),
      { passive:false }
    );

    document.addEventListener(
      'gestureend',
      e => e.preventDefault(),
      { passive:false }
    );

  }

  window.addEventListener(
    'resize',
    apply,
    { passive:true }
  );

  window.addEventListener(
    'orientationchange',
    () => {
      setTimeout(apply, 200);
    },
    { passive:true }
  );

  if(window.visualViewport){

    window.visualViewport.addEventListener(
      'resize',
      apply,
      { passive:true }
    );

  }

  lockGestures();

  apply();

})();
