window.AppTimeline=function(){
  function minutes(t){
    var p=String(t).split(":");
    return Number(p[0])*60+Number(p[1]);
  }

  function render(root,onSelect){
    var drivers=window.AppData.drivers;
    var jobs=window.AppData.jobs;
    var statuses=window.AppTexts.statuses;

    var visibleStart=12*60;
    var visibleEnd=17*60;
    var now=14*60+26;

    var leftW=104;
    var rootRect=root.getBoundingClientRect ? root.getBoundingClientRect() : null;
    var rootW=(rootRect&&rootRect.width)||root.offsetWidth||760;
    var mainW=Math.max(360,rootW-leftW);

    var laneH=34;
    var visibleMin=visibleEnd-visibleStart;

    var html='<div class="timeline">';
    html+='<div class="timeline-left">';
    html+='<div class="timeline-left-head">担当者</div>';

    for(var i=0;i<drivers.length;i++){
      html+='<div class="timeline-driver" style="top:'+(28+i*laneH)+'px">'+drivers[i].name+'</div>';
    }

    html+='</div>';

    html+='<div class="timeline-main">';
    html+='<div class="timeline-hours">';

    for(var h=12;h<=16;h++){
      var hx=((h*60-visibleStart)/visibleMin)*mainW;
      html+='<div class="hour-label" style="left:'+hx+'px">'+h+':00</div>';
    }

    html+='</div>';
    html+='<div class="timeline-grid">';

    for(var m=visibleStart;m<=visibleEnd;m+=15){
      var x=((m-visibleStart)/visibleMin)*mainW;
      html+='<div class="vline '+(m%60===0?"hour":"")+'" style="left:'+x+'px"></div>';
    }

    for(var r=0;r<=drivers.length;r++){
      html+='<div class="hline" style="top:'+(r*laneH)+'px"></div>';
    }

    var nx=((now-visibleStart)/visibleMin)*mainW;
    html+='<div class="now-line" style="left:'+nx+'px"></div>';

    for(var j=0;j<jobs.length;j++){
      var job=jobs[j];
      var st=minutes(job.start);
      var en=minutes(job.end);

      if(en<visibleStart||st>visibleEnd) continue;

      var di=0;
      for(var d=0;d<drivers.length;d++){
        if(drivers[d].id===job.driverId) di=d;
      }

      var jl=Math.max(0,((st-visibleStart)/visibleMin)*mainW);
      var jr=Math.min(mainW,((en-visibleStart)/visibleMin)*mainW);
      var jw=Math.max(34,jr-jl);
      var jt=di*laneH+3;

      var cls="";
      if(job.status==="temp") cls=" temp";
      if(job.status==="alert") cls=" alert";

      html+='<div class="job-band'+cls+'" data-job-id="'+job.id+'" style="left:'+jl+'px;top:'+jt+'px;width:'+jw+'px">';
      html+='<div class="job-patient">'+job.patient+'</div>';
      html+='<div class="job-status">'+(statuses[job.status]||job.status)+'</div>';
      html+='</div>';
    }

    html+='</div>';
    html+='</div>';
    html+='<div class="timeline-scrollbar"><div class="timeline-thumb"></div></div>';
    html+='</div>';

    root.innerHTML=html;

    var bands=root.querySelectorAll(".job-band");
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
