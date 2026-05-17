/*
  Shell v8
  PDFトレース確認用の軽い描画だけを行う。
*/
(function () {
  const lanes = ["協力業者 A", "協力業者 B", "協力業者 C", "協力業者 D", "協力業者 E", "協力業者 F", "協力業者 G"];
  const jobs = [
    { lane: 0, start: "08:30", end: "10:30", name: "田中様", state: "向かい中" },
    { lane: 1, start: "08:30", end: "10:30", name: "佐藤様", state: "搬送中" },
    { lane: 2, start: "08:30", end: "10:30", name: "山田様", state: "終了" },
  ];
  const days = ["4/29", "4/30", "5/1", "5/2", "5/3", "5/4", "5/5"];
  const statuses = ["待機", "向かい中", "向かい中", "搬送中", "終了", "終了", "終了"];
  const PX_PER_HALF_HOUR = 42;
  const START_MIN = 6 * 60 + 30;

  function lockPage() {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  function toX(time) {
    const [h, m] = time.split(":").map(Number);
    return ((h * 60 + m) - START_MIN) / 30 * PX_PER_HALF_HOUR;
  }

  function renderLocation() {
    const root = document.getElementById("location-root");
    if (!root) return;

    const hourLabels = [];
    for (let h = 7; h <= 20; h += 1) {
      hourLabels.push(`<div class="hourLabel" style="left:${toX(String(h).padStart(2, "0") + ":00")}px">${h}:00</div>`);
    }

    const nameRows = lanes.map((name) => `<div class="nameRow">${name}</div>`).join("");
    const gridRows = lanes.map(() => `<div class="gridRow"></div>`).join("");
    const jobBlocks = jobs.map((job) => {
      const left = toX(job.start);
      const width = toX(job.end) - toX(job.start);
      const top = job.lane * 32;
      return `<div class="jobBlock" style="left:${left}px;top:${top}px;width:${width}px"><div>${job.name}</div><div class="state">${job.state}</div></div>`;
    }).join("");

    const nowLeft = toX("13:10");

    root.innerHTML = `
      <div class="timelineShell">
        <div class="timelineCorner">担当者</div>
        <div class="timeHeaderClip"><div class="timeHeader">${hourLabels.join("")}</div></div>
        <div class="laneNames">${nameRows}</div>
        <div class="timelineViewport" id="timeline-viewport">
          <div class="gridBody">${gridRows}${jobBlocks}<div class="nowLine" style="left:${nowLeft}px"></div></div>
        </div>
        <div class="timelineScrollSpacer"></div>
      </div>`;

    const viewport = document.getElementById("timeline-viewport");
    if (viewport) viewport.scrollLeft = toX("07:00") - 20;
  }

  function renderDays() {
    const root = document.getElementById("days-root");
    if (!root) return;
    root.innerHTML = days.map((d, index) => {
      const badge = index === 4
        ? `<div class="notice">請求書発行</div><div class="notice empty">.</div><div class="notice empty">.</div>`
        : index === 5
          ? `<div class="notice yellow">支払い</div>`
          : "";
      return `<div class="dayCard"><div class="dayDate">${d}</div><div>案件数 8件</div><div>調整数 ${index === 1 ? 7 : 8}件</div>${badge}</div>`;
    }).join("");
  }

  function renderStatus() {
    const root = document.getElementById("status-root");
    if (!root) return;
    root.innerHTML = lanes.map((name, index) => {
      return `<div class="statusRow"><div class="statusName">${name}</div><div class="statusValue">${statuses[index]}</div></div>`;
    }).join("");
  }

  function boot() {
    if (new URLSearchParams(location.search).get("guide") === "1") {
      document.getElementById("app").classList.add("guide");
    }
    renderLocation();
    renderDays();
    renderStatus();
    lockPage();
  }

  document.addEventListener("touchmove", function (event) {
    const target = event.target.closest && event.target.closest(".timelineViewport");
    if (!target) event.preventDefault();
  }, { passive: false });

  window.addEventListener("scroll", lockPage);
  window.addEventListener("resize", lockPage);
  window.addEventListener("orientationchange", function () { setTimeout(lockPage, 80); });
  document.addEventListener("DOMContentLoaded", boot);
})();
