(() => {
  const BASE_W = 1366;
  const BASE_H = 1024;
  const canvas = document.getElementById("canvas");

  function fitCanvas() {
    const vw = window.innerWidth;
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const scale = Math.min(vw / BASE_W, vh / BASE_H);
    canvas.style.setProperty("--app-scale", String(scale));
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function lockScroll(event) {
    event.preventDefault();
  }

  window.addEventListener("resize", fitCanvas, { passive: true });
  window.addEventListener("orientationchange", fitCanvas, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fitCanvas, { passive: true });
  }

  document.addEventListener("touchmove", lockScroll, { passive: false });
  document.addEventListener("gesturestart", lockScroll, { passive: false });
  document.addEventListener("gesturechange", lockScroll, { passive: false });

  fitCanvas();
})();
