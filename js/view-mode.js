(function(){
  function isPcLike(){
    var w = window.innerWidth || document.documentElement.clientWidth || 0;
    var touch = navigator.maxTouchPoints || 0;
    return w >= 1100 && touch < 2;
  }

  function applyMode(mode){
    document.body.classList.remove('pc-mode','ipad-mode');
    document.body.classList.add(mode === 'ipad' ? 'ipad-mode' : 'pc-mode');
    localStorage.setItem('careTaxiViewMode', mode === 'ipad' ? 'ipad' : 'pc');
  }

  function boot(){
    var saved = localStorage.getItem('careTaxiViewMode');
    if(saved === 'ipad' || saved === 'pc'){
      applyMode(saved);
    }else{
      applyMode(isPcLike() ? 'pc' : 'ipad');
    }

    var toIpad = document.querySelector('[data-view-mode="ipad"]');
    var toPc = document.querySelector('[data-view-mode="pc"]');
    if(toIpad){ toIpad.addEventListener('click', function(){ applyMode('ipad'); }); }
    if(toPc){ toPc.addEventListener('click', function(){ applyMode('pc'); }); }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }
})();
