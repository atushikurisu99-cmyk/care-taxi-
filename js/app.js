(() => {
  const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatHeaderDateTime(date) {
    return `${date.getMonth() + 1}/${date.getDate()}（${WEEK[date.getDay()]}） ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  }

  function updateHeaderDateTime() {
    const el = document.getElementById("headerDateTime");
    if (el) el.textContent = formatHeaderDateTime(new Date());
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
    root.innerHTML = statuses.map(([name, state]) => `<div>${name}</div><div>${state}</div>`).join("");
  }

  function init() {
    updateHeaderDateTime();
    renderStatus();
    setInterval(updateHeaderDateTime, 15000);

    window.AppTimeline?.init?.();
    window.AppDays?.init?.();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
