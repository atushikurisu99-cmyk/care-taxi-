window.AppData = window.AppData || {};
window.AppData.jobs = [
  { id: "job-001", driverId: "a", patient: "田中様", status: "go", start: "08:32", end: "10:28", from: "自宅", to: "市民病院", note: "車椅子" },
  { id: "job-002", driverId: "b", patient: "佐藤様", status: "go", start: "08:36", end: "09:54", from: "施設", to: "整形外科", note: "" },
  { id: "job-003", driverId: "c", patient: "山田様", status: "arrived", start: "08:40", end: "10:30", from: "自宅", to: "総合病院", note: "院内介助" },
  { id: "job-004", driverId: "d", patient: "井上様", status: "temp", start: "13:35", end: "14:12", from: "", to: "", note: "仮" },
  { id: "job-005", driverId: "a", patient: "村上様", status: "waiting", start: "15:10", end: "16:05", from: "病院", to: "自宅", note: "" },
  { id: "job-006", driverId: "b", patient: "高橋様", status: "alert", start: "16:20", end: "17:15", from: "施設", to: "病院", note: "要確認" }
];
window.AppData.days = [
  { date: "4/29", jobs: 8, adjustments: 8, statuses: [] },
  { date: "4/30", jobs: 8, adjustments: 8, statuses: [] },
  { date: "5/1", jobs: 8, adjustments: 8, statuses: [] },
  { date: "5/2", jobs: 8, adjustments: 7, statuses: [] },
  { date: "5/3", jobs: 8, adjustments: 8, statuses: [{ text: "請求書発行", type: "blue" }] },
  { date: "5/4", jobs: 8, adjustments: 7, statuses: [{ text: "調整数7件", type: "redtext" }, { text: "支払い", type: "yellow" }] },
  { date: "5/5", jobs: 8, adjustments: 8, statuses: [] }
];
