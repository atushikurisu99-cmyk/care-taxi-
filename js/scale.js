(function(){
  var BASE_W = 1024;
  var BASE_H = 768;
  var stage = null;

  function lockScroll(){
    window.scrollTo(0,0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function resize(){
    if(!stage){ stage = document.getElementById('stage'); }
    if(!stage){ return; }

    var vw = window.innerWidth || document.documentElement.clientWidth || BASE_W;
    var vh = window.innerHeight || document.documentElement.clientHeight || BASE_H;
    var scale = Math.min(vw / BASE_W, vh / BASE_H);

    // 余白を勝手に広げない。キャンバス全体を等倍で拡大縮小するだけ。
    stage.style.transform = 'translate(-50%,-50%) scale(' + scale + ')';
    lockScroll();
  }

  window.addEventListener('resize', resize, false);
  window.addEventListener('orientationchange', function(){ setTimeout(resize, 150); }, false);
  document.addEventListener('DOMContentLoaded', resize, false);
  setTimeout(resize, 0);
})();
