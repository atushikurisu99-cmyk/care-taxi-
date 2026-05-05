window.AppShell = (() => {
  function lockSize() {
    document.documentElement.style.setProperty("--app-h", window.innerHeight + "px");
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }

  function createShell(root) {
    const labels = window.AppTexts.labels;
    root.innerHTML = `
      <div class="header">
        <div class="menu" aria-label="menu"><span></span><span></span><span></span></div>
        <div class="date">${labels.menuDate}</div>
        <div class="reserve">${labels.reserve}</div>
      </div>
      <div class="content">
        <div class="label label-location">${labels.location}</div>
        <div class="label label-detail">${labels.detail}</div>
        <div class="label label-days">${labels.days}</div>
        <div class="label label-status">${labels.status}</div>
        <div id="timeline-root" class="main-frame"></div>
        <div id="detail-root" class="detail-frame"></div>
        <div id="days-root" class="days-frame"></div>
        <div id="status-root" class="status-frame"></div>
      </div>
    `;
  }

  function initLock() {
    lockSize();
    window.addEventListener("resize", lockSize);
    window.addEventListener("orientationchange", lockSize);
    document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
    document.addEventListener("gesturestart", (e) => e.preventDefault(), { passive: false });
  }

  return { createShell, initLock };
})();
