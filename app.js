(function(){
  const BASE_W=1700, BASE_H=900;
  function fit(){
    const canvas=document.getElementById('canvas');
    const vw=window.innerWidth, vh=window.innerHeight;
    const scale=Math.min(vw/BASE_W, vh/BASE_H);
    canvas.style.transform=`translate(-50%,-50%) scale(${scale})`;
  }
  window.addEventListener('resize',fit);
  fit();
})();
