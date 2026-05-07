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
  const INITIAL_VISIBLE_END_MIN = 16 * 60;
  const LABEL_START_HOUR = 7;
  const LABEL_END_HOUR = 19;
  const ROW_COUNT = 7;

  function byId(id) {
    return document.getElementById(id);
  }

  function timelineWidth() {
    return byId("timelineGrid")?.clientWidth || 0;
  }

  function minuteToX(totalMinutes) {
    const width = timelineWidth();
    const range = RANGE_END_MIN - RANGE_START_MIN;
    return ((totalMinutes - RANGE_START_MIN) / range) * width;
  }

  function timeToX(hour, minute = 0) {
    return minuteToX(hour * 60 + minute);
  }

  function setTimelineTotalWidth() {
    const scroller = byId("timelineScroller");
    const content = byId("timelineContent");
    const grid = byId("timelineGrid");
    if (!scroller || !content || !grid) return;

    const viewWidth = scroller.clientWidth;
    const visibleRange = INITIAL_VISIBLE_END_MIN - RANGE_START_MIN;
    const totalRange = RANGE_END_MIN - RANGE_START_MIN;
    const totalWidth = Math.round(viewWidth * (totalRange / visibleRange));

    document.documentElement.style.setProperty("--timeline-total-w", `${totalWidth}px`);
  }

  function renderVendorColumn() {
    const root = byId("vendorColumn");
    if (!root) return;

    root.innerHTML = VENDORS.map((name, index) => {
      const cls = index === 0 ? "vendor-row header" : "vendor-row";
      return `<div class="${cls}">${name}</div>`;
    }).join("");
  }

  function renderTimeAxis() {
    const root = byId("timeAxis");
    if (!root) return;

    const labels = [];
    for (let h = LABEL_START_HOUR; h <= LABEL_END_HOUR; h++) {
      labels.push(`<div class="time-label" style="left:${timeToX(h, 0)}px;">${h}:00</div>`);
    }
    root.innerHTML = labels.join("");
  }

  function renderGridLines() {
    const grid = byId("timelineGrid");
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
    const grid = byId("timelineGrid");
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
    const grid = byId("timelineGrid");
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

  function updateFakeScrollbar() {
    const scroller = byId("timelineScroller");
    const track = byId("scrollbarTrack");
    const thumb = byId("scrollbarThumb");
    if (!scroller || !track || !thumb) return;

    const maxScroll = scroller.scrollWidth - scroller.clientWidth;
    const trackWidth = track.clientWidth;
    const ratio = scroller.clientWidth / scroller.scrollWidth;
    const thumbWidth = Math.max(36, Math.round(trackWidth * ratio));
    const maxThumbLeft = trackWidth - thumbWidth;
    const left = maxScroll > 0 ? Math.round((scroller.scrollLeft / maxScroll) * maxThumbLeft) : 0;

    thumb.style.width = `${thumbWidth}px`;
    thumb.style.left = `${left}px`;
  }

  function setupScrollbarControls() {
    const scroller = byId("timelineScroller");
    const track = byId("scrollbarTrack");
    const leftBtn = byId("scrollLeftBtn");
    const rightBtn = byId("scrollRightBtn");
    if (!scroller || !track || !leftBtn || !rightBtn) return;

    scroller.addEventListener("scroll", updateFakeScrollbar, { passive: true });

    leftBtn.addEventListener("click", () => {
      scroller.scrollBy({ left: -scroller.clientWidth * 0.45, behavior: "smooth" });
    });

    rightBtn.addEventListener("click", () => {
      scroller.scrollBy({ left: scroller.clientWidth * 0.45, behavior: "smooth" });
    });

    track.addEventListener("click", (event) => {
      const rect = track.getBoundingClientRect();
      const rate = (event.clientX - rect.left) / rect.width;
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      scroller.scrollTo({ left: Math.max(0, Math.min(maxScroll, maxScroll * rate)), behavior: "smooth" });
    });
  }

  function redraw() {
    const grid = byId("timelineGrid");
    if (!grid) return;

    setTimelineTotalWidth();
    grid.innerHTML = "";
    renderTimeAxis();
    renderGridLines();
    renderJobs();
    renderCurrentLine();
    updateFakeScrollbar();
  }

  function init() {
    renderVendorColumn();
    redraw();
    setupScrollbarControls();
    setInterval(renderCurrentLine, 60000);
    window.addEventListener("resize", () => requestAnimationFrame(redraw));
  }

  window.AppTimeline = { init, redraw };
})();
