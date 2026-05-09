
window.addEventListener("DOMContentLoaded",()=>{

  const root = document.getElementById("days-root");

  const data = [
    {date:"4/29",k:8,c:8},
    {date:"4/30",k:8,c:7},
    {date:"5/1",k:8,c:8},
    {date:"5/2",k:8,c:7},
    {date:"5/3",k:8,c:8,actions:["請求書発行","支払い","支払い"]},
    {date:"5/4",k:7,c:7,red:true,actions:["支払い"]},
    {date:"5/5",k:8,c:8}
  ];

  data.forEach(d=>{

    const card = document.createElement("div");
    card.className = "day-card";

    card.innerHTML = `
      <div class="day-date ${d.red ? "red":""}">
        ${d.date}
      </div>

      <div class="day-info ${d.red ? "red":""}">
        <div>案件数 ${d.k}件</div>
        <div>調整数 ${d.c}件</div>
      </div>
    `;

    if(d.actions){

      const wrap = document.createElement("div");
      wrap.className = "day-actions";

      d.actions.forEach(a=>{

        const btn = document.createElement("div");

        btn.className =
          a === "請求書発行"
          ? "action-blue"
          : "action-yellow";

        btn.textContent = a;

        wrap.appendChild(btn);

      });

      card.appendChild(wrap);
    }

    root.appendChild(card);

  });

});
