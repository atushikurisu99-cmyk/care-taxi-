(function(){
function render(){
const root=document.getElementById("timelineRoot"),d=window.CARE_TAXI_DATA;root.innerHTML="";
const hourW=96,rowH=42,nameW=126,headH=36;
const scroll=document.createElement("div");scroll.className="timelineScroll";
const canvas=document.createElement("div");canvas.className="timelineCanvas";
const header=document.createElement("div");header.className="timeHeader";
d.hours.forEach(h=>{const col=document.createElement("div");col.className="timeCol";col.innerHTML='<div class="timeLabel">'+h+'</div>';header.appendChild(col)});
const vendorColumn=document.createElement("div");vendorColumn.className="vendorColumn";
d.vendors.forEach(v=>{const row=document.createElement("div");row.className="vendorRow";row.textContent=v;vendorColumn.appendChild(row)});
const grid=document.createElement("div");grid.className="gridArea";
for(let i=0;i<13;i++){const v=document.createElement("div");v.className="gridHour";v.style.left=(i*hourW)+"px";grid.appendChild(v)}
for(let i=0;i<=7;i++){const r=document.createElement("div");r.className="gridRow";r.style.top=(i*rowH)+"px";grid.appendChild(r)}
const off=document.createElement("div");off.className="offHoursLeft";
const now=document.createElement("div");now.className="nowLine";now.style.left=(nameW+(5.3*hourW))+"px";
canvas.appendChild(header);canvas.appendChild(vendorColumn);canvas.appendChild(grid);canvas.appendChild(off);
d.jobs.forEach(j=>{const el=document.createElement("div");el.className="jobBlock";el.style.left=(nameW+(j.start*hourW))+"px";el.style.top=(headH+(j.vendor*rowH)+3)+"px";el.style.width=(j.duration*hourW)+"px";el.innerHTML='<div class="jobName">'+j.name+'</div><div class="jobSub">'+j.status+'</div>';canvas.appendChild(el)});
canvas.appendChild(now);scroll.appendChild(canvas);root.appendChild(scroll);
}
window.AppTimeline={render};
})();