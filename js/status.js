window.AppStatus = (() => {
  function render(root) {
    const statuses = { a: "待機", b: "向かい中", c: "向かい中", d: "搬送中", e: "終了", f: "終了", g: "終了" };
    root.innerHTML = `
      <div class="status-list">
        ${window.AppData.drivers.map(d => `
          <div class="status-row">
            <div class="status-driver">${d.name}</div>
            <div class="status-value">${statuses[d.id] || "待機"}</div>
          </div>
        `).join("")}
      </div>
    `;
  }
  return { render };
})();
