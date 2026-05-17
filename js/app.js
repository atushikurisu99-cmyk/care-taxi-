(function () {
  var DESIGN_W = 1024;
  var DESIGN_H = 768;
  var canvas = null;

  function viewportWidth() {
    return window.innerWidth || document.documentElement.clientWidth || DESIGN_W;
  }

  function viewportHeight() {
    return window.innerHeight || document.documentElement.clientHeight || DESIGN_H;
  }

  function fitCanvas() {
    if (!canvas) return;

    var vw = viewportWidth();
    var vh = viewportHeight();
    var scaleX = vw / DESIGN_W;
    var scaleY = vh / DESIGN_H;
    var scale = Math.min(scaleX, scaleY);

    canvas.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
  }

  function stopScroll() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function boot() {
    canvas = document.getElementById('app-canvas');
    fitCanvas();
    stopScroll();

    window.addEventListener('resize', function () {
      fitCanvas();
      stopScroll();
    }, false);

    window.addEventListener('orientationchange', function () {
      setTimeout(function () {
        fitCanvas();
        stopScroll();
      }, 250);
    }, false);

    document.addEventListener('touchmove', function (event) {
      event.preventDefault();
    }, { passive: false });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, false);
  } else {
    boot();
  }
}());
