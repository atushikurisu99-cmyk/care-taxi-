(function () {
  function lockPage() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  document.addEventListener("touchmove", function (event) {
    event.preventDefault();
  }, { passive: false });

  window.addEventListener("scroll", lockPage);
  window.addEventListener("resize", lockPage);
  window.addEventListener("orientationchange", function () {
    setTimeout(lockPage, 80);
  });

  lockPage();
})();
