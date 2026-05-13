window.CareTaxiDays = {
  render(root){
    const colorClass = { blue:'notice-blue', yellow:'notice-yellow', pink:'notice-pink', green:'notice-green', gray:'notice-gray' };
    const cards = window.CareTaxiData.days.map((day, index) => {
      const kindClass = day.kind === 'today' ? 'is-today' : (day.kind === 'holiday' ? 'is-holiday' : '');
      const notices = day.notices.slice(0,3).map(n => `<div class="day-notice ${colorClass[n.color] || 'notice-gray'}">${n.label}</div>`).join('');
      const empty = Array.from({length: Math.max(0, 3 - Math.min(3, day.notices.length))}).map(()=>'<div></div>').join('');
      return `
        <button class="day-card ${kindClass}" type="button" data-day-index="${index}">
          <div class="day-date">${day.date}</div>
          <div></div>
          <div class="day-count">案件 ${day.cases}</div>
          <div class="day-adjust">調整 ${day.adjusts}</div>
          ${notices}${empty}
        </button>
      `;
    }).join('');
    root.innerHTML = `
      <section class="days-wrap">
        <div class="section-title">DAYS</div>
        <div class="days-body">${cards}</div>
      </section>
    `;
    root.querySelectorAll('[data-day-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.CareTaxiDetail.showDay(window.CareTaxiData.days[Number(btn.dataset.dayIndex)]);
      });
    });
  }
};
