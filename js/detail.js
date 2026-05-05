window.AppDetail = (() => {
  function getSelectedJob() {
    return window.AppData.jobs.find((job) => job.id === window.AppState.selectedJobId) || window.AppData.jobs[0];
  }

  function render(root) {
    const labels = window.AppTexts.labels;
    const messages = window.AppTexts.messages;
    const job = getSelectedJob();
    const driver = window.AppData.drivers.find((item) => item.id === job.driverId);

    root.innerHTML = `
      <div class="detail-panel">
        <div class="detail-row">時間</div>
        <div class="detail-row">患者名</div>
        <div class="detail-row">出発→到着</div>
        <div class="detail-row">担当</div>
        <div class="detail-row">状態</div>
        <div class="detail-row">特記</div>
        <div class="detail-price">${labels.priceHint}</div>
        <div class="detail-row small">${messages.detailSpaceNote}</div>
        <div class="detail-scroll-mark"><div>⌃</div><div class="line"></div><div>⌄</div></div>
      </div>
    `;

    root.dataset.selectedJob = JSON.stringify({
      time: `${job.start}〜${job.end}`,
      patient: job.patient,
      route: job.route,
      driver: driver ? driver.name : "",
      status: job.status,
      note: job.note
    });
  }

  return { render };
})();
