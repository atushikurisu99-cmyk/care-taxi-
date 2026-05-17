(function(){
  function setScale(){
    var root=document.documentElement;
    var headerBaseH=80;
    var stageW=760;
    var stageH=560;
    var vw=window.innerWidth || document.documentElement.clientWidth;
    var vh=window.innerHeight || document.documentElement.clientHeight;

    /* v22ベース：本文は固定比率、画面差は全体scaleのみ */
    var scaleX=vw/stageW;
    var scaleY=(vh-(headerBaseH*0.72))/stageH;
    var scale=Math.min(scaleX,scaleY);
    if(scale>1.42) scale=1.42;
    if(scale<0.55) scale=0.55;

    var headerH=headerBaseH*scale;
    root.style.setProperty('--stage-scale',String(scale));
    root.style.setProperty('--header-h',String(headerH)+'px');

    var stageWrap=document.querySelector('.stage-wrap');
    if(stageWrap){
      stageWrap.style.left=((vw-(stageW*scale))/2)+'px';
      stageWrap.style.top=headerH+'px';
      stageWrap.style.transform='scale('+scale+')';
      stageWrap.style.transformOrigin='top left';
    }

    var headerInner=document.querySelector('.header-inner');
    if(headerInner){
      headerInner.style.transform='scale('+scale+')';
      headerInner.style.transformOrigin='top center';
      headerInner.style.height='80px';
    }
  }
  window.addEventListener('resize',setScale);
  window.addEventListener('orientationchange',function(){setTimeout(setScale,150)});
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',setScale)}else{setScale()}
})();
