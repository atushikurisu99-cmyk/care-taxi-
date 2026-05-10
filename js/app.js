(() => {
  function lockViewport(){
    document.documentElement.style.setProperty('--vh', `${window.innerHeight}px`);
    window.scrollTo(0, 0);
  }
  window.addEventListener('resize', lockViewport, { passive: true });
  window.addEventListener('orientationchange', lockViewport, { passive: true });
  lockViewport();
})();
