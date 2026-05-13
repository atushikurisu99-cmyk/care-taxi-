window.CareTaxiStatus = {
  render(root){
    const rows = window.CareTaxiData.statuses.map((s, index) => `
      <button class="status-row" type="button" data-status-index="${index}">
        <span class="status-name">${s.name}</span>
        <span class="status-pill ${s.tone}">${s.state}</span>
      </button>
    `).join('');
    root.innerHTML = `
      <section class="status-wrap">
        <div class="section-title">STATUS</div>
        <div class="status-body">${rows}</div>
      </section>
    `;
    root.querySelectorAll('[data-status-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.CareTaxiDetail.showStatus(window.CareTaxiData.statuses[Number(btn.dataset.statusIndex)]);
      });
    });
  }
};
