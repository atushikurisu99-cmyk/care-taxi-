window.AppTimeline=function(){
  function minutes(t){
    var p=String(t).split(":");
    return Number(p[0])*60+Number(p[1]);
  }

  function render(root,onSelect){
    if(!root){
      return;
    }

    root.style.position="absolute";
    root.style.left="0";
    root.style.right="0";
    root.style.top="30px";
    root.style.bottom="168px";
    root.style.minHeight="260px";
    root.style.overflow="hidden";
    root.style.background="#ffffff";

    var drivers=window.AppData&&window.AppData.drivers?window.AppData.drivers:[];
    var jobs=window.AppData&&window.AppData.jobs?window.AppData.jobs:[];
    var statuses=window.AppTexts&&window.AppTexts.statuses?window.AppTexts.statuses:{};

    var visibleStart=12*60;
    var visibleEnd=17*60;
    var now=14*60+26;
    var visibleMin=visibleEnd-visibleStart;

    var leftW=104;
    var rootW=root.getBoundingClientRect().width||root.offsetWidth||760;
    var rootH=root.getBoundingClientRect().height||root.offsetHeight||300;
    var mainW=Math.max(360,rootW-leftW);
    var laneH=34;

    var html="";
    html+='<div style="position:absolute;inset:0;font-size:11px;font-weight:800;color:#111;overflow:hidden;">';

    html+='<div style="position:absolute;left:0;top:42px;bottom:18px;width:'+leftW+'px;border-right:1px solid rgba(0,0,0,.35);background:#fff;z-index:4;">';
    html+='<div style="position:absolute;left:12px;top:8px;">担当者</div>';

    for(var i=0;i<drivers.length;i++){
      html+='<div style="position:absolute;left:10px;right:0;top:'+(28+i*laneH)+'px;height:'+laneH+'px;display:flex;align-items:center;border-top:1px solid rgba(0,0,0,.18);white-space:nowrap;">'+drivers[i].name+'</div>';
    }

    html+='</div>';

    html+='<div style="position:absolute;left:'+leftW+'px;right:0;top:42px;bottom:18px;overflow:hidden;">';

    html+='<div style="position:absolute;left:0;right:0;top:0;height:28px;border-bottom:1px solid rgba(0,0,0,.18);">';

    for(var h=12;h<=16;h++){
      var hx=((h*60-visibleStart)/visibleMin)*mainW;
      html+='<div style="position:absolute;top:0;left:'+hx+'px;transform:translateX(-50%);font-size:11px;font-weight:900;white-space:nowrap;">'+h+':00</div>';
    }

    html+='</div>';

    html+='<div style="position:absolute;left:0;right:0;top:28px;bottom:0;overflow:hidden;">';

    for(var m=visibleStart;m<=visibleEnd;m+=15){
      var x=((m-visibleStart)/visibleMin)*mainW;
      var color=m%60===0?"rgba(0,0,0,.28)":"rgba(0,0,0,.16)";
      html+='<div style="position:absolute;top:0;bottom:0;left:'+x+'px;width:1px;background:'+color+';"></div>';
    }

    for(var r=0;r<=drivers.length;r++){
      html+='<div style="position:absolute;left:0;right:0;top:'+(r*laneH)+'px;height:1px;background:rgba(0,0,0,.18);"></div>';
    }

    var nx=((now-visibleStart)/visibleMin)*mainW;
    html+='<div style="position:absolute;top:0;bottom:0;left:'+nx+'px;width:1.5px;background:#e13b4a;z-index:5;"></div>';

    for(var j=0;j<jobs.length;j++){
      var job=jobs[j];
      var st=minutes(job.start);
      var en=minutes(job.end);

      if(en<visibleStart||st>visibleEnd){
        continue;
      }

      var di=0;
      for(var d=0;d<drivers.length;d++){
        if(drivers[d].id===job.driverId){
          di=d;
        }
      }

      var jl=Math.max(0,((st-visibleStart)/visibleMin)*mainW);
      var jr=Math.min(mainW,((en-visibleStart)/visibleMin)*mainW);
      var jw=Math.max(34,jr-jl);
      var jt=di*laneH+3;

      var bg="rgba(119,205,176,.74)";
      var border="rgba(75,166,137,.55)";
      if(job.status==="temp"){
        bg="rgba(180,180,180,.35)";
        border="rgba(0,0,0,.35)";
      }
      if(job.status==="alert"){
        bg="rgba(255,237,110,.72)";
        border="rgba(220,175,0,.65)";
      }

      html+='<div data-job-id="'+job.id+'" style="position:absolute;left:'+jl+'px;top:'+jt+'px;width:'+jw+'px;height:28px;background:'+bg+';border:1px solid '+border+';overflow:hidden;padding:3px 5px;z-index:4;">';
      html+='<div style="font-size:11px;line-height:11px;white-space:nowrap;overflow:hidden;">'+job.patient+'</div>';
      html+='<div style="font-size:9px;line-height:11px;text-align:right;white-space:nowrap;overflow:hidden;">'+(statuses[job.status]||job.status)+'</div>';
      html+='</div>';
    }

    html+='</div>';
    html+='</div>';

    html+='<div style="position:absolute;left:'+leftW+'px;right:0;bottom:0;height:18px;background:#e5e5e5;">';
    html+='<div style="position:absolute;top:2px;left:36%;width:34%;height:14px;background:#a6a6a6;border:1px solid #888;"></div>';
    html+='</div>';

    html+='</div>';

    root.innerHTML=html;

    var bands=root.querySelectorAll("[data-job-id]");
    for(var b=0;b<bands.length;b++){
      bands[b].onclick=function(){
        var id=this.getAttribute("data-job-id");
        for(var k=0;k<jobs.length;k++){
          if(jobs[k].id===id&&onSelect){
            onSelect(jobs[k]);
          }
        }
      };
    }
  }

  function selectJob(id){}

  return{
    render:render,
    selectJob:selectJob
  };
}();
