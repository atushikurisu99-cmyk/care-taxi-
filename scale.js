function fitCanvas(){
  const s=Math.min(window.innerWidth/1024,window.innerHeight/768);
  document.documentElement.style.setProperty("--scale",String(s));
}
window.addEventListener("resize",fitCanvas);
window.addEventListener("orientationchange",fitCanvas);
fitCanvas();
