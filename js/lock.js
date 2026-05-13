window.CareTaxiLock={
  start:function(){
    function stop(e){
      var ok=e.target.closest&&e.target.closest('.loc-grid-view,.detail-body');
      if(!ok){e.preventDefault();}
    }
    document.addEventListener('touchmove',stop,{passive:false});
    document.addEventListener('wheel',function(e){
      var ok=e.target.closest&&e.target.closest('.loc-grid-view,.detail-body');
      if(!ok){e.preventDefault();}
    },{passive:false});
    try{window.scrollTo(0,0);}catch(e){}
  }
};
