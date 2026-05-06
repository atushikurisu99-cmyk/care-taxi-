window.AppTimeline = (function(){

  function render(root,onSelect){

    var drivers = (window.AppData && window.AppData.drivers) ? window.AppData.drivers : [];
    var jobs = (window.AppData && window.AppData.jobs) ? window.AppData.jobs : [];

    var startHour = 8;
    var endHour = 18;

    var laneNameW = 118;
    var topAxisH = 34;
    var rowH = 58;
    var hourW = 112;

    var totalW = laneNameW + ((endHour - startHour + 1) * hourW);
    var totalH = topAxisH + (drivers.length * rowH);

    var html = '';

    html += '<div style="position:absolute;inset:0;overflow:auto;">';

    html += '<div style="position:relative;width:'+totalW+'px;height:'+totalH+'px;">';

    for(var h=startHour; h<=endHour; h++){
      var x = laneNameW + ((h - startHour) * hourW);

      html += '<div style="position:absolute;';
      html += 'left:'+x+'px;';
      html += 'top:0;';
      html += 'width:'+hourW+'px;';
      html += 'height:'+topAxisH+'px;';
      html += 'font-size:11px;';
      html += 'font-weight:500;';
      html += 'color:#9a9a9a;';
      html += 'text-align:left;';
      html += 'box-sizing:border-box;';
      html += 'padding-left:4px;';
      html += 'line-height:'+topAxisH+'px;';
      html += 'border-left:1px solid rgba(0,0,0,0.06);';
      html += '">';
      html += h + ':00';
      html += '</div>';
    }

    for(var i=0; i<drivers.length; i++){
      var y = topAxisH + (i * rowH);

      html += '<div style="position:absolute;';
      html += 'left:0;';
      html += 'top:'+y+'px;';
      html += 'width:'+laneNameW+'px;';
      html += 'height:'+rowH+'px;';
      html += 'font-size:13px;';
      html += 'font-weight:500;';
      html += 'color:#3a3a3a;';
      html += 'line-height:'+rowH+'px;';
      html += 'box-sizing:border-box;';
      html += 'padding-left:6px;';
      html += 'border-top:1px solid rgba(0,0,0,0.055);';
      html += 'white-space:nowrap;';
      html += 'overflow:hidden;';
      html += 'text-overflow:ellipsis;';
      html += '">';
      html += drivers[i].name || '';
      html += '</div>';

      html += '<div style="position:absolute;';
      html += 'left:'+laneNameW+'px;';
      html += 'top:'+y+'px;';
      html += 'width:'+(totalW-laneNameW)+'px;';
      html += 'height:'+rowH+'px;';
      html += 'border-top:1px solid rgba(0,0,0,0.045);';
      html += 'box-sizing:border-box;';
      html += '"></div>';
    }

    for(var j=0; j<jobs.length; j++){
      var job = jobs[j];

      var driverIndex = findDriverIndex(drivers, job.driverId);
      if(driverIndex < 0) continue;

      var start = timeToX(job.start || job.startTime || '09:00', startHour, hourW, laneNameW);
      var end = timeToX(job.end || job.endTime || '10:00', startHour, hourW, laneNameW);
      var width = Math.max(58, end - start);

      var top = topAxisH + (driverIndex * rowH) + 9;

      html += '<div onclick="window.AppTimeline.selectJob(\\''+(job.id || '')+'\\')" style="position:absolute;';
      html += 'left:'+start+'px;';
      html += 'top:'+top+'px;';
      html += 'width:'+width+'px;';
      html += 'height:40px;';
      html += 'background:#f2f2f2;';
      html += 'border:1px solid rgba(0,0,0,0.08);';
      html += 'border-radius:8px;';
      html += 'box-sizing:border-box;';
      html += 'padding:5px 8px;';
      html += 'font-size:12px;';
      html += 'color:#222;';
      html += 'overflow:hidden;';
      html += 'cursor:pointer;';
      html += '">';
      html += '<div style="font-weight:700;line-height:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(job.patient || job.name || '患者名')+'</div>';
      html += '<div style="font-size:10px;color:#777;line-height:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">';
      html += (job.from || '出発') + ' → ' + (job.to || '到着');
      html += '</div>';
      html += '</div>';
    }

    html += '</div>';
    html += '</div>';

    root.innerHTML = html;

    window.AppTimeline._onSelect = onSelect;
  }

  function findDriverIndex(drivers, driverId){
    for(var i=0;i<drivers.length;i++){
      if(drivers[i].id === driverId) return i;
    }
    return 0;
  }

  function timeToX(time,startHour,hourW,laneNameW){
    var parts = String(time).split(':');
    var h = parseInt(parts[0],10) || startHour;
    var m = parseInt(parts[1],10) || 0;
    return laneNameW + ((h - startHour) * hourW) + (m / 60 * hourW);
  }

  function selectJob(id){
    var jobs = (window.AppData && window.AppData.jobs) ? window.AppData.jobs : [];
    var job = null;

    for(var i=0;i<jobs.length;i++){
      if(String(jobs[i].id) === String(id)){
        job = jobs[i];
        break;
      }
    }

    if(job && typeof window.AppTimeline._onSelect === 'function'){
      window.AppTimeline._onSelect(job);
    }
  }

  return {
    render: render,
    selectJob: selectJob,
    _onSelect: null
  };

})();
