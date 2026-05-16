(function () {
  function hasTouch() {
    return ('ontouchstart' in window) || (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  }

  function boot() {
    var app = document.getElementById('app');
    if (!app) return;

    /* PCだけcompact。iPadは横幅が大きくても通常サイズを維持。 */
    if (!hasTouch() && window.innerWidth >= 980) {
      app.className = 'pc';
    } else {
      app.className = '';
    }

    window.scrollTo(0, 0);
  }

  function stopPageScroll(e) {
    /* Shell版は全体スクロール禁止。内部スクロールは後続LOCATION実装で個別に許可する。 */
    if (e && e.preventDefault) e.preventDefault();
  }

  if (document.addEventListener) {
    window.addEventListener('load', boot, false);
    window.addEventListener('resize', boot, false);
    window.addEventListener('orientationchange', function () { setTimeout(boot, 150); }, false);
    document.addEventListener('touchmove', stopPageScroll, false);
  } else {
    window.onload = boot;
  }
  boot();
})();
