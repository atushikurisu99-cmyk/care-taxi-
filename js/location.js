/* LOCATION PATCH v17.5
   差し替え対象: js/location.js

   - LOCATION内だけをJS制御でスクロール
   - body固定はしない
   - 縦横同時スクロールを禁止
   - 6:30開始、数字は7:00から
   - 業者名・時間・横線を本体スクロールに同期
*/

(function(){
  const START_MIN = 6 * 60 + 30;
  const END_MIN = 20 * 60;
  const LABEL_START = 7;
  const LABEL_END = 19;

  const NAME_W = 132;
  const HOUR_W = 72;
  const HALF_HOUR_W = 36;
  const LANE_H = 48;
  const VISIBLE_LANES = 5;
  const GRID_VIEW_W = 480;
  const ROW_VIEW_H = LANE_H * VISIBLE_LANES;
  const GRID_W = ((END_MIN - START_MIN) / 60) * HOUR_W;

  function minutes(t){
    const parts = String(t || '00:00').split(':').map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }

  function xFromTime(t){
    return ((minutes(t) - START_MIN) / 60) * HOUR_W;
  }

  function clamp(n,min,max){
    return Math.max(min, Math.min(max, n));
  }

  function safeText(value){
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function lockPageSoft(){
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';
  }

  function render(root,data){
    if(!root) return;

    root.innerHTML = '';
    lockPageSoft();

    const contractors = data.contractors || [];
    const jobs = data.jobs || [];
    const totalH = Math.max(ROW_VIEW_H, contractors.length * LANE_H);

    const maxLeft = Math.max(0, GRID_W - GRID_VIEW_W);
    const maxTop = Math.max(0, totalH - ROW_VIEW_H);

    let viewLeft = 0;
    let viewTop = 0;

    const board = document.createElement('div');
    board.className = 'location-board';

    const corner = document.createElement('div');
    corner.className = 'location-corner';
    corner.textContent = '担当者';

    const timeHead = document.createElement('div');
    timeHead.className = 'location-time-head';

    const timeInner = document.createElement('div');
    timeInner.className = 'location-time-inner';
    timeInner.style.width = GRID_W + 'px';

    for(let h = LABEL_START; h <= LABEL_END; h++){
      const label = document.createElement('div');
      label.className = 'location-time-label';
      label.textContent = h + ':00';
      label.style.left = xFromTime(String(h).padStart(2,'0') + ':00') + 'px';
      timeInner.appendChild(label);
    }

    timeHead.appendChild(timeInner);

    const nameViewport = document.createElement('div');
    nameViewport.className = 'location-name-viewport';

    const nameInner = document.createElement('div');
    nameInner.className = 'location-name-inner';
    nameInner.style.height = totalH + 'px';

    contractors.forEach(c=>{
      const row = document.createElement('div');
      row.className = 'location-name-row';
      row.textContent = c.name;
      nameInner.appendChild(row);
    });

    nameViewport.appendChild(nameInner);

    const gridViewport = document.createElement('div');
    gridViewport.className = 'location-grid-viewport';

    const gridInner = document.createElement('div');
    gridInner.className = 'location-grid-inner';
    gridInner.style.width = GRID_W + 'px';
    gridInner.style.height = totalH + 'px';

    const gridBg = document.createElement('div');
    gridBg.className = 'location-grid-bg';
    gridBg.style.width = GRID_W + 'px';
    gridBg.style.height = totalH + 'px';
    gridInner.appendChild(gridBg);

    const nowLine = document.createElement('div');
    nowLine.className = 'location-now-line';
    nowLine.style.left = xFromTime('13:54') + 'px';
    nowLine.style.height = totalH + 'px';
    gridInner.appendChild(nowLine);

    jobs.forEach(j=>{
      const rowIndex = contractors.findIndex(c => c.id === j.contractorId);
      if(rowIndex < 0) return;

      const left = clamp(xFromTime(j.start), 0, GRID_W);
      const endX = clamp(xFromTime(j.end), 0, GRID_W);
      const width = Math.max(54, endX - left);

      const job = document.createElement('div');
      job.className = 'location-job ' + (j.type || '');
      job.style.left = left + 'px';
      job.style.top = (rowIndex * LANE_H + 6) + 'px';
      job.style.width = width + 'px';
      job.innerHTML =
        '<b>' + safeText(j.patient) + '</b>' +
        '<span>' + safeText(j.status) + '</span>';

      gridInner.appendChild(job);
    });

    gridViewport.appendChild(gridInner);

    const lineViewport = document.createElement('div');
    lineViewport.className = 'location-row-lines-viewport';

    const lineInner = document.createElement('div');
    lineInner.className = 'location-row-lines-inner';
    lineInner.style.height = totalH + 'px';

    lineViewport.appendChild(lineInner);

    const bar = document.createElement('div');
    bar.className = 'location-scrollbar';
    bar.innerHTML =
      '<div class="location-scroll-thumb"></div>' +
      '<div class="location-scroll-arrow">▶</div>';

    const thumb = bar.querySelector('.location-scroll-thumb');

    board.appendChild(corner);
    board.appendChild(timeHead);
    board.appendChild(nameViewport);
    board.appendChild(gridViewport);
    board.appendChild(lineViewport);
    board.appendChild(bar);
    root.appendChild(board);

    let pointerActive = false;
    let lockAxis = null;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let snapTimer = null;

    function apply(){
      gridInner.style.transform =
        'translate3d(' + (-viewLeft) + 'px,' + (-viewTop) + 'px,0)';

      timeInner.style.transform =
        'translate3d(' + (-viewLeft) + 'px,0,0)';

      nameInner.style.transform =
        'translate3d(0,' + (-viewTop) + 'px,0)';

      lineInner.style.transform =
        'translate3d(0,' + (-viewTop) + 'px,0)';

      const ratio = maxLeft <= 0 ? 0 : viewLeft / maxLeft;
      const thumbW = Math.max(60, (GRID_VIEW_W / GRID_W) * GRID_VIEW_W);
      const maxThumb = GRID_VIEW_W - thumbW - 2;

      thumb.style.width = thumbW + 'px';
      thumb.style.left = clamp(ratio * maxThumb, 0, maxThumb) + 'px';
    }

    function setView(left, top){
      viewLeft = clamp(left, 0, maxLeft);
      viewTop = clamp(top, 0, maxTop);
      apply();
    }

    function snap(axis){
      let targetLeft = viewLeft;
      let targetTop = viewTop;

      if(axis === 'x'){
        targetLeft = Math.round(viewLeft / HALF_HOUR_W) * HALF_HOUR_W;
      }

      if(axis === 'y'){
        targetTop = Math.round(viewTop / LANE_H) * LANE_H;
      }

      setView(targetLeft, targetTop);
    }

    function stopNative(e){
      e.preventDefault();
      e.stopPropagation();
    }

    gridViewport.addEventListener('pointerdown', e=>{
      pointerActive = true;
      lockAxis = null;

      startX = e.clientX;
      startY = e.clientY;
      startLeft = viewLeft;
      startTop = viewTop;

      if(gridViewport.setPointerCapture){
        gridViewport.setPointerCapture(e.pointerId);
      }

      stopNative(e);
    }, {passive:false});

    gridViewport.addEventListener('pointermove', e=>{
      if(!pointerActive) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if(!lockAxis && Math.max(Math.abs(dx), Math.abs(dy)) > 8){
        lockAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      }

      if(lockAxis === 'x'){
        setView(startLeft - dx, startTop);
      }

      if(lockAxis === 'y'){
        setView(startLeft, startTop - dy);
      }

      stopNative(e);
    }, {passive:false});

    function endPointer(e){
      if(!pointerActive) return;

      const axis = lockAxis || 'x';

      pointerActive = false;
      lockAxis = null;

      snap(axis);

      if(e){
        stopNative(e);
      }
    }

    gridViewport.addEventListener('pointerup', endPointer, {passive:false});
    gridViewport.addEventListener('pointercancel', endPointer, {passive:false});
    gridViewport.addEventListener('lostpointercapture', endPointer, {passive:false});

    gridViewport.addEventListener('wheel', e=>{
      const horizontal =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;

      if(horizontal){
        setView(viewLeft + (e.deltaX || e.deltaY), viewTop);
      }else{
        setView(viewLeft, viewTop + e.deltaY);
      }

      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(()=>{
        snap(horizontal ? 'x' : 'y');
      }, 140);

      stopNative(e);
    }, {passive:false});

    gridViewport.addEventListener('touchstart', stopNative, {passive:false});
    gridViewport.addEventListener('touchmove', stopNative, {passive:false});

    setView(0,0);
  }

  window.CareTaxiLocation = { render };

})();
