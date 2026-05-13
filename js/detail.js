window.CareTaxiDetail={
  render:function(root){root.innerHTML='<div class="detail"><div class="section-title">DETAIL</div><div class="detail-body" id="detailBody"><p class="detail-empty">タイムライン・<br>DAYS・STATUSを<br>選択すると<br>ここに内容を表示します</p></div></div>';},
  set:function(html){document.getElementById('detailBody').innerHTML=html;},
  showBooking:function(b,v){this.set('<p class="detail-line">時間</p><p class="detail-line">'+b.start+' → '+b.end+'</p><p class="detail-line">患者名</p><p class="detail-line">'+b.patient+'</p><p class="detail-line">出発 → 到着</p><p class="detail-line">担当</p><p class="detail-line">'+(v?v.name:'未調整')+'</p><p class="detail-line">状態</p><p class="detail-line">'+b.state+'</p><p class="detail-line">特記</p><p class="detail-line">ーーー</p>');},
  showDay:function(d){var notes=d.notices.length?d.notices.map(function(n){return n.label||'空欄';}).join(' / '):'なし';this.set('<p class="detail-line">'+d.date+'</p><p class="detail-line">案件数 '+d.cases+'件</p><p class="detail-line">調整数 '+d.adjusts+'件</p><p class="detail-line">通知</p><p class="detail-line">'+notes+'</p>');},
  showStatus:function(s){this.set('<p class="detail-line">担当</p><p class="detail-line">'+s.name+'</p><p class="detail-line">状態</p><p class="detail-line">'+s.state+'</p>');}
};
