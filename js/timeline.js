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

  const RANGE_START_MIN = 6 * 60 + 30;
  const RANGE_END_MIN = 20 * 60;
  const LABEL_START_HOUR = 7;
  const LABEL_END_HOUR = 19;
  const ROW_COUNT = 7;

  function gridWidth() {
    return document.getElementById("timelineGrid")?.clientWidth || 0;
  }

  function minuteToX(totalMinutes) {
    const width = gridWidth();
    const range = RANGE_END_MIN - RANGE_START_MIN;
    return ((totalMinutes - RANGE_START_MIN) / range) * width;
  }

  function timeToX(hour, minute = 0) {
    return minuteToX(hour * 60 + minute);
  }

  function renderVendorColumn() {
    const root = document.getElementById("vendorColumn");
    if (!root) return;

    root.innerHTML = VENDORS.map((name, index) => {
      const cls = index === 0 ? "vendor-row header" : "vendor-row";
      return `<div class="${cls}">${name}</div>`;
    }).join("");
  }

  function renderTimeAxis() {
    const root = document.getElementById("timeAxis");
    if (!root) return;

    const labels = [];
    for (let h = LABEL_START_HOUR; h <= LABEL_END_HOUR; h++) {
      labels.push(`<div class="time-label" style="left:${timeToX(h, 0)}px;">${h}:00</div>`);
    }
    root.innerHTML = labels.join("");
  }

  function renderGridLines() {
    const grid = document.getElementById("timelineGrid");
    if (!grid) return;

    const lines = [];

    for (let m = RANGE_START_MIN; m <= RANGE_END_MIN; m += 30) {
      const isHour = m % 60 === 0;
      const x = minuteToX(m);
      lines.push(`<div class="grid-line ${isHour ? "hour" : "half"}" style="left:${x}px;"></div>`);
    }

    for (let i = 0; i <= ROW_COUNT; i++) {
      const y = (i / ROW_COUNT) * 100;
      lines.push(`<div class="row-line" style="top:${y}%;"></div>`);
    }

    grid.insertAdjacentHTML("beforeend", lines.join(""));
  }

  function renderJobs() {
    const grid = document.getElementById("timelineGrid");
    if (!grid) return;

    const block = document.createElement("div");
    block.className = "job-block";
    block.style.left = `${timeToX(8, 30)}px`;
    block.style.width = `${timeToX(10, 30) - timeToX(8, 30)}px`;
    block.innerHTML = `
      <div>田中様</div><div class="job-status">状態</div>
      <div>佐藤様</div><div class="job-status">状態</div>
      <div>山田様</div><div class="job-status">状態</div>
    `;
    grid.appendChild(block);
  }

  function renderCurrentLine() {
    const grid = document.getElementById("timelineGrid");
    if (!grid) return;

    grid.querySelector(".current-line")?.remove();

    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    if (nowMin < RANGE_START_MIN || nowMin >= RANGE_END_MIN) return;

    const line = document.createElement("div");
    line.className = "current-line";
    line.style.left = `${minuteToX(nowMin)}px`;
    grid.appendChild(line);
  }

  function redraw() {
    const grid = document.getElementById("timelineGrid");
    if (!grid) return;

    grid.innerHTML = "";
    renderTimeAxis();
    renderGridLines();
    renderJobs();
    renderCurrentLine();
  }

  function init() {
    renderVendorColumn();
    redraw();
    setInterval(renderCurrentLine, 60000);
    window.addEventListener("resize", () => requestAnimationFrame(redraw));
  }

  window.AppTimeline = { init, redraw };
})();
