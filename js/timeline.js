(() => {
  const VENDORS = [
    "担当者",
    "協力業者 A",
    "協力業者 B",
    "協力業者 C",
    "協力業者 D",
    "協力業者 E",
    "協力業者 F",
    "協力業者 G",
  ];

  const START_HOUR = 7;
  const END_HOUR = 19;
  const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  function getTimelineWidth() {
    const grid = document.getElementById("timelineGrid");
    if (!grid) return 0;
    return grid.clientWidth;
  }

  function hourToX(hour, minute = 0) {
    const width = getTimelineWidth();
    const totalMinutes = (END_HOUR - START_HOUR) * 60;
    const currentMinutes = (hour - START_HOUR) * 60 + minute;
    return Math.max(0, Math.min(width, (currentMinutes / totalMinutes) * width));
  }

  function renderVendorColumn() {
    const root = document.getElementById("vendorColumn");
    if (!root) return;

    root.innerHTML = VENDORS
      .map((name, index) => {
        const cls = index === 0 ? "vendor-row header" : "vendor-row";
        return `<div class="${cls}">${name}</div>`;
      })
      .join("");
  }

  function renderTimeAxis() {
    const root = document.getElementById("timeAxis");
    if (!root) return;

    root.innerHTML = HOURS
      .map((hour) => {
        const x = hourToX(hour, 0);
        return `<div class="time-label" style="left:${x}px;">${hour}:00</div>`;
      })
      .join("");
  }

  function renderJobs() {
    const grid = document.getElementById("timelineGrid");
    if (!grid) return;

    const block = document.createElement("div");
    block.className = "job-block";
    block.style.left = `${hourToX(8, 30)}px`;
    block.style.width = `${hourToX(10, 30) - hourToX(8, 30)}px`;
    block.innerHTML = `
      <div class="job-name">田中様</div><div class="job-status">状態</div>
      <div class="job-name">佐藤様</div><div class="job-status">状態</div>
      <div class="job-name">山田様</div><div class="job-status">状態</div>
    `;

    grid.appendChild(block);
  }

  function renderCurrentLine() {
    const grid = document.getElementById("timelineGrid");
    if (!grid) return;

    const old = grid.querySelector(".current-line");
    if (old) old.remove();

    const now = new Date();
    let x;

    if (now.getHours() < START_HOUR) {
      x = 0;
    } else if (now.getHours() >= END_HOUR) {
      x = getTimelineWidth();
    } else {
      x = hourToX(now.getHours(), now.getMinutes());
    }

    const line = document.createElement("div");
    line.className = "current-line";
    line.style.left = `${x}px`;
    grid.appendChild(line);
  }

  function redraw() {
    const grid = document.getElementById("timelineGrid");
    if (!grid) return;

    grid.innerHTML = "";
    renderTimeAxis();
    renderJobs();
    renderCurrentLine();
  }

  function init() {
    renderVendorColumn();
    redraw();

    window.setInterval(renderCurrentLine, 1000 * 60);
    window.addEventListener("resize", () => {
      window.requestAnimationFrame(redraw);
    });
  }

  window.AppTimeline = {
    init,
    redraw,
  };
})();
