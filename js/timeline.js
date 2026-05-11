(function(){
  const NAME_W = 130;
  const HOUR_W = 58;
  const ROW_H = 31;
  const START_HOUR = 7;
  const CANVAS_HOURS = 12;

  function minutesFromStart(time){
    const parts = String(time).split(':').map(Number);
    return ((parts[0] - START_HOUR) * 60) + parts[1];
  }

  function xFromTime(time){
    return (minutesFromStart(time) / 60) * HOUR_W;
  }

  function renderTimeline(){
    const data = window.CareTaxiData;
    const head = document.getElementById('timelineHead');
    const names = document.getElementById('laneNameScroll');
    const gridScroll = document.getElementById('laneGridScroll');
    const canvas = document.getElementById('laneGridCanvas');
    if(!data || !head || !names || !gridScroll || !canvas) return;

    head.innerHTML = '';
    names.innerHTML = '';
    canvas.innerHTML = '';

    const timeCanvas = document.createElement('div');
    timeCanvas.className = 'time-canvas';
    timeCanvas.style.width = `${CANVAS_HOURS * HOUR_W}px`;
    data.hours.forEach(function(hour, index){
      const label = document.createElement('div');
      label.className = 'time-label';
      label.style.left = `${index * HOUR_W}px`;
      label.textContent = hour;
      timeCanvas.appendChild(label);
    });
    head.appendChild(timeCanvas);

    const nameCanvas = document.createElement('div');
    nameCanvas.className = 'name-canvas';
    nameCanvas.style.height = `${data.contractors.length * ROW_H}px`;
    data.contractors.forEach(function(contractor){
      const row = document.createElement('div');
      row.className = 'name-row';
      row.textContent = contractor.name;
      nameCanvas.appendChild(row);
    });
    names.appendChild(nameCanvas);

    canvas.style.width = `${CANVAS_HOURS * HOUR_W}px`;
    canvas.style.height = `${data.contractors.length * ROW_H}px`;
    data.contractors.forEach(function(contractor){
      const row = document.createElement('div');
      row.className = 'lane-row';
      row.dataset.contractorId = contractor.id;
      canvas.appendChild(row);
    });

    data.jobs.forEach(function(job){
      const row = canvas.querySelector('.lane-row[data-contractor-id="' + job.contractorId + '"]');
      if(!row) return;
      const left = Math.max(0, xFromTime(job.start));
      const width = Math.max(34, xFromTime(job.end) - xFromTime(job.start));
      const block = document.createElement('button');
      block.type = 'button';
      block.className = 'job-block';
      block.style.left = `${left}px`;
      block.style.width = `${width}px`;
      block.innerHTML = '<b>' + job.patient + '</b><span>' + job.status + '</span>';
      block.addEventListener('click', function(){ fillDetail(job); });
      row.appendChild(block);
    });

    const now = document.createElement('div');
    now.className = 'now-line';
    now.style.left = `${xFromTime('13:54')}px`;
    now.style.height = `${data.contractors.length * ROW_H}px`;
    canvas.appendChild(now);

    gridScroll.addEventListener('scroll', function(){
      names.scrollTop = gridScroll.scrollTop;
      head.scrollLeft = gridScroll.scrollLeft;
    }, {passive:true});
  }

  function fillDetail(job){
    const root = document.getElementById('detailList');
    if(!root) return;
    root.innerHTML = '';
    [
      job.start + '〜' + job.end,
      job.patient,
      (job.from || '未入力') + ' → ' + (job.to || '未入力'),
      getContractorName(job.contractorId),
      job.status,
      job.note || 'ーーー'
    ].forEach(function(text){
      const div = document.createElement('div');
      div.textContent = text;
      root.appendChild(div);
    });
  }

  function getContractorName(id){
    const data = window.CareTaxiData;
    const hit = data.contractors.find(function(c){ return c.id === id; });
    return hit ? hit.name : '';
  }

  function renderStatus(){
    const root = document.getElementById('statusList');
    const data = window.CareTaxiData;
    if(!root || !data) return;
    root.innerHTML = '';
    data.contractors.slice(0, 7).forEach(function(contractor){
      const row = document.createElement('div');
      row.innerHTML = '<b>' + contractor.name + '</b><span>' + contractor.status + '</span>';
      root.appendChild(row);
    });
  }

  window.CareTaxiTimeline = { render: renderTimeline, renderStatus: renderStatus };
})();
