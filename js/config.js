/*
  UI TRACE POLICY
  - Header blue band follows browser width.
  - White body keeps PDF layout ratio.
  - Whole page scroll is forbidden.
  - LOCATION scrolls vertically and horizontally, but one gesture locks to one axis.
  - Vendor column and time header stay fixed.
  - Only timeline grid/bookings/current-time line move.
  - DAYS is always 7 cards, no scroll.
  - DETAIL is display-only and may scroll vertically inside itself.
*/
window.CareTaxiConfig = {
  timeline: {
    start: "06:30",
    end: "20:00",
    stepMinutes: 30,
    halfHourWidth: 26,
    rowHeight: 36,
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
