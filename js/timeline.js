window.AppTimeline=function(){

  function render(root,onSelect){

    root.innerHTML='<div style="position:absolute;left:40px;top:40px;font-size:40px;color:red;font-weight:900;z-index:9999;">TIMELINE OK</div>';

    console.log("timeline start");

    try{

      var drivers=window.AppData.drivers||[];
      var jobs=window.AppData.jobs||[];

      root.innerHTML+='<div style="position:absolute;left:40px;top:120px;font-size:24px;color:blue;">drivers:'+drivers.length+'</div>';

      root.innerHTML+='<div style="position:absolute;left:40px;top:170px;font-size:24px;color:green;">jobs:'+jobs.length+'</div>';

    }catch(e){

      root.innerHTML='<div style="position:absolute;left:40px;top:40px;font-size:22px;color:red;font-weight:900;">ERROR:'+e.message+'</div>';

    }
  }

  function selectJob(id){}

  return{
    render:render,
    selectJob:selectJob
  };

}();
