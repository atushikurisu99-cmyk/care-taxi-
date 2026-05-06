(function () {
  var BASE_W = 1366;
  var BASE_H = 1024;
  var fit = document.getElementById("fit");

  function getViewSize() {
    return {
      w: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
      h: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
    };
  }

  function applyScale() {
    var size = getViewSize();
    var scale = Math.min(size.w / BASE_W, size.h / BASE_H);

    if (!isFinite(scale) || scale <= 0) {
      scale = 1;
    }

    var scaledW = BASE_W * scale;
    var scaledH = BASE_H * scale;
    var left = Math.max(0, (size.w - scaledW) / 2);
    var top = Math.max(0, (size.h - scaledH) / 2);

    fit.style.transform = "translate(" + left + "px," + top + "px) scale(" + scale + ")";
    fit.style.width = BASE_W + "px";
    fit.style.height = BASE_H + "px";

    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function prevent(e) {
    e.preventDefault();
  }

  window.addEventListener("load", applyScale);
  window.addEventListener("resize", applyScale);
  window.addEventListener("orientationchange", function () {
    setTimeout(applyScale, 80);
    setTimeout(applyScale, 300);
  });

  document.addEventListener("touchmove", prevent, { passive: false });
  document.addEventListener("gesturestart", prevent, { passive: false });
  document.addEventListener("gesturechange", prevent, { passive: false });

  applyScale();
})();
