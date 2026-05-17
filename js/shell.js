(function(){
  var CANVAS_W = 859;
  var CANVAS_H = 612;
  function setScale(){
    var vw = window.innerWidth || document.documentElement.clientWidth || CANVAS_W;
    var vh = window.innerHeight || document.documentElement.clientHeight || CANVAS_H;
    var safeW = vw;
    var safeH = vh;
    var scaleW = safeW / CANVAS_W;
    var scaleH = safeH / CANVAS_H;
    var scale = Math.min(scaleW, scaleH);
    if(scale > 1.35){ scale = 1.35; }
    document.documentElement.style.setProperty('--scale', String(scale));
    window.scrollTo(0,0);
  }
  function boot(){
    setScale();
    if(String(window.location.search).indexOf('debug=1') !== -1){
      document.body.className = (document.body.className ? document.body.className + ' ' : '') + 'debug';
    }
  }
  window.addEventListener('resize', setScale, false);
  window.addEventListener('orientationchange', function(){ setTimeout(setScale, 250); }, false);
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, false);
  }else{
    boot();
  }
})();
