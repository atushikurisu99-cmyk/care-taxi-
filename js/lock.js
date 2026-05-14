(function () {
  function lockViewport() {
    document.documentElement.style.setProperty('--vh', window.innerHeight + 'px');
    window.scrollTo(0, 0);
  }
  window.addEventListener('load', lockViewport, false);
  window.addEventListener('resize', lockViewport, false);
  window.addEventListener('orientationchange', function () {
    setTimeout(lockViewport, 120);
  }, false);
  document.addEventListener('touchmove', function (e) {
    e.preventDefault();
  }, { passive: false });
})();
