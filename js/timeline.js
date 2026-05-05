window.AppTimeline = (() => {
  const U = window.AppUtils;
  const START_MIN = 7 * 60;
  const HOURS = 13;
  const END_MIN = START_MIN + HOURS * 60;
  const PX_PER_MIN = 3.05;
  const TRACK_W = HOURS * 60 * PX_PER_MIN;
  const LANE_COUNT = 7;
  const state = { root:null, viewport:null, track:null, timeTrack:null, thumb:null, nowLine:null, selectedId:null, offset:0, maxOffset:0, isDragging:false, dragStartX:0, dragStartOffset:0, returnTimer:null, animFrame:null };

  function render(root, onSelect) {
    state.root = root;
    root.innerHTML = `
      <div class="timeline">
        <div class="timeline-left">
          <div class="timeline-left-head">${window.AppTexts.labels.driver}</div>
          ${window.AppData.drivers.map((d, i) => `<div class="timeline-driver" style="top:${28 + i * laneH(root)}px">${d.name}</div>`).join("")}
        </div>
        <div class="timeline-time-head"><div class="timeline-time-track"></div></div>
        <div class="timeline-view"><div class="timeline-track"></div><div class="now-line"></div></div>
        <div class="timeline-scrollbar"><div class="timeline-thumb"></div></div>
      </div>`;
    state.viewport = root.querySelector(".timeline-view");
    state.track = root.querySelector(".timeline-track");
    state.timeTrack = root.querySelector(".timeline-time-track");
    state.thumb = root.querySelector(".timeline-thumb");
    state.nowLine = root.querySelector(".now-line");
    buildGrid();
    buildJobs(onSelect);
    bindDrag();
    recalc();
    requestAnimationFrame(() => { jumpToNow(); scheduleReturnToNow(); });
  }

  function laneH(root) { return Math.max(33, Math.floor(((root ? root.clientHeight : 344) - 62) / LANE_COUNT)); }

  function buildGrid() {
    const lh = laneH(state.root);
    state.root.style.setProperty("--lane-h", `${lh}px`);
    state.root.style.setProperty("--track-w", `${TRACK_W}px`);
    let html = "";
    for (let m = START_MIN; m <= END_MIN; m += 15) {
      const x = (m - START_MIN) * PX_PER_MIN;
      html += `<div class="grid-line ${m % 60 === 0 ? "hour" : ""}" style="left:${x}px"></div>`;
    }
    for (let i = 0; i <= LANE_COUNT; i++) html += `<div class="lane-line" style="top:${28 + i * lh}px"></div>`;
    state.track.innerHTML = html;
    let timeHtml = "";
    for (let m = START_MIN; m <= END_MIN; m += 60) {
      const x = (m - START_MIN) * PX_PER_MIN;
      timeHtml += `<div class="time-label" style="left:${x}px">${U.formatHour(m)}</div>`;
    }
    state.timeTrack.innerHTML = timeHtml;
  }

  function buildJobs(onSelect) {
    const lh = laneH(state.root);
    const driverIndex = new Map(window.AppData.drivers.map((d, i) => [d.id, i]));
    const statusMap = window.AppTexts.statuses;
    window.AppData.jobs.forEach(job => {
      const si = driverIndex.get(job.driverId) || 0;
      const start = U.timeToMinutes(job.start);
      const end = U.timeToMinutes(job.end);
      const left = (start - START_MIN) * PX_PER_MIN;
      const width = Math.max(34, (end - start) * PX_PER_MIN);
      const top = 28 + si * lh + 3;
      const el = document.createElement("div");
      el.className = `job-band ${job.status === "temp" ? "is-temp" : ""} ${job.status === "alert" ? "is-alert" : ""} ${job.status === "done" ? "is-done" : ""}`;
      el.style.left = `${left}px`; el.style.top = `${top}px`; el.style.width = `${width}px`; el.dataset.jobId = job.id;
      el.innerHTML = `<div class="job-patient">${job.patient}</div><div class="job-state">${statusMap[job.status] || job.status}</div>`;
      el.addEventListener("click", () => { selectJob(job.id); if (onSelect) onSelect(job); });
      state.track.appendChild(el);
    });
  }

  function selectJob(id) {
    state.selectedId = id;
    if (!state.track) return;
    state.track.querySelectorAll(".job-band").forEach(el => el.classList.toggle("is-current", el.dataset.jobId === id));
  }

  function recalc() {
    const viewW = state.viewport.clientWidth;
    state.maxOffset = Math.max(0, TRACK_W - viewW);
    state.offset = U.clamp(state.offset, 0, state.maxOffset);
    applyOffset();
  }

  function nowOffset() {
    const nowX = (U.getUiNowMinutes() - START_MIN) * PX_PER_MIN;
    const viewW = state.viewport.clientWidth;
    return U.clamp(nowX - viewW * 0.62, 0, state.maxOffset);
  }
  function jumpToNow() { state.offset = nowOffset(); applyOffset(); }
  function animateToNow() {
    const from = state.offset, to = nowOffset(), duration = 520, start = performance.now();
    cancelAnimationFrame(state.animFrame);
    function tick(now) {
      const t = U.clamp((now - start) / duration, 0, 1);
      state.offset = from + (to - from) * U.easeOutCubic(t);
      applyOffset();
      if (t < 1) state.animFrame = requestAnimationFrame(tick);
    }
    state.animFrame = requestAnimationFrame(tick);
  }
  function applyOffset() {
    const tx = -state.offset;
    state.track.style.transform = `translateX(${tx}px)`;
    state.timeTrack.style.transform = `translateX(${tx}px)`;
    const nowX = (U.getUiNowMinutes() - START_MIN) * PX_PER_MIN;
    state.nowLine.style.left = `${nowX - state.offset}px`;
    const viewW = state.viewport.clientWidth;
    const thumbW = Math.max(44, viewW * (viewW / TRACK_W));
    const thumbMax = viewW - thumbW;
    state.thumb.style.width = `${thumbW}px`;
    state.thumb.style.left = `${state.maxOffset ? (state.offset / state.maxOffset) * thumbMax : 0}px`;
  }
  function bindDrag() {
    const view = state.viewport;
    function startDrag(clientX) { state.isDragging = true; state.dragStartX = clientX; state.dragStartOffset = state.offset; view.classList.add("is-dragging"); clearTimeout(state.returnTimer); cancelAnimationFrame(state.animFrame); }
    function moveDrag(clientX) { if (!state.isDragging) return; state.offset = U.clamp(state.dragStartOffset - (clientX - state.dragStartX), 0, state.maxOffset); applyOffset(); }
    function endDrag() { if (!state.isDragging) return; state.isDragging = false; view.classList.remove("is-dragging"); scheduleReturnToNow(); }
    view.addEventListener("pointerdown", e => { startDrag(e.clientX); view.setPointerCapture(e.pointerId); });
    view.addEventListener("pointermove", e => moveDrag(e.clientX));
    view.addEventListener("pointerup", endDrag); view.addEventListener("pointercancel", endDrag);
  }
  function scheduleReturnToNow() { clearTimeout(state.returnTimer); state.returnTimer = setTimeout(() => { if (!state.isDragging) animateToNow(); }, 2600); }
  return { render, selectJob };
})();
