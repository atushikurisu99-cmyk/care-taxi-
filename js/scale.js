(function(){
  'use strict';
  var STAGE_W=1024;
  var STAGE_H=620;
  var MIN_MARGIN=0;
  function setScale(){
    var vw=window.innerWidth||document.documentElement.clientWidth||STAGE_W;
    var vh=window.innerHeight||document.documentElement.clientHeight||STAGE_H;
    var scaleW=(vw-(MIN_MARGIN*2))/STAGE_W;
    var scaleH=(vh-(MIN_MARGIN*2))/STAGE_H;
    var scale=Math.min(scaleW,scaleH);
    if(!isFinite(scale)||scale<=0){scale=1;}
    document.documentElement.style.setProperty('--scale',String(scale));
    window.scrollTo(0,0);
  }
  window.addEventListener('resize',setScale,false);
  window.addEventListener('orientationchange',function(){setTimeout(setScale,120);},false);
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',setScale,false);
  }else{
    setScale();
  }
})();
