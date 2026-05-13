(function(){
  function setScale(){
    var w=window.innerWidth||document.documentElement.clientWidth||1024;
    var h=window.innerHeight||document.documentElement.clientHeight||768;
    var scale=Math.min(w/900,(h-76)/548);
    if(!isFinite(scale)||scale<=0)scale=1;
    document.documentElement.style.setProperty('--board-scale',Math.max(.1,scale).toFixed(5));
    try{window.scrollTo(0,0);}catch(e){}
  }
  function render(){
    setScale();
    var app=document.getElementById('app');
    app.innerHTML='<div id="headerRoot"></div><main class="board">'+
      '<section class="area area-location" id="locationRoot"></section>'+
      '<section class="area area-detail" id="detailRoot"></section>'+
      '<section class="area area-days" id="daysRoot"></section>'+
      '<section class="area area-status" id="statusRoot"></section>'+
      '</main>';
    window.CareTaxiHeader.render(document.getElementById('headerRoot'));
    window.CareTaxiDetail.render(document.getElementById('detailRoot'));
    window.CareTaxiDays.render(document.getElementById('daysRoot'));
    window.CareTaxiStatus.render(document.getElementById('statusRoot'));
    window.CareTaxiLocation.render(document.getElementById('locationRoot'));
    window.CareTaxiLock.start();
  }
  window.addEventListener('resize',setScale,false);
  window.addEventListener('orientationchange',function(){setTimeout(setScale,100);},false);
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',render,false);}else{render();}
})();
