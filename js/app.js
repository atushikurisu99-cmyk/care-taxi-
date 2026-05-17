(function(){
  var BASE_W=1024;
  var BASE_H=768;
  var canvas=null;
  var lastScale='';

  function size(){
    var vv=window.visualViewport;
    var w=vv && vv.width ? vv.width : (window.innerWidth||document.documentElement.clientWidth||BASE_W);
    var h=vv && vv.height ? vv.height : (window.innerHeight||document.documentElement.clientHeight||BASE_H);
    return {w:w,h:h};
  }

  function fit(){
    if(!canvas){return;}
    var s=size();
    var scale=Math.min(s.w/BASE_W,s.h/BASE_H)*0.965;
    if(scale<0.35){scale=0.35;}
    var next=String(scale);
    if(next!==lastScale){
      document.documentElement.style.setProperty('--app-scale',next);
      lastScale=next;
    }
    window.scrollTo(0,0);
  }

  function boot(){
    canvas=document.getElementById('app-canvas');
    fit();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot);
  }else{
    boot();
  }
  window.addEventListener('resize',fit);
  window.addEventListener('orientationchange',function(){setTimeout(fit,250);});
  document.addEventListener('touchmove',function(e){e.preventDefault();},{passive:false});
})();
