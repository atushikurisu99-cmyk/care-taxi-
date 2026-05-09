
window.addEventListener("DOMContentLoaded",()=>{

  const root = document.getElementById("timeline-root");

  const hours = [
    "7:00","8:00","9:00","10:00","11:00","12:00",
    "13:00","14:00","15:00","16:00","17:00","18:00","19:00"
  ];

  const vendors = [
    "協力業者 A",
    "協力業者 B",
    "協力業者 C",
    "協力業者 D",
    "協力業者 E",
    "協力業者 F",
    "協力業者 G"
  ];

  const scroll = document.createElement("div");
  scroll.className = "timeline-scroll";

  const timeline = document.createElement("div");
  timeline.className = "timeline";

  const header = document.createElement("div");
  header.className = "time-header";

  hours.forEach(h=>{
    const col = document.createElement("div");
    col.className = "time-col";

    col.innerHTML = `
      <div class="time-text">${h}</div>
      <div class="half-line"></div>
    `;

    header.appendChild(col);
  });

  const vendorCol = document.createElement("div");
  vendorCol.className = "vendor-column";

  vendors.forEach(v=>{
    const row = document.createElement("div");
    row.className = "vendor-row";
    row.textContent = v;
    vendorCol.appendChild(row);
  });

  const grid = document.createElement("div");
  grid.className = "grid";

  const vWrap = document.createElement("div");
  vWrap.className = "v-wrap";

  for(let i=0;i<13;i++){
    const v = document.createElement("div");
    v.className = "v-col";
    v.innerHTML = `<div class="half-line"></div>`;
    vWrap.appendChild(v);
  }

  grid.appendChild(vWrap);

  for(let i=0;i<7;i++){
    const h = document.createElement("div");
    h.className = "h-row";
    grid.appendChild(h);
  }

  const line = document.createElement("div");
  line.className = "now-line";

  timeline.appendChild(header);
  timeline.appendChild(vendorCol);
  timeline.appendChild(grid);
  timeline.appendChild(line);

  const jobs = [
    {left:260,top:68,width:160,name:"田中様",status:"向かい中"},
    {left:530,top:124,width:190,name:"佐藤様",status:"搬送中"},
    {left:860,top:180,width:220,name:"山田様",status:"終了"},
  ];

  jobs.forEach(j=>{
    const el = document.createElement("div");
    el.className = "job";

    el.style.left = j.left + "px";
    el.style.top = j.top + "px";
    el.style.width = j.width + "px";

    el.innerHTML = `
      <div>${j.name}</div>
      <div class="job-sub">${j.status}</div>
    `;

    timeline.appendChild(el);
  });

  scroll.appendChild(timeline);
  root.appendChild(scroll);

});
