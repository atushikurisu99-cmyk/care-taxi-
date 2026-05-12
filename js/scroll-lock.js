(function(){
  function preventPageMove(e){
    if(!e.target.closest || !e.target.closest('.location-grid-viewport')){
      e.preventDefault();
    }
  }
  function lockPage(){
    window.scrollTo(0,0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }
  window.addEventListener('resize', lockPage, { passive:true });
  window.addEventListener('orientationchange', function(){ setTimeout(lockPage, 60); }, { passive:true });
  document.addEventListener('touchmove', preventPageMove, { passive:false });
  window.CareTaxiScrollLock = { lockPage };
})();
