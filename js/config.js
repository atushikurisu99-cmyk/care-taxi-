window.CareTaxiConfig = {
  timeline: {
    start: "06:30",
    end: "20:00",
    stepMinutes: 30,
    halfHourWidth: 56,
    rowHeight: 60,
    defaultVisibleVendors: 5,
    autoReturnDelayMs: 3000,
    futureRatio: 0.70,
    lockThresholdPx: 8,
    horizontalFriction: 0.92,
    verticalFriction: 0.82
  },
  labels: {
    detailEmpty: "タイムライン・DAYS・STATUSを選択すると\nここに内容を表示します"
  },
  dayCard: {
    maxRows: 7,
    maxNoticeSlots: 3,
    colors: {
      weekday: { background: "#FFFFFF", border: "#C9CAFF" },
      today: { background: "#CDE9EE", border: "#45C5E3" },
      holiday: { background: "#F4DEEB", border: "#FF75A3" }
    }
  },
  statusBadgeColorChoices: [
    { id: "blue", label: "水色", className: "notice-blue" },
    { id: "yellow", label: "黄色", className: "notice-yellow" },
    { id: "pink", label: "ピンク", className: "notice-pink" },
    { id: "green", label: "緑", className: "notice-green" },
    { id: "gray", label: "グレー", className: "notice-gray" }
  ]
};
