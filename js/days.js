(() => {
  const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

  function addDays(base, amount) {
    const d = new Date(base);
    d.setDate(d.getDate() + amount);
    return d;
  }

  function isSameDate(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function isHolidayLike(date) {
    const day = date.getDay();
    return day === 0;
  }

  function renderDays() {
    const root = document.getElementById("daysList");
    if (!root) return;

    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

    root.innerHTML = days
      .map((date) => {
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const week = WEEK[date.getDay()];

        const todayClass = isSameDate(date, today) ? "today" : "";
        const saturdayClass = date.getDay() === 6 ? "saturday" : "";
        const holidayClass = isHolidayLike(date) ? "holiday" : "";
        const classes = ["day-card", todayClass, saturdayClass, holidayClass].filter(Boolean).join(" ");

        return `
          <button class="${classes}" type="button">
            <div class="day-date">${month}/${day}</div>
            <div class="day-week">（${week}）</div>
            ${isSameDate(date, today) ? '<div class="day-today">本日</div>' : '<div class="day-info">案件数 8件<br>調整数 8件</div>'}
          </button>
        `;
      })
      .join("");
  }

  function init() {
    renderDays();
  }

  window.AppDays = {
    init,
    renderDays,
  };
})();
