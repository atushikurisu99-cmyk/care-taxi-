window.AppStatus = (() => {
  function render(root) {
    const drivers = window.AppData.drivers;
    root.innerHTML = `<div class="status-panel"></div>`;
    const panel = root.querySelector(".status-panel");
    drivers.forEach((driver) => {
      const row = document.createElement("div");
      row.className = "status-row";
      row.innerHTML = `<div class="status-driver">${driver.name}</div><div class="status-text">${driver.status}</div>`;
      panel.appendChild(row);
    });
  }

  return { render };
})();
