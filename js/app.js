(function(){
  var BASE_W = 1024;
  var BASE_H = 768;
  var canvas = null;

  function getViewportSize(){
    var w = window.innerWidth || document.documentElement.clientWidth || BASE_W;
    var h = window.innerHeight || document.documentElement.clientHeight || BASE_H;
    return { w:w, h:h };
  }

  function fitCanvas(){
    if(!canvas){ return; }
    var size = getViewportSize();
    var scaleX = size.w / BASE_W;
    var scaleY = size.h / BASE_H;
    var scale = Math.min(scaleX, scaleY);

    if(scale > 1){ scale = 1; }
    if(scale < 0.3){ scale = 0.3; }

    document.documentElement.style.setProperty('--app-scale', String(scale));
    window.scrollTo(0,0);
  }

  function boot(){
    canvas = document.getElementById('app-canvas');
    fitCanvas();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }

  window.addEventListener('resize', fitCanvas);
  window.addEventListener('orientationchange', function(){
    setTimeout(fitCanvas, 250);
  });
})();
