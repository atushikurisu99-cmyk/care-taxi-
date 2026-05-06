window.AppDetail = (function(){

  function render(root){
    root.innerHTML = baseHtml(null);
  }

  function fill(root,job){
    root.innerHTML = baseHtml(job);
  }

  function baseHtml(job){

    if(!job){
      return `
        <div style="position:absolute;inset:0;padding:4px 0 0 14px;box-sizing:border-box;color:#333;">
          <div style="font-size:13px;line-height:28px;">時間</div>
          <div style="font-size:13px;line-height:28px;">患者名</div>
          <div style="font-size:13px;line-height:28px;">出発 → 到着</div>
          <div style="font-size:13px;line-height:28px;">担当</div>
          <div style="font-size:13px;line-height:28px;">状態</div>
          <div style="font-size:13px;line-height:28px;">特記</div>
          <div style="font-size:13px;line-height:28px;color:#aaa;">ーーー</div>
        </div>
      `;
    }

    return `
      <div style="position:absolute;inset:0;padding:4px 0 0 14px;box-sizing:border-box;color:#333;overflow:auto;">
        <div style="font-size:12px;color:#777;line-height:22px;">時間</div>
        <div style="font-size:15px;font-weight:700;line-height:25px;">${job.start || job.startTime || ''} - ${job.end || job.endTime || ''}</div>

        <div style="height:8px;"></div>

        <div style="font-size:12px;color:#777;line-height:22px;">患者名</div>
        <div style="font-size:17px;font-weight:800;line-height:28px;">${job.patient || job.name || ''}</div>

        <div style="height:8px;"></div>

        <div style="font-size:12px;color:#777;line-height:22px;">出発 → 到着</div>
        <div style="font-size:14px;font-weight:600;line-height:24px;">${job.from || ''} → ${job.to || ''}</div>

        <div style="height:8px;"></div>

        <div style="font-size:12px;color:#777;line-height:22px;">担当</div>
        <div style="font-size:14px;line-height:24px;">${job.staff || job.driver || ''}</div>

        <div style="height:8px;"></div>

        <div style="font-size:12px;color:#777;line-height:22px;">状態</div>
        <div style="font-size:14px;line-height:24px;">${job.status || '状態'}</div>

        <div style="height:8px;"></div>

        <div style="font-size:12px;color:#777;line-height:22px;">特記</div>
        <div style="font-size:13px;line-height:22px;">${job.note || 'ーーー'}</div>
      </div>
    `;
  }

  return {
    render: render,
    fill: fill
  };

})();
