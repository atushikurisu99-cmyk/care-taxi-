(function(){
  var BASE_W = 1024;
  var BASE_H = 768;
  var stage = null;

  function viewportSize(){
    var w = window.innerWidth || document.documentElement.clientWidth || BASE_W;
    var h = window.innerHeight || document.documentElement.clientHeight || BASE_H;
    return { w: w, h: h };
  }

  function fit(){
    if(!stage){ stage = document.getElementById('stage'); }
    if(!stage){ return; }

    var vp = viewportSize();
    var scale = Math.min(vp.w / BASE_W, vp.h / BASE_H);

    // 大きいPCでは余白を勝手に広げず、キャンバス全体だけ拡大する。
    // ただし極端な拡大は避ける。
    if(scale > 1.22){ scale = 1.22; }

    stage.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
  }

  function lockScroll(){
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  window.addEventListener('load', function(){ fit(); lockScroll(); });
  window.addEventListener('resize', function(){ fit(); lockScroll(); });
  window.addEventListener('orientationchange', function(){ setTimeout(function(){ fit(); lockScroll(); }, 250); });
})();
