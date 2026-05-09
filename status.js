
window.addEventListener("DOMContentLoaded",()=>{

  const root = document.getElementById("status-root");

  const rows = [
    ["協力業者 A","待機中"],
    ["協力業者 B","向かい中"],
    ["協力業者 C","搬送中"],
    ["協力業者 D","終了"],
    ["協力業者 E","終了"]
  ];

  rows.forEach(r=>{

    const row = document.createElement("div");
    row.className = "status-row";

    row.innerHTML = `
      <span>${r[0]}</span>
      <span>${r[1]}</span>
    `;

    root.appendChild(row);

  });

});
