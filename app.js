(function(){
  const BASE_W=1600;
  const BASE_H=900;
  const MAX_RATIO=17/9;
  const MIN_RATIO=16/9;
  const BASE_GUTTER_A=24;
  const BASE_GUTTER_B=24;
  const BASE_GUTTER_C=162;

  function fit(){
    const root=document.getElementById("app-canvas");
    const vw=window.innerWidth;
    const vh=window.innerHeight;
    const rawRatio=vw/vh;
    const designRatio=Math.min(Math.max(rawRatio,MIN_RATIO),MAX_RATIO);
    const designW=Math.round(BASE_H*designRatio);
    const extra=Math.max(0,designW-BASE_W);
    const gutterA=BASE_GUTTER_A+extra*0.25;
    const gutterB=BASE_GUTTER_B+extra*0.45;
    const gutterC=BASE_GUTTER_C+extra*0.30;
    const scale=Math.min(vw/designW,vh/BASE_H);
    root.style.setProperty("--design-w",designW+"px");
    root.style.setProperty("--design-h",BASE_H+"px");
    root.style.setProperty("--gutter-a",gutterA+"px");
    root.style.setProperty("--gutter-b",gutterB+"px");
    root.style.setProperty("--gutter-c",gutterC+"px");
    root.style.transform="translate(-50%,-50%) scale("+scale+")";
  }
  window.addEventListener("resize",fit);
  window.addEventListener("orientationchange",fit);
  fit();
})();
