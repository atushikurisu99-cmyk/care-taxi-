(function(){
var BASE_W=1366,BODY_H=874,TOP_H=150;
var root=document.documentElement;
var fit=document.getElementById("fit");
var topbarInner=document.getElementById("topbarInner");
var datetimeEl=document.getElementById("currentDatetime");
var weekdays=["日","月","火","水","木","金","土"];

function pad(n){return String(n).padStart(2,"0")}
function updateDatetime(){
  var d=new Date();
  if(datetimeEl){
    datetimeEl.textContent=(d.getMonth()+1)+"/"+d.getDate()+"（"+weekdays[d.getDay()]+"）"+pad(d.getHours())+":"+pad(d.getMinutes());
  }
}
function size(){
  return{w:Math.max(document.documentElement.clientWidth||0,window.innerWidth||0),h:Math.max(document.documentElement.clientHeight||0,window.innerHeight||0)};
}
function applyScale(){
  var s=size();
  var scale=Math.min(s.w/BASE_W,s.h/(TOP_H+BODY_H));
  if(!isFinite(scale)||scale<=0)scale=1;

  var topbarH=TOP_H*scale;
  var bodyScale=Math.min(s.w/BASE_W,(s.h-topbarH)/BODY_H,scale);
  if(!isFinite(bodyScale)||bodyScale<=0)bodyScale=scale;

  var left=Math.max(0,(s.w-BASE_W*bodyScale)/2);

  root.style.setProperty("--topbar-h",topbarH+"px");

  fit.style.transform="translate("+left+"px,0px) scale("+bodyScale+")";
  topbarInner.style.transform="translate("+left+"px,0px) scale("+bodyScale+")";

  window.scrollTo(0,0);
  document.documentElement.scrollTop=0;
  document.body.scrollTop=0;
}
function prevent(e){e.preventDefault()}

window.addEventListener("load",function(){updateDatetime();applyScale()});
window.addEventListener("resize",applyScale);
window.addEventListener("orientationchange",function(){setTimeout(applyScale,80);setTimeout(applyScale,300)});
document.addEventListener("touchmove",prevent,{passive:false});
document.addEventListener("gesturestart",prevent,{passive:false});
document.addEventListener("gesturechange",prevent,{passive:false});

updateDatetime();
setInterval(updateDatetime,15000);
applyScale();
})();