(function () {
  var VENDORS = [
    "担当者",
    "協力業者 A",
    "協力業者 B",
    "協力業者 C",
    "協力業者 D",
    "協力業者 E",
    "協力業者 F",
    "協力業者 G"
  ];

  var RANGE_START_MIN = 6 * 60 + 30;
  var RANGE_END_MIN = 20 * 60;
  var PIXELS_PER_HOUR = 56;
  var PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;
  var ROW_H = 40;
  var GRID_W = 756;
  var VIEW_W = 528;

  function minuteToX(totalMinutes) {
    return (totalMinutes - RANGE_START_MIN) * PIXELS_PER_MINUTE;
  }

  function renderVendorColumn() {
    var root = document.getElementById("vendorColumn");
    var html = "";
    var i;

    for (i = 0; i < VENDORS.length; i++) {
      if (i === 0) {
        html += '<div class="vendor-header">' + VENDORS[i] + '</div>';
      } else {
        html += '<div class="vendor-row">' + VENDORS[i] + '</div>';
      }
    }

    root.innerHTML = html;
  }

  function renderTimeAxis() {
    var root = document.getElementById("timeAxis");
    var html = "";
    var h;

    for (h = 7; h <= 19; h++) {
      html += '<div class="time-label" style="left:' + minuteToX(h * 60) + 'px;">' + h + ':00</div>';
    }

    root.innerHTML = html;
  }

  function renderGrid() {
    var root = document.getElementById("timelineGrid");
    var html = "";
    var m;
    var i;
    var x;

    for (m = RANGE_START_MIN; m <= RANGE_END_MIN; m += 30) {
      x = minuteToX(m);
      html += '<div class="grid-line ' + (m % 60 === 0 ? "hour" : "half") + '" style="left:' + x + 'px;"></div>';
    }

    html += renderCurrentLine();
    html += renderSampleJob();

    root.innerHTML = html;
  }

  function renderCurrentLine() {
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();

    if (nowMin < RANGE_START_MIN || nowMin > RANGE_END_MIN) {
      nowMin = 12 * 60 + 45;
    }

    return '<div class="current-line" style="left:' + minuteToX(nowMin) + 'px;"></div>';
  }

  function jobBlock(job) {
    var left = minuteToX(job.start);
    var width = minuteToX(job.end) - minuteToX(job.start);
    var top = (job.vendorIndex - 1) * ROW_H + 4;

    var style = ""
      + "left:" + left + "px;"
      + "top:" + top + "px;"
      + "width:" + width + "px;"
      + "background:" + (job.blockColor || "var(--job)") + ";"
      + "--job-patient-color:" + (job.patientTextColor || "#111") + ";"
      + "--job-state-color:" + (job.stateTextColor || "#555") + ";";

    return ''
      + '<div class="job-block" style="' + style + '">'
      + '<div class="job-patient">' + job.patient + '</div>'
      + '<div class="job-state">' + job.state + '</div>'
      + '</div>';
  }

  function renderSampleJob() {
    var jobs = [
      {
        vendorIndex: 1,
        start: 8 * 60,
        end: 10 * 60,
        patient: "田中様",
        state: "向かい中",
        blockColor: "rgba(158, 220, 202, 0.84)",
        patientTextColor: "#111",
        stateTextColor: "#555"
      },
      {
        vendorIndex: 2,
        start: 8 * 60,
        end: 10 * 60,
        patient: "佐藤様",
        state: "搬送中",
        blockColor: "rgba(158, 220, 202, 0.84)",
        patientTextColor: "#111",
        stateTextColor: "#555"
      },
      {
        vendorIndex: 3,
        start: 8 * 60,
        end: 10 * 60,
        patient: "山田様",
        state: "終了",
        blockColor: "rgba(158, 220, 202, 0.84)",
        patientTextColor: "#111",
        stateTextColor: "#555"
      }
    ];

    var html = "";
    var i;

    for (i = 0; i < jobs.length; i++) {
      html += jobBlock(jobs[i]);
    }

    return html;
  }


  function renderLocationRowLines() {
    var shell = document.querySelector(".timeline-shell");
    var old = document.getElementById("locationRowLines");
    var html = "";
    var i;

    if (!shell) {
      return;
    }

    if (old) {
      old.parentNode.removeChild(old);
    }

    for (i = 0; i < 8; i++) {
      html += '<div class="location-row-line" style="top:' + (43 + i * ROW_H) + 'px;"></div>';
    }

    var layer = document.createElement("div");
    layer.id = "locationRowLines";
    layer.className = "location-row-lines";
    layer.innerHTML = html;
    shell.appendChild(layer);
  }

  function syncFakeScrollbar() {
    var view = document.getElementById("timelineViewport");
    var thumb = document.getElementById("scrollbarThumb");
    var maxScroll = GRID_W - VIEW_W;
    var ratio = maxScroll > 0 ? view.scrollLeft / maxScroll : 0;
    var trackW = VIEW_W - 26;
    var thumbW = Math.max(60, Math.floor(trackW * VIEW_W / GRID_W));

    thumb.style.width = thumbW + "px";
    thumb.style.left = Math.floor((trackW - thumbW) * ratio) + "px";
  }

  function initScroll() {
    var view = document.getElementById("timelineViewport");
    view.scrollLeft = 0;
    view.onscroll = syncFakeScrollbar;
    syncFakeScrollbar();
  }

  function init() {
    renderVendorColumn();
    renderTimeAxis();
    renderGrid();
    renderLocationRowLines();
    initScroll();
  }

  window.AppTimeline = {
    init: init
  };
})();
