(function () {
  var STAGE_W = 1024;
  var STAGE_H = 768;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function fitStage() {
    var vw = window.innerWidth || document.documentElement.clientWidth || STAGE_W;
    var vh = window.innerHeight || document.documentElement.clientHeight || STAGE_H;

    // 上端固定。全体比率を崩さず、見切れない範囲で最大表示。
    var scaleX = vw / STAGE_W;
    var scaleY = vh / STAGE_H;
    var scale = Math.min(scaleX, scaleY);

    // 極端なPC表示で大きくなりすぎないよう上限だけ設ける。
    // iPad横向きではほぼ1.0になる想定。
    scale = clamp(scale, 0.55, 1.35);

    document.documentElement.style.setProperty('--scale', String(scale));
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }

  window.addEventListener('resize', fitStage, false);
  window.addEventListener('orientationchange', function () {
    setTimeout(fitStage, 50);
    setTimeout(fitStage, 250);
  }, false);

  fitStage();
})();
