(function(){
  var PC_MIN_WIDTH = 1000;

  function getParamMode(){
    var params = new URLSearchParams(window.location.search);
    var mode = params.get('mode');
    if(mode === 'pc' || mode === 'ipad') return mode;
    return '';
  }

  function isPcSize(){
    return (window.innerWidth || document.documentElement.clientWidth) >= PC_MIN_WIDTH;
  }

  function setMode(mode){
    var pcApp = document.getElementById('pc-app');
    var ipadApp = document.getElementById('app');

    if(!pcApp || !ipadApp) return;

    document.body.classList.remove('view-pc','view-ipad');

    if(mode === 'pc'){
      document.body.classList.add('view-pc');
      pcApp.style.display = 'grid';
      ipadApp.style.display = 'none';
      localStorage.setItem('careTaxiViewMode','pc');
    }else{
      document.body.classList.add('view-ipad');
      pcApp.style.display = 'none';
      ipadApp.style.display = 'block';
      localStorage.setItem('careTaxiViewMode','ipad');
    }
  }

  function decideInitialMode(){
    var paramMode = getParamMode();

    if(paramMode){
      return paramMode;
    }

    /*
      PCで開いたら必ずPC画面を優先。
      iPad表示ボタンを押した記録が残っていても、
      PC幅ならPCへ戻す。
    */
    if(isPcSize()){
      return 'pc';
    }

    return 'ipad';
  }

  function bindButtons(){
    document.addEventListener('click', function(e){
      var ipadBtn = e.target.closest('[data-view="ipad"], .js-view-ipad');
      var pcBtn = e.target.closest('[data-view="pc"], .js-view-pc');

      if(ipadBtn){
        e.preventDefault();
        setMode('ipad');
        return;
      }

      if(pcBtn){
        e.preventDefault();
        setMode('pc');
      }
    });
  }

  function boot(){
    bindButtons();
    setMode(decideInitialMode());

    window.addEventListener('resize', function(){
      if(isPcSize()){
        setMode('pc');
      }
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  }else{
    boot();
  }
})();
