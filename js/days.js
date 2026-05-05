window.AppDays = (() => {
  function render(root) {
    const days = window.AppData.days;
    root.innerHTML = `<div class="days-area"></div>`;
    const area = root.querySelector(".days-area");

    days.forEach((day) => {
      const card = document.createElement("div");
      card.className = "day-card";
      const adjustmentClass = day.alert ? "day-badge red" : "day-metric";
      card.innerHTML = `
        <div class="day-date">${day.date}</div>
        <div class="day-metric">案件数${day.jobs}件</div>
        <div class="${adjustmentClass}">調整数${day.adjustments}件</div>
        ${day.badge ? `<div class="day-badge ${day.badge.color}">${day.badge.text}</div>` : ""}
      `;
      area.appendChild(card);
    });
  }

  return { render };
})();
