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

    for (i = 0; i <= 7; i++) {
      html += '<div class="row-line" style="top:' + (i * ROW_H) + 'px;"></div>';
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

  function renderSampleJob() {
    var left = minuteToX(8 * 60);
    var width = minuteToX(10 * 60) - minuteToX(8 * 60);

    return ''
      + '<div class="job-block" style="left:' + left + 'px;width:' + width + 'px;">'
      + '<div class="job-row"><span>田中様</span><span class="job-status">状態</span></div>'
      + '<div class="job-row"><span>佐藤様</span><span class="job-status">状態</span></div>'
      + '<div class="job-row"><span>山田様</span><span class="job-status">状態</span></div>'
      + '</div>';
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
    initScroll();
  }

  window.AppTimeline = {
    init: init
  };
})();
