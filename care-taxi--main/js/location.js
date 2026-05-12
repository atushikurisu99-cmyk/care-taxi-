/* LOCATION PATCH v18.0
   - board全体でタッチ/マウスを拾う
   - transform scale中でも移動量を補正
   - iPad Safariではtouchを優先し、PointerEventには依存しない
*/
(function(){
  const START_MIN = 6 * 60 + 30;
  const END_MIN = 20 * 60;
  const LABEL_START = 7;
  const LABEL_END = 19;

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

  function getScale(el){
    const rect = el.getBoundingClientRect();
    const w = el.offsetWidth || rect.width || 1;
    return rect.width ? rect.width / w : 1;
  }

  function render(root,data){
    if(!root) return;

    root.innerHTML = '';

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

    let dragging = false;
    let lockAxis = null;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let dragScale = 1;
    let snapTimer = null;
    let recentTouchTime = 0;

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

    function startDrag(x,y){
      dragging = true;
      lockAxis = null;
      startX = x;
      startY = y;
      startLeft = viewLeft;
      startTop = viewTop;
      dragScale = getScale(board) || 1;
      board.classList.add('is-dragging');
    }

    function moveDrag(x,y){
      if(!dragging) return;

      const dx = (x - startX) / dragScale;
      const dy = (y - startY) / dragScale;

      if(!lockAxis && Math.max(Math.abs(dx), Math.abs(dy)) > 6){
        lockAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      }

      if(lockAxis === 'x'){
        setView(startLeft - dx, startTop);
      }

      if(lockAxis === 'y'){
        setView(startLeft, startTop - dy);
      }
    }

    function endDrag(){
      if(!dragging) return;

      const axis = lockAxis || 'x';
      dragging = false;
      lockAxis = null;
      board.classList.remove('is-dragging');
      snap(axis);
    }

    board.addEventListener('touchstart', function(e){
      if(!e.touches || !e.touches.length) return;
      recentTouchTime = Date.now();
      const t = e.touches[0];
      startDrag(t.clientX, t.clientY);
      e.preventDefault();
    }, {passive:false});

    board.addEventListener('touchmove', function(e){
      if(!e.touches || !e.touches.length) return;
      recentTouchTime = Date.now();
      const t = e.touches[0];
      moveDrag(t.clientX, t.clientY);
      e.preventDefault();
    }, {passive:false});

    board.addEventListener('touchend', function(e){
      recentTouchTime = Date.now();
      endDrag();
      e.preventDefault();
    }, {passive:false});

    board.addEventListener('touchcancel', function(e){
      recentTouchTime = Date.now();
      endDrag();
      e.preventDefault();
    }, {passive:false});

    board.addEventListener('mousedown', function(e){
      if(Date.now() - recentTouchTime < 700) return;
      startDrag(e.clientX, e.clientY);
      e.preventDefault();
    });

    window.addEventListener('mousemove', function(e){
      moveDrag(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', function(){
      endDrag();
    });

    board.addEventListener('wheel', function(e){
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey;
      const scale = getScale(board) || 1;

      if(horizontal){
        setView(viewLeft + ((e.deltaX || e.deltaY) / scale), viewTop);
      }else{
        setView(viewLeft, viewTop + (e.deltaY / scale));
      }

      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(function(){
        snap(horizontal ? 'x' : 'y');
      }, 140);

      e.preventDefault();
    }, {passive:false});

    setView(0,0);
  }

  window.CareTaxiLocation = { render };
})();
