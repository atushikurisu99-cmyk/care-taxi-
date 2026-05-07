(() => {
  const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatHeaderDateTime(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const week = WEEK[date.getDay()];
    const hour = pad2(date.getHours());
    const minute = pad2(date.getMinutes());
    return `${month}/${day}（${week}） ${hour}:${minute}`;
  }

  function updateHeaderDateTime() {
    const el = document.getElementById("headerDateTime");
    if (!el) return;
    el.textContent = formatHeaderDateTime(new Date());
  }

  function renderStatus() {
    const statuses = [
      ["協力業者 A", "待機"],
      ["協力業者 B", "向かい中"],
      ["協力業者 C", "向かい中"],
      ["協力業者 D", "搬送中"],
      ["協力業者 E", "終了"],
      ["協力業者 F", "終了"],
      ["協力業者 G", "終了"],
    ];

    const root = document.getElementById("statusList");
    if (!root) return;

    root.innerHTML = statuses
      .map(([name, state]) => `<div>${name}</div><div>${state}</div>`)
      .join("");
  }

  function init() {
    updateHeaderDateTime();
    renderStatus();
    window.setInterval(updateHeaderDateTime, 1000 * 15);

    if (window.AppTimeline && typeof window.AppTimeline.init === "function") {
      window.AppTimeline.init();
    }

    if (window.AppDays && typeof window.AppDays.init === "function") {
      window.AppDays.init();
    }
  }

  window.AppMain = {
    init,
    formatHeaderDateTime,
  };

  document.addEventListener("DOMContentLoaded", init);
})();
