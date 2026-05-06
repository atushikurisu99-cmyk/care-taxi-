(function(){
  function lockSize(){
    document.documentElement.style.setProperty("--app-h",window.innerHeight+"px");
    window.scrollTo(0,0);
    document.body.scrollTop=0;
    document.documentElement.scrollTop=0;
  }

  function boot(){
    lockSize();

    var app=document.getElementById("app");
    window.AppShell.render(app);

    var locationRoot=document.getElementById("location-root");
    var detailRoot=document.getElementById("detail-root");
    var daysRoot=document.getElementById("days-root");
    var statusRoot=document.getElementById("status-root");

    locationRoot.innerHTML='<div style="position:absolute;left:0;top:40px;font-size:20px;font-weight:900;color:red;z-index:9999;">TIMELINE TEST</div>';

    try{
      window.AppDetail.render(detailRoot);
      window.AppDays.render(daysRoot);
      window.AppStatus.render(statusRoot);

      if(window.AppTimeline && window.AppTimeline.render){
        window.AppTimeline.render(locationRoot,function(job){
          window.AppDetail.fill(detailRoot,job);
        });
      }else{
        locationRoot.innerHTML='<div style="position:absolute;left:0;top:40px;font-size:20px;font-weight:900;color:red;">AppTimeline がありません</div>';
      }

      if(window.AppData.jobs.length){
        window.AppDetail.fill(detailRoot,window.AppData.jobs[0]);
      }
    }catch(e){
      locationRoot.innerHTML='<div style="position:absolute;left:0;top:40px;font-size:16px;font-weight:900;color:red;z-index:9999;">ERROR: '+e.message+'</div>';
    }
  }

  window.addEventListener("resize",lockSize);
  window.addEventListener("orientationchange",lockSize);

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot);
  }else{
    boot();
  }
})();
