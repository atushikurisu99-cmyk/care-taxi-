(function(){
  function setScale(){
    var root=document.documentElement;
    var headerH=80;
    var stageW=760;
    var stageH=560;
    var vw=window.innerWidth || document.documentElement.clientWidth;
    var vh=window.innerHeight || document.documentElement.clientHeight;
    var marginX=0;
    var marginBottom=0;
    var scaleX=(vw-(marginX*2))/stageW;
    var scaleY=(vh-headerH-marginBottom)/stageH;
    var scale=Math.min(scaleX,scaleY);
    if(scale>1.42) scale=1.42;
    if(scale<0.55) scale=0.55;
    root.style.setProperty('--stage-scale',String(scale));
    root.style.setProperty('--header-h',String(headerH*scale)+'px');
    var headerInner=document.querySelector('.header-inner');
    if(headerInner){headerInner.style.transform='scale('+scale+')';headerInner.style.transformOrigin='top center';headerInner.style.height='80px';}
  }
  window.addEventListener('resize',setScale);
  window.addEventListener('orientationchange',function(){setTimeout(setScale,150)});
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',setScale)}else{setScale()}
})();
