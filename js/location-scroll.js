(function(){
  function boot(){
    var body = document.getElementById('timeline-scroll') || document.querySelector('.timeline-scroll');
    var track = document.getElementById('timeline-hours-track') || document.querySelector('.timeline-hours-track');

    if(!body || !track) return;

    var ticking = false;

    function sync(){
      ticking = false;
      var x = body.scrollLeft || 0;

      /*
        時間文字を scrollLeft で別スクロールさせず、
        タイムライン本体の移動量に合わせて transform で同期する。
        これで時間文字と縦目盛が別体で動いて見えるズレを抑える。
      */
      track.style.transform = 'translate3d(' + (-x) + 'px,0,0)';
    }

    function requestSync(){
      if(ticking) return;
      ticking = true;
      window.requestAnimationFrame(sync);
    }

    body.addEventListener('scroll', requestSync, {passive:true});
    window.addEventListener('resize', requestSync, {passive:true});
    window.addEventListener('orientationchange', function(){
      setTimeout(requestSync, 150);
    });

    sync();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }
})();
