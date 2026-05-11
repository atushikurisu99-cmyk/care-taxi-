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
  function xFromTime(t){ return ((minutes(t) - START_MIN) / 60) * HOUR_W; }
  function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }
  function safeText(value){
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;');
  }

  function lockPageBelowHeader(){
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.position = 'fixed';
    document.body.style.inset = '0';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    if(!window.__careTaxiTouchLock){
      window.__careTaxiTouchLock = true;
      document.addEventListener('touchmove', function(e){
        const inLocation = e.target && e.target.closest && e.target.closest('.location-grid-viewport');
        if(!inLocation){ e.preventDefault(); }
      }, {passive:false});
    }
  }

  function render(root,data){
    if(!root) return;
    root.innerHTML = '';
    lockPageBelowHeader();

    const contractors = data.contractors || [];
    const jobs = data.jobs || [];
    const totalH = Math.max(ROW_VIEW_H, contractors.length * LANE_H);

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
      job.innerHTML = '<b>' + safeText(j.patient) + '</b><span>' + safeText(j.status) + '</span>';
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
    bar.innerHTML = '<div class="location-scroll-thumb"></div><div class="location-scroll-arrow">▶</div>';
    const thumb = bar.querySelector('.location-scroll-thumb');

    board.appendChild(corner);
    board.appendChild(timeHead);
    board.appendChild(nameViewport);
    board.appendChild(gridViewport);
    board.appendChild(lineViewport);
    board.appendChild(bar);
    root.appendChild(board);

    let lockAxis = null;
    let pointerActive = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let snapping = false;

    function sync(){
      timeInner.style.transform = 'translateX(' + (-gridViewport.scrollLeft) + 'px)';
      nameInner.style.transform = 'translateY(' + (-gridViewport.scrollTop) + 'px)';
      lineInner.style.transform = 'translateY(' + (-gridViewport.scrollTop) + 'px)';

      const maxScroll = Math.max(1, GRID_W - GRID_VIEW_W);
      const ratio = gridViewport.scrollLeft / maxScroll;
      const thumbW = Math.max(60, (GRID_VIEW_W / GRID_W) * GRID_VIEW_W);
      const maxThumb = GRID_VIEW_W - thumbW - 2;
      thumb.style.width = thumbW + 'px';
      thumb.style.left = clamp(ratio * maxThumb, 0, maxThumb) + 'px';
    }

    function snap(){
      if(pointerActive || snapping) return;
      snapping = true;
      const targetTop = Math.round(gridViewport.scrollTop / LANE_H) * LANE_H;
      const targetLeft = Math.round(gridViewport.scrollLeft / HALF_HOUR_W) * HALF_HOUR_W;
      gridViewport.scrollTo({ left: targetLeft, top: targetTop, behavior: 'smooth' });
      window.setTimeout(()=>{ snapping = false; sync(); }, 180);
    }

    gridViewport.addEventListener('scroll', sync, {passive:true});
    gridViewport.addEventListener('pointerdown', e=>{
      pointerActive = true;
      lockAxis = null;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = gridViewport.scrollLeft;
      startTop = gridViewport.scrollTop;
      if(gridViewport.setPointerCapture) gridViewport.setPointerCapture(e.pointerId);
    });
    gridViewport.addEventListener('pointermove', e=>{
      if(!pointerActive) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if(!lockAxis && Math.max(Math.abs(dx), Math.abs(dy)) > 8){
        lockAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      }
      if(lockAxis === 'x'){
        e.preventDefault();
        gridViewport.scrollLeft = startLeft - dx;
        gridViewport.scrollTop = startTop;
      }else if(lockAxis === 'y'){
        e.preventDefault();
        gridViewport.scrollTop = startTop - dy;
        gridViewport.scrollLeft = startLeft;
      }
    }, {passive:false});
    function endPointer(){
      if(!pointerActive) return;
      pointerActive = false;
      lockAxis = null;
      snap();
    }
    gridViewport.addEventListener('pointerup', endPointer);
    gridViewport.addEventListener('pointercancel', endPointer);
    gridViewport.addEventListener('lostpointercapture', endPointer);
    gridViewport.addEventListener('wheel', e=>{
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
      e.preventDefault();
      if(horizontal){ gridViewport.scrollLeft += e.deltaX || e.deltaY; }
      else{ gridViewport.scrollTop += e.deltaY; }
      window.clearTimeout(gridViewport._snapTimer);
      gridViewport._snapTimer = window.setTimeout(snap, 140);
    }, {passive:false});

    gridViewport.scrollLeft = 0;
    gridViewport.scrollTop = 0;
    sync();
  }

  window.CareTaxiLocation = { render };
})();
