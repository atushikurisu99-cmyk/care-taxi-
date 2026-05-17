(function(){
  function boot(){
    window.AppLayout.apply();
    window.AppHeader.render(document.getElementById('headerLayer'));
    window.AppLocation.render(document.getElementById('locationLayer'));
    window.AppDetail.render(document.getElementById('detailLayer'));
    window.AppDays.render(document.getElementById('daysLayer'));
    window.AppStatus.render(document.getElementById('statusLayer'));
  }

  window.addEventListener('resize', function(){
    window.AppLayout.apply();
  });
  window.addEventListener('orientationchange', function(){
    setTimeout(function(){ window.AppLayout.apply(); }, 200);
  });

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }
})();
