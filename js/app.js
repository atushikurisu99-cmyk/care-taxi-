(function(){
var BASE_W=1366,BASE_H=1024,fit=document.getElementById("fit");
function size(){return{w:Math.max(document.documentElement.clientWidth||0,window.innerWidth||0),h:Math.max(document.documentElement.clientHeight||0,window.innerHeight||0)}}
function applyScale(){var s=size();var scale=Math.min(s.w/BASE_W,s.h/BASE_H);if(!isFinite(scale)||scale<=0)scale=1;var left=Math.max(0,(s.w-BASE_W*scale)/2);var top=Math.max(0,(s.h-BASE_H*scale)/2);fit.style.transform="translate("+left+"px,"+top+"px) scale("+scale+")";window.scrollTo(0,0);document.documentElement.scrollTop=0;document.body.scrollTop=0}
function prevent(e){e.preventDefault()}
window.addEventListener("load",applyScale);window.addEventListener("resize",applyScale);window.addEventListener("orientationchange",function(){setTimeout(applyScale,80);setTimeout(applyScale,300)});
document.addEventListener("touchmove",prevent,{passive:false});document.addEventListener("gesturestart",prevent,{passive:false});document.addEventListener("gesturechange",prevent,{passive:false});
applyScale();
})();