(function(){
  function boot(){
    var body=document.querySelector('.timeline-scroll');
    var head=document.querySelector('.timeline-hours-viewport');
    if(!body||!head) return;
    var sync=function(){ head.scrollLeft=body.scrollLeft; };
    body.addEventListener('scroll',sync,{passive:true});
    sync();
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',boot);}else{boot();}
})();
