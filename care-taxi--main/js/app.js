(function(){
  function boot(){
    const data=window.CareTaxiData;
    document.getElementById('datetime').textContent=data.dateLabel;
    window.CareTaxiLocation.render(document.getElementById('locationRoot'),data);
    window.CareTaxiDetail.render(document.getElementById('detailRoot'),data);
    window.CareTaxiDays.render(document.getElementById('daysRoot'),data);
    window.CareTaxiStatus.render(document.getElementById('statusRoot'),data);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
