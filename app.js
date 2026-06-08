(function(){
  const BASE_H=660;
  const BASE_W=1366;
  const MIN_RATIO=16/9;
  const MAX_RATIO=2.12; // ユーザーPCのChrome表示領域寄り。広すぎる場合は右余白で吸収。

  const base={leftW:255, mainW:760, detailW:235, gapLeft:14, gapMD:14, rightFree:88};

  function fit(){
    const stage=document.getElementById('stage');
    const vw=window.innerWidth;
    const vh=window.innerHeight;
    const ratio=Math.min(Math.max(vw/vh,MIN_RATIO),MAX_RATIO);
    const designW=Math.round(BASE_H*ratio);
    const extra=Math.max(0,designW-BASE_W);

    // パーツ幅は維持。余りは、左→中央、中央→DETAIL、右外側へ逃がす。
    const gapLeft=base.gapLeft+extra*0.18;
    const gapMD=base.gapMD+extra*0.22;
    const rightFree=base.rightFree+extra*0.60;

    stage.style.setProperty('--w',designW+'px');
    stage.style.setProperty('--h',BASE_H+'px');
    stage.style.setProperty('--left-w',base.leftW+'px');
    stage.style.setProperty('--main-w',base.mainW+'px');
    stage.style.setProperty('--detail-w',base.detailW+'px');
    stage.style.setProperty('--gap-left',gapLeft+'px');
    stage.style.setProperty('--gap-main-detail',gapMD+'px');
    stage.style.setProperty('--right-free',rightFree+'px');

    const scale=Math.min(vw/designW,vh/BASE_H);
    stage.style.transform=`translate(-50%,-50%) scale(${scale})`;
  }
  window.addEventListener('resize',fit);
  window.addEventListener('orientationchange',fit);
  fit();
})();
