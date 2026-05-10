(function(){
  const BASE_W = 1160;
  const BASE_H = 887;

  function fit(){
    const stage = document.getElementById("stage");
    const wrap = document.getElementById("stageWrap");

    const scale = Math.min(
      window.innerWidth / BASE_W,
      window.innerHeight / BASE_H
    );

    stage.style.transform = `scale(${scale})`;
    wrap.style.width = `${BASE_W * scale}px`;
    wrap.style.height = `${BASE_H * scale}px`;
    document.body.style.display = "flex";
    document.body.style.alignItems = "center";
    document.body.style.justifyContent = "center";
  }

  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", fit);
  window.addEventListener("DOMContentLoaded", fit);
})();
