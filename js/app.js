/*
  Shell v9 Area Lock
  - 1024×768のPDF基準座標を、画面に収まるよう等倍スケールする。
  - 画面全体スクロールは禁止。
  - この段階ではエリア内の中身は描画しない。
*/
(function () {
  var DESIGN_W = 1024;
  var DESIGN_H = 768;

  function lockPage() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function fitCanvas() {
    var canvas = document.getElementById("canvas");
    if (!canvas) return;

    var ww = window.innerWidth || document.documentElement.clientWidth || DESIGN_W;
    var wh = window.innerHeight || document.documentElement.clientHeight || DESIGN_H;
    var scale = Math.min(ww / DESIGN_W, wh / DESIGN_H);
    var left = Math.round((ww - DESIGN_W * scale) / 2);
    var top = Math.round((wh - DESIGN_H * scale) / 2);

    canvas.style.transform = "translate(" + left + "px," + top + "px) scale(" + scale + ")";
    lockPage();
  }

  function boot() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("clean") === "1") {
      document.getElementById("app").classList.add("clean");
    }
    fitCanvas();
  }

  document.addEventListener("touchmove", function (event) {
    event.preventDefault();
  }, { passive: false });

  window.addEventListener("resize", fitCanvas);
  window.addEventListener("orientationchange", function () {
    setTimeout(fitCanvas, 120);
  });
  window.addEventListener("scroll", lockPage);
  document.addEventListener("DOMContentLoaded", boot);
})();
