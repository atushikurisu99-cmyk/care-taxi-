(function(){
  function render(root,data){
    root.innerHTML='';
    const wrap=document.createElement('div'); wrap.className='day-cards';
    data.days.forEach(day=>{
      const card=document.createElement('article'); card.className='day-card';
      card.innerHTML='<b>'+day.date+'</b><p>案件数 '+day.jobs+'件</p><p class="'+(day.alert?'alert':'')+'">調整数 '+day.adjustments+'件</p>';
      const statuses=(day.statuses||[]).slice(0,3);
      while(statuses.length<2) statuses.push({text:'',type:'ghost'});
      statuses.forEach(s=>{const tag=document.createElement('span'); tag.className='tag '+s.type; tag.textContent=s.text||''; card.appendChild(tag);});
      wrap.appendChild(card);
    });
    root.appendChild(wrap);
  }
  window.CareTaxiDays={render};
})();
