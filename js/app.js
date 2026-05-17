(function () {
  "use strict";

  var BASE_W = 1024;
  var BASE_H = 768;
  var stage = null;

  function viewportWidth() {
    return window.innerWidth || document.documentElement.clientWidth || BASE_W;
  }

  function viewportHeight() {
    return window.innerHeight || document.documentElement.clientHeight || BASE_H;
  }

  function fitStage() {
    if (!stage) return;

    var vw = viewportWidth();
    var vh = viewportHeight();
    var scale = Math.min(vw / BASE_W, vh / BASE_H);

    /* PCでは巨大化し過ぎない。iPadでは画面内に確実に収める。 */
    if (scale > 1.25) scale = 1.25;

    var x = Math.round((vw - BASE_W * scale) / 2);
    var y = Math.round((vh - BASE_H * scale) / 2);

    stage.style.transform = "translate(" + x + "px," + y + "px) scale(" + scale + ")";
  }

  function preventPageMove(e) {
    /* エリア固定段階なので画面全体のスクロールを止める */
    e.preventDefault();
  }

  function boot() {
    stage = document.getElementById("stage");
    fitStage();

    window.addEventListener("resize", fitStage, false);
    window.addEventListener("orientationchange", function () {
      window.setTimeout(fitStage, 250);
    }, false);

    document.addEventListener("touchmove", preventPageMove, { passive: false });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, false);
  } else {
    boot();
  }
}());
