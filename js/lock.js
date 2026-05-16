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
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function stopPageScroll(e) {
    /* Shell骨格では全体スクロール・iPadの引っ張り下げを止める。 */
    if (e && e.preventDefault) e.preventDefault();
    return false;
  }

  if (document.addEventListener) {
    window.addEventListener('load', boot, false);
    window.addEventListener('resize', boot, false);
    window.addEventListener('orientationchange', function () { setTimeout(boot, 150); }, false);

    /* iPad Safari対策：passive:false を明示しないと preventDefault が効かない場合がある。 */
    document.addEventListener('touchmove', stopPageScroll, { passive: false });
    document.body.addEventListener('touchmove', stopPageScroll, { passive: false });
  } else {
    window.onload = boot;
  }
  boot();
})();
