(() => {
  const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

  function addDays(base, amount) {
    const d = new Date(base);
    d.setDate(d.getDate() + amount);
    return d;
  }

  function isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  function renderDays() {
    const root = document.getElementById("daysList");
    if (!root) return;

    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

    root.innerHTML = days.map((date) => {
      const weekIndex = date.getDay();
      const isToday = isSameDate(date, today);
      const isSaturday = weekIndex === 6;
      const isHoliday = weekIndex === 0;

      const classes = [
        "day-card",
        isToday ? "today" : "",
        isSaturday ? "saturday" : "",
        isHoliday ? "holiday" : "",
      ].filter(Boolean).join(" ");

      return `
        <button class="${classes}" type="button">
          <div class="day-date">${date.getMonth() + 1}/${date.getDate()}</div>
          <div class="day-week">（${WEEK[weekIndex]}）</div>
          ${isToday ? '<div class="day-today">本日</div>' : '<div class="day-info">案件数 8件<br>調整数 8件</div>'}
        </button>
      `;
    }).join("");
  }

  function init() {
    renderDays();
  }

  window.AppDays = { init, renderDays };
})();
