window.AppShell = (function(){

  function render(root){
    root.innerHTML = `
      <div id="care-ui-root" style="
        position:relative;
        width:100vw;
        height:var(--app-h,100vh);
        background:#ffffff;
        overflow:hidden;
        font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue','Yu Gothic','YuGothic',Meiryo,sans-serif;
      ">

        <div id="location-root" style="
          position:absolute;
          left:48px;
          top:36px;
          width:calc(79vw - 48px);
          height:calc(var(--app-h,100vh) - 250px);
          overflow:hidden;
          background:#fff;
        "></div>

        <div id="detail-root" style="
          position:absolute;
          right:48px;
          top:36px;
          width:calc(21vw - 20px);
          height:calc(var(--app-h,100vh) - 250px);
          overflow:hidden;
          background:#fff;
        "></div>

        <div id="days-root" style="
          position:absolute;
          left:48px;
          bottom:36px;
          width:calc(79vw - 48px);
          height:170px;
          overflow:hidden;
          background:#fff;
        "></div>

        <div id="status-root" style="
          position:absolute;
          right:48px;
          bottom:36px;
          width:calc(21vw - 20px);
          height:170px;
          overflow:hidden;
          background:#fff;
        "></div>

      </div>
    `;
  }

  return {
    render: render
  };

})();
