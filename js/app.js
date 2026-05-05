(() => {
  function lockSize() {
    document.documentElement.style.setProperty("--app-h", window.innerHeight + "px");
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }

  function boot() {
    lockSize();

    const app = document.getElementById("app");
    window.AppShell.render(app);

    const locationRoot = document.getElementById("location-root");
    const detailRoot = document.getElementById("detail-root");
    const daysRoot = document.getElementById("days-root");
    const statusRoot = document.getElementById("status-root");

    window.AppDetail.render(detailRoot);
    window.AppDays.render(daysRoot);
    window.AppStatus.render(statusRoot);
    window.AppTimeline.render(locationRoot, job => window.AppDetail.fill(detailRoot, job));

    const first = window.AppData.jobs[0];
    if (first) {
      window.AppTimeline.selectJob(first.id);
      window.AppDetail.fill(detailRoot, first);
    }
  }

  window.addEventListener("resize", lockSize);
  window.addEventListener("orientationchange", lockSize);

  document.addEventListener("touchmove", e => e.preventDefault(), { passive: false });
  document.addEventListener("gesturestart", e => e.preventDefault(), { passive: false });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
