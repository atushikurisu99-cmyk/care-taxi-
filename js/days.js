(function () {
  var DAYS = [
    { date: "4/29", body: "案件数 8件<br>調整数 8件" },
    { date: "4/30", body: "案件数 8件<br>調整数 7件" },
    { date: "5/1", body: "案件数 8件<br>調整数 8件" },
    { date: "5/2", body: "案件数 8件<br>調整数 7件" },
    { date: "5/3", body: '案件数 8件<br>調整数 8件<br><span class="badge blue">請求書発行</span><br><span class="badge blue">&nbsp;</span><br><span class="badge blue">&nbsp;</span>' },
    { date: "5/4", body: '案件数 8件<br><span style="color:#ff2b50;">調整数 7件</span><br><span class="badge yellow">支払い</span>' },
    { date: "5/5", body: "案件数 8件<br>調整数 8件" }
  ];

  function renderDays() {
    var root = document.getElementById("daysList");
    var html = "";
    var i;

    for (i = 0; i < DAYS.length; i++) {
      html += '<div class="day-card" style="left:' + (i * 91) + 'px;">';
      html += '<div class="day-date">' + DAYS[i].date + '</div>';
      html += '<div class="day-body">' + DAYS[i].body + '</div>';
      html += '</div>';
    }

    root.innerHTML = html;
  }

  function init() {
    renderDays();
  }

  window.AppDays = {
    init: init
  };
})();
