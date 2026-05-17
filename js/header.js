(function(){
  window.AppHeader = {
    render: function(root){
      root.innerHTML = '' +
        '<div class="header-menu" aria-hidden="true"><span></span><span></span><span></span></div>' +
        '<div class="header-date">5/10（日）</div>' +
        '<div class="header-time">05:14</div>' +
        '<button class="header-booking" type="button">＋予約登録</button>';
    }
  };
})();
