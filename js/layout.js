(function(){
  window.AppLayout = {
    baseWidth: 1024,
    baseHeight: 768,
    apply: function(){
      var vw = window.innerWidth || document.documentElement.clientWidth || 1024;
      var vh = window.innerHeight || document.documentElement.clientHeight || 768;
      document.documentElement.style.setProperty('--real-vh', vh + 'px');
      var scale = Math.min(vw / this.baseWidth, vh / this.baseHeight);
      document.documentElement.style.setProperty('--canvas-scale', String(scale));
      window.scrollTo(0, 0);
    }
  };
})();
