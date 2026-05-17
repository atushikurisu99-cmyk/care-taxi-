(function(){
  'use strict';
  var STAGE_W=1024;
  var STAGE_H=768;
  var MIN_MARGIN=0;
  function setScale(){
    var vw=window.innerWidth||document.documentElement.clientWidth||STAGE_W;
    var vh=window.innerHeight||document.documentElement.clientHeight||STAGE_H;
    var availableW=Math.max(1,vw-(MIN_MARGIN*2));
    var availableH=Math.max(1,vh-(MIN_MARGIN*2));
    var scale=Math.min(availableW/STAGE_W,availableH/STAGE_H);
    document.documentElement.style.setProperty('--scale',String(scale));
    window.scrollTo(0,0);
  }
  window.addEventListener('resize',setScale,false);
  window.addEventListener('orientationchange',function(){setTimeout(setScale,100);},false);
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',setScale,false);
  }else{
    setScale();
  }
})();
