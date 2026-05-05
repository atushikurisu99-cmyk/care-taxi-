window.AppTimeline = (() => {
  const MINUTE = 60 * 1000;

  function parseTimeToMinutes(time) {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function render(root) {
    const drivers = window.AppData.drivers;
    const jobs = window.AppData.jobs;
    const labels = window.AppTexts.labels;
    const state = window.AppState.timeline;
    const selectedJobId = window.AppState.selectedJobId;

    root.innerHTML = `
      <div class="timeline">
        <div class="timeline-head-left">${labels.driverHeader}</div>
        <div class="timeline-driver-col"></div>
        <div class="timeline-window">
          <div class="timeline-track">
            <div class="timeline-hours"></div>
            <div class="timeline-grid"></div>
          </div>
        </div>
        <div class="timeline-now-line"></div>
        <div class="timeline-scrollbar">
          <div class="timeline-edge-arrow left">◀</div>
          <div class="timeline-edge-arrow right">▶</div>
          <div class="timeline-scrollbar-thumb"></div>
        </div>
      </div>
    `;

    const timeline = root.querySelector(".timeline");
    const driverCol = root.querySelector(".timeline-driver-col");
    const windowEl = root.querySelector(".timeline-window");
    const track = root.querySelector(".timeline-track");
    const hoursEl = root.querySelector(".timeline-hours");
    const gridEl = root.querySelector(".timeline-grid");
    const nowLine = root.querySelector(".timeline-now-line");
    const thumb = root.querySelector(".timeline-scrollbar-thumb");

    let pxPerMinute = 1;
    let trackWidth = 1;
    let windowWidth = 1;
    let rowHeight = 1;
    let offset = 0;
    let baseOffset = 0;
    let drag = null;
    let timer = null;
    let animation = null;

    function minutesFromStart(time) {
      return parseTimeToMinutes(time) - state.startHour * 60;
    }

    function updateTransform() {
      track.style.transform = `translate3d(${offset}px, 0, 0)`;
      const scrollable = Math.max(1, trackWidth - windowWidth);
      const thumbW = Math.max(70, (windowWidth / trackWidth) * windowWidth);
      const thumbX = ((-offset) / scrollable) * Math.max(1, windowWidth - thumbW);
      thumb.style.width = `${thumbW}px`;
      thumb.style.left = `${clamp(thumbX, 16, windowWidth - thumbW - 16)}px`;
    }

    function scheduleReturn() {
      clearTimeout(timer);
      timer = setTimeout(() => animateToBase(), state.recenterDelayMs);
    }

    function animateToBase() {
      if (animation) cancelAnimationFrame(animation);
      const start = offset;
      const diff = baseOffset - start;
      const duration = state.recenterMs;
      const started = performance.now();

      function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
      }

      function step(now) {
        const t = clamp((now - started) / duration, 0, 1);
        offset = start + diff * easeOutCubic(t);
        updateTransform();
        if (t < 1) animation = requestAnimationFrame(step);
      }

      animation = requestAnimationFrame(step);
    }

    function layout() {
      const rect = windowEl.getBoundingClientRect();
      windowWidth = rect.width;
      const totalMinutes = (state.endHour - state.startHour) * 60;
      pxPerMinute = windowWidth / totalMinutes;
      trackWidth = windowWidth;
      rowHeight = (rect.height - 32) / drivers.length;

      track.style.width = `${trackWidth}px`;
      nowLine.style.left = `${102 + windowWidth * state.fixedNowRatio}px`;

      const nowMinutes = minutesFromStart(window.AppState.nowTime);
      baseOffset = windowWidth * state.fixedNowRatio - nowMinutes * pxPerMinute;
      offset = baseOffset;

      driverCol.innerHTML = "";
      drivers.forEach((driver, index) => {
        const div = document.createElement("div");
        div.className = "timeline-driver-name";
        div.style.top = `${index * rowHeight}px`;
        div.style.height = `${rowHeight}px`;
        div.textContent = driver.name;
        driverCol.appendChild(div);
      });

      hoursEl.innerHTML = "";
      for (let hour = state.startHour; hour <= state.endHour - 1; hour += 1) {
        const label = document.createElement("div");
        label.className = "timeline-hour-label";
        label.style.left = `${(hour - state.startHour) * 60 * pxPerMinute}px`;
        label.textContent = `${hour}:00`;
        hoursEl.appendChild(label);
      }

      gridEl.innerHTML = "";
      for (let m = 0; m <= totalMinutes; m += 20) {
        const line = document.createElement("div");
        line.className = `timeline-vline${m % 60 === 0 ? " hour" : ""}`;
        line.style.left = `${m * pxPerMinute}px`;
        gridEl.appendChild(line);
      }

      for (let i = 0; i <= drivers.length; i += 1) {
        const line = document.createElement("div");
        line.className = "timeline-row-line";
        line.style.top = `${i * rowHeight}px`;
        gridEl.appendChild(line);
      }

      jobs.forEach((job) => {
        const driverIndex = drivers.findIndex((d) => d.id === job.driverId);
        if (driverIndex < 0) return;
        const jobEl = document.createElement("div");
        const cls = ["timeline-job"];
        if (job.id === selectedJobId) cls.push("is-active");
        if (job.type === "provisional") cls.push("is-provisional");
        if (job.type === "alert") cls.push("is-alert");
        if (job.type === "complete") cls.push("is-complete");
        jobEl.className = cls.join(" ");
        const left = minutesFromStart(job.start) * pxPerMinute;
        const width = Math.max(46, (parseTimeToMinutes(job.end) - parseTimeToMinutes(job.start)) * pxPerMinute);
        jobEl.style.left = `${left}px`;
        jobEl.style.top = `${driverIndex * rowHeight + Math.max(4, (rowHeight - 42) / 2)}px`;
        jobEl.style.width = `${width}px`;
        jobEl.innerHTML = `<div class="job-patient">${job.patient}</div><div class="job-status">${job.status}</div>`;
        jobEl.addEventListener("click", () => {
          window.AppState.selectedJobId = job.id;
          window.AppDetail.render(document.getElementById("detail-root"));
          render(root);
        });
        gridEl.appendChild(jobEl);
      });

      updateTransform();
    }

    windowEl.addEventListener("pointerdown", (e) => {
      if (animation) cancelAnimationFrame(animation);
      windowEl.setPointerCapture(e.pointerId);
      windowEl.classList.add("is-dragging");
      drag = { startX: e.clientX, startOffset: offset };
      clearTimeout(timer);
    });

    windowEl.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      offset = drag.startOffset + dx;
      updateTransform();
    });

    function finishDrag(e) {
      if (!drag) return;
      drag = null;
      windowEl.classList.remove("is-dragging");
      try { windowEl.releasePointerCapture(e.pointerId); } catch (_) {}
      scheduleReturn();
    }

    windowEl.addEventListener("pointerup", finishDrag);
    windowEl.addEventListener("pointercancel", finishDrag);

    layout();
    window.addEventListener("resize", layout);
  }

  return { render };
})();
