(function(){
  const START_MIN=7*60;
  const HOUR_W=50;
  const NAME_W=130;
  const LANE_H=34;
  const HEADER_H=24;
  const GRID_W=650;
  function minutes(t){const [h,m]=t.split(':').map(Number);return h*60+m;}
  function xFromTime(t){return Math.max(0,((minutes(t)-START_MIN)/60)*HOUR_W);}
  function render(root,data){
    root.innerHTML='';
    const board=document.createElement('div'); board.className='location-board';
    const head=document.createElement('div'); head.className='location-head';
    const driverHead=document.createElement('div'); driverHead.className='location-driver-head'; driverHead.textContent='担当者';
    const timeScrollHead=document.createElement('div'); timeScrollHead.className='time-scroll-head';
    const timeInner=document.createElement('div'); timeInner.className='time-head-inner';
    data.hours.forEach((h,i)=>{const el=document.createElement('div'); el.className='time-label'; el.style.left=(i*HOUR_W)+'px'; el.textContent=h; timeInner.appendChild(el);});
    timeScrollHead.appendChild(timeInner); head.appendChild(driverHead); head.appendChild(timeScrollHead);

    const body=document.createElement('div'); body.className='location-body';
    const lanes=document.createElement('div'); lanes.className='lanes-inner'; lanes.style.height=(data.contractors.length*LANE_H)+'px';
    lanes.style.minWidth=(NAME_W+GRID_W)+'px';

    const now=document.createElement('div'); now.className='now-line'; now.style.left=(NAME_W+xFromTime('13:54'))+'px'; now.style.height=(data.contractors.length*LANE_H)+'px';
    lanes.appendChild(now);

    data.contractors.forEach(c=>{
      const lane=document.createElement('div'); lane.className='vendor-lane'; lane.dataset.contractorId=c.id;
      const name=document.createElement('div'); name.className='vendor-name'; name.textContent=c.name;
      const grid=document.createElement('div'); grid.className='lane-grid';
      lane.appendChild(name); lane.appendChild(grid);
      data.jobs.filter(j=>j.contractorId===c.id).forEach(j=>{
        const job=document.createElement('div'); job.className='job-block '+(j.type||'');
        const left=NAME_W+xFromTime(j.start);
        const width=Math.max(42,xFromTime(j.end)-xFromTime(j.start));
        job.style.left=left+'px'; job.style.width=width+'px';
        job.innerHTML='<b>'+j.patient+'</b><span>'+j.status+'</span>';
        lane.appendChild(job);
      });
      lanes.appendChild(lane);
    });
    body.appendChild(lanes);

    const bar=document.createElement('div'); bar.className='location-scrollbar';
    bar.innerHTML='<div class="location-scroll-thumb"></div><div class="location-scroll-arrow">▶</div>';
    body.addEventListener('scroll',()=>{timeInner.style.transform='translateX('+(-body.scrollLeft)+'px)';},{passive:true});
    board.appendChild(head); board.appendChild(body); board.appendChild(bar); root.appendChild(board);
  }
  window.CareTaxiLocation={render};
})();
