(function(){
  function setScale(){
    var shell=document.querySelector('.trace-shell');
    var page=document.querySelector('.page');
    if(!shell||!page)return;
    var baseW=688,baseH=552;
    var vw=window.innerWidth,vh=window.innerHeight;
    var scale=Math.min((vw-24)/baseW,(vh-24)/baseH,1.45);
    shell.style.transform='scale('+scale+')';
    page.style.height=vh+'px';
  }
  window.addEventListener('resize',setScale,{passive:true});
  setScale();
})();
