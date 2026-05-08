(function () {
  var DAYS = [
    {
      date: "4/29",
      count: "案件数 8件",
      adjust: "調整数 8件",
      notices: ["", "", ""]
    },
    {
      date: "4/30",
      count: "案件数 8件",
      adjust: "調整数 7件",
      notices: ["", "", ""]
    },
    {
      date: "5/1",
      count: "案件数 8件",
      adjust: "調整数 8件",
      notices: ["", "", ""]
    },
    {
      date: "5/2",
      count: "案件数 8件",
      adjust: "調整数 7件",
      notices: ["", "", ""]
    },
    {
      date: "5/3",
      count: "案件数 8件",
      adjust: "調整数 8件",
      notices: [
        '<span class="badge blue">請求書発行</span>',
        '<span class="badge blue">&nbsp;</span>',
        '<span class="badge blue">&nbsp;</span>'
      ]
    },
    {
      date: "5/4",
      count: "案件数 8件",
      adjust: '<span style="color:#ff2b50;">調整数 7件</span>',
      notices: [
        '<span class="badge yellow">支払い</span>',
        "",
        ""
      ]
    },
    {
      date: "5/5",
      count: "案件数 8件",
      adjust: "調整数 8件",
      notices: ["", "", ""]
    }
  ];

  function line(content, className) {
    return '<div class="day-line ' + (className || "") + '">' + (content || "&nbsp;") + '</div>';
  }

  function renderDays() {
    var root = document.getElementById("daysList");
    var html = "";
    var i;

    for (i = 0; i < DAYS.length; i++) {
      html += '<div class="day-card" style="left:' + (i * 91) + 'px;">';
      html += '<div class="day-grid">';
      html += line(DAYS[i].date, "date");
      html += line("&nbsp;");
      html += line(DAYS[i].count);
      html += line(DAYS[i].adjust);
      html += line(DAYS[i].notices[0], "notice");
      html += line(DAYS[i].notices[1], "notice");
      html += line(DAYS[i].notices[2], "notice");
      html += '</div>';
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
