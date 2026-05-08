(function () {
  var WEEK = ["日", "月", "火", "水", "木", "金", "土"];
  var BASE_W = 952;
  var BASE_H = 728;

  function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function updateHeaderDateTime() {
    var d = new Date();
    var text = (d.getMonth() + 1) + "/" + d.getDate() + "（" + WEEK[d.getDay()] + "） " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
    document.getElementById("headerDateTime").innerHTML = text;
  }

  function fitCanvas() {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;

    var scale = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H);
    var scaledW = BASE_W * scale;
    var scaledH = BASE_H * scale;

    var left = (window.innerWidth - scaledW) / 2;
    var top = (window.innerHeight - scaledH) / 2;

    var canvas = document.getElementById("appCanvas");

    canvas.style.left = left + "px";
    canvas.style.top = top + "px";
    canvas.style.transform = "scale(" + scale + ")";

    var band = document.getElementById("topBand");
    if (band) {
      band.style.left = "0px";
      band.style.top = "0px";
      band.style.width = window.innerWidth + "px";
      band.style.height = (106 * scale) + "px";
    }
  }

  function renderStatus() {
    var rows = [
      ["協力業者 A", "待機"],
      ["協力業者 B", "向かい中"],
      ["協力業者 C", "向かい中"],
      ["協力業者 D", "搬送中"],
      ["協力業者 E", "終了"],
      ["協力業者 F", "終了"],
      ["協力業者 G", "終了"]
    ];
    var html = "";
    var i;

    for (i = 0; i < rows.length; i++) {
      html += '<div class="status-row"><div>' + rows[i][0] + '</div><div>' + rows[i][1] + '</div></div>';
    }

    document.getElementById("statusList").innerHTML = html;
  }

  function boot() {
    fitCanvas();
    updateHeaderDateTime();

    if (window.AppTimeline && window.AppTimeline.init) {
      window.AppTimeline.init();
    }

    if (window.AppDays && window.AppDays.init) {
      window.AppDays.init();
    }

    renderStatus();

    window.onresize = fitCanvas;
    setInterval(updateHeaderDateTime, 15000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
