window.CareTaxiDetail = {
  render(root){
    root.innerHTML = `
      <section class="detail-wrap">
        <div class="section-title">DETAIL</div>
        <div class="detail-body" id="detail-body">
          <div class="detail-empty">${window.CareTaxiConfig.labels.detailEmpty.replace(/\n/g,'<br>')}</div>
        </div>
      </section>
    `;
  },
  showBooking(booking, vendor){
    const body = document.getElementById('detail-body');
    body.innerHTML = `
      <div class="detail-card">
        <div class="detail-row"><div class="detail-label">時間</div><div class="detail-value">${booking.start} → ${booking.end}</div></div>
        <div class="detail-row"><div class="detail-label">患者名</div><div class="detail-value">${booking.patient}</div></div>
        <div class="detail-row"><div class="detail-label">出発 → 到着</div><div class="detail-sub">未設定 → 未設定</div></div>
        <div class="detail-row"><div class="detail-label">担当</div><div class="detail-value">${vendor ? vendor.name : '未調整'}</div></div>
        <div class="detail-row"><div class="detail-label">状態</div><div class="detail-value">${booking.status}</div></div>
        <div class="detail-row"><div class="detail-label">特記</div><div class="detail-sub">必要な情報だけをここへ表示。編集は別画面で扱う。</div></div>
      </div>
    `;
  },
  showDay(day){
    const notices = day.notices.length ? day.notices.map(n => `<div class="detail-row"><div class="detail-label">通知</div><div class="detail-value">${n.label}</div></div>`).join('') : '<div class="detail-row"><div class="detail-label">通知</div><div class="detail-sub">なし</div></div>';
    document.getElementById('detail-body').innerHTML = `
      <div class="detail-card">
        <div class="detail-row"><div class="detail-label">日付</div><div class="detail-value">${day.date}（${day.dow}）</div></div>
        <div class="detail-row"><div class="detail-label">案件数</div><div class="detail-value">${day.cases}件</div></div>
        <div class="detail-row"><div class="detail-label">調整数</div><div class="detail-value">${day.adjusts}件</div></div>
        ${notices}
      </div>
    `;
  },
  showStatus(status){
    document.getElementById('detail-body').innerHTML = `
      <div class="detail-card">
        <div class="detail-row"><div class="detail-label">担当</div><div class="detail-value">${status.name}</div></div>
        <div class="detail-row"><div class="detail-label">現在状態</div><div class="detail-value">${status.state}</div></div>
      </div>
    `;
  }
};
