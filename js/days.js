window.AppDays = (() => {
  function render(root) {
    root.innerHTML = `
      <div class="days-list">
        ${window.AppData.days.map(day => `
          <div class="day-card">
            <div class="day-date">${day.date}</div>
            <div class="day-line">案件数${day.jobs}件</div>
            <div class="day-line">調整数${day.adjustments}件</div>
            ${[0,1,2].map(i => {
              const s = day.statuses[i];
              if (!s) return `<div class="day-line">&nbsp;</div>`;
              return `<div class="day-status ${s.type || ""}">${s.text}</div>`;
            }).join("")}
          </div>
        `).join("")}
      </div>
    `;
  }
  return { render };
})();
