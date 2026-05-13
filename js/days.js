window.CareTaxiDays={render:function(root){
  var cls={blue:'notice-blue',yellow:'notice-yellow',pink:'notice-pink',gray:'notice-gray'};
  var html='<div class="days"><div class="section-title">DAYS</div><div class="days-list">';
  for(var i=0;i<window.CareTaxiData.days.length;i++){
    var d=window.CareTaxiData.days[i], notices='';
    for(var n=0;n<Math.min(3,d.notices.length);n++){var no=d.notices[n];notices+='<div class="day-notice '+(cls[no.color]||'notice-gray')+'">'+no.label+'</div>';}
    html+='<button class="day-card" data-day="'+i+'"><div class="day-date">'+d.date+'</div><div class="day-main">案件数 '+d.cases+'件<br>調整数 '+d.adjusts+'件</div><div class="day-notices">'+notices+'</div></button>';
  }
  html+='</div></div>';root.innerHTML=html;
  var btns=root.querySelectorAll('[data-day]');
  for(var b=0;b<btns.length;b++){btns[b].onclick=function(){window.CareTaxiDetail.showDay(window.CareTaxiData.days[Number(this.getAttribute('data-day'))]);};}
}};
