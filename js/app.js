(() => {
  function init() {
    window.AppShell.initLock();
    const root = document.getElementById("app");
    window.AppShell.createShell(root);
    window.AppTimeline.render(document.getElementById("timeline-root"));
    window.AppDetail.render(document.getElementById("detail-root"));
    window.AppDays.render(document.getElementById("days-root"));
    window.AppStatus.render(document.getElementById("status-root"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
