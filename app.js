(function(){
  const app = document.getElementById('app');

  // 自PC02基準の思想：左・DETAILは固定寄り、比率差はガターで吸収。
  const BASE = {
    left: 210,
    main: 840,
    detail: 255,
    minA: 14,
    minB: 14,
    minC: 16
  };

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  function layout(){
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // 縦方向はブラウザ高さに応じて少しだけ調整。横幅は固定思想を優先。
    let left = BASE.left;
    let main = BASE.main;
    let detail = BASE.detail;

    if(vw < 1280){
      left = 195;
      main = 790;
      detail = 240;
    }
    if(vw >= 1600){
      main = 880;
    }

    const fixed = left + main + detail;
    const remain = Math.max(0, vw - fixed);

    // 最低限の隙間を確保した後、残りを右寄りに逃がす。
    let a = BASE.minA;
    let b = BASE.minB;
    let c = BASE.minC;
    const usable = Math.max(0, remain - a - b - c);

    a += usable * 0.16; // 左メニューと中央は広げすぎない
    b += usable * 0.28; // 中央とDETAIL
    c += usable * 0.56; // DETAIL右側で一番吸収

    app.style.setProperty('--left-w', left + 'px');
    app.style.setProperty('--main-w', main + 'px');
    app.style.setProperty('--detail-w', detail + 'px');
    app.style.setProperty('--gap-a', Math.round(a) + 'px');
    app.style.setProperty('--gap-b', Math.round(b) + 'px');
    app.style.setProperty('--gap-c', Math.round(c) + 'px');
    app.style.setProperty('--outer-x', '0px');
    app.style.setProperty('--outer-y', '0px');

    // 高さ別に一覧を主役として調整
    const baseContent = 26 + 48 + 116 + 12 + 390 + 12 + 140;
    const spareY = vh - baseContent;
    const listH = clamp(390 + spareY * 0.55, 320, 470);
    const bottomH = clamp(140 + spareY * 0.18, 118, 165);
    app.style.setProperty('--list-h', Math.round(listH) + 'px');
    app.style.setProperty('--bottom-h', Math.round(bottomH) + 'px');
  }

  window.addEventListener('resize', layout);
  layout();
})();
