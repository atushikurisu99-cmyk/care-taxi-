
(function () {

  var BASE_W = 952;
  var BASE_H = 728;

  function fitCanvas() {

    window.scrollTo(0, 0);

    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;

    var scale = Math.min(
      window.innerWidth / BASE_W,
      window.innerHeight / BASE_H
    );

    var scaledW = BASE_W * scale;
    var scaledH = BASE_H * scale;

    var left = (window.innerWidth - scaledW) / 2;
    var top = (window.innerHeight - scaledH) / 2;

    var canvas = document.getElementById("appCanvas");

    canvas.style.left = left + "px";
    canvas.style.top = top + "px";
    canvas.style.transform = "scale(" + scale + ")";

    var band = document.getElementById("topBand");

    band.style.left = "0px";
    band.style.top = "0px";
    band.style.width = window.innerWidth + "px";
    band.style.height = (106 * scale) + "px";
  }

  function boot() {
    fitCanvas();
    window.onresize = fitCanvas;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
