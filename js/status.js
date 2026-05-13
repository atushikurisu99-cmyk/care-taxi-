window.CareTaxiStatus={render:function(root){
  var html='<div class="status"><div class="section-title">STATUS</div><div class="status-list">';
  var list=window.CareTaxiData.statuses;
  for(var i=0;i<list.length;i++){html+='<button class="status-row" data-status="'+i+'"><span class="status-name">'+list[i].name+'</span><span class="status-value">'+list[i].state+'</span></button>';}
  html+='</div></div>';root.innerHTML=html;
  var btns=root.querySelectorAll('[data-status]');
  for(var b=0;b<btns.length;b++){btns[b].onclick=function(){window.CareTaxiDetail.showStatus(window.CareTaxiData.statuses[Number(this.getAttribute('data-status'))]);};}
}};
