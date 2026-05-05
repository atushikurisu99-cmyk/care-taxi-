window.AppDetail = (() => {
  function render(root, job) {
    const L = window.AppTexts.labels;
    root.innerHTML = `
      <div class="detail-panel">
        ${L.detailRows.map(row => `<div class="detail-row">${row}</div>`).join("")}
        <div class="detail-fee">${L.fee}<span>⌃</span></div>
        <div class="detail-arrow"><span class="up"></span><span class="down"></span></div>
        <div class="detail-note">${L.detailNote}</div>
      </div>
    `;
    if (job) fill(root, job);
  }

  function fill(root, job) {
    const rows = root.querySelectorAll(".detail-row");
    const statusMap = window.AppTexts.statuses;
    const driver = window.AppData.drivers.find(d => d.id === job.driverId);
    const values = [
      `${job.start}〜${job.end}`,
      job.patient,
      `${job.from || "未入力"}→${job.to || "未入力"}`,
      driver ? driver.name : "",
      statusMap[job.status] || job.status,
      job.note || "—"
    ];
    rows.forEach((row, i) => row.textContent = values[i]);
  }

  return { render, fill };
})();
