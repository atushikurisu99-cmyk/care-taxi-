(function(){
  var allowSelector = '.timeline-scroll, .area-detail, .area-status';

  function setAppHeight(){
    var h = window.innerHeight || document.documentElement.clientHeight || 0;
    if(h){ document.documentElement.style.setProperty('--app-h', h + 'px'); }
    window.scrollTo(0,0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function canScrollInside(el){
    if(!el) return false;
    if(el.classList && el.classList.contains('timeline-scroll')) return true;
    return el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
  }

  function onTouchMove(e){
    var t = e.target;
    var allowed = t && t.closest ? t.closest(allowSelector) : null;
    if(allowed && canScrollInside(allowed)) return;
    e.preventDefault();
  }

  function boot(){
    setAppHeight();
    document.addEventListener('touchmove', onTouchMove, {passive:false});
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', function(){ setTimeout(setAppHeight, 150); });
    window.addEventListener('scroll', setAppHeight, {passive:true});
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }
})();
