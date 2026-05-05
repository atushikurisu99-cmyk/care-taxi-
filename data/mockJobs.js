window.AppData = window.AppData || {};
window.AppData.jobs = [
  {
    id: "job-001",
    driverId: "a",
    patient: "田中様",
    route: "自宅 → 市民病院",
    start: "08:35",
    end: "09:50",
    status: "待機",
    note: "車椅子",
    type: "normal"
  },
  {
    id: "job-002",
    driverId: "b",
    patient: "佐藤様",
    route: "施設 → 県病院",
    start: "08:40",
    end: "09:35",
    status: "向かい中",
    note: "受付確認",
    type: "active"
  },
  {
    id: "job-003",
    driverId: "c",
    patient: "山田様",
    route: "自宅 → リハビリ",
    start: "08:45",
    end: "10:10",
    status: "搬送中",
    note: "酸素あり",
    type: "normal"
  }
];

window.AppData.days = [
  { date: "4/29", jobs: 8, adjustments: 8 },
  { date: "4/30", jobs: 8, adjustments: 8 },
  { date: "5/1", jobs: 8, adjustments: 8 },
  { date: "5/2", jobs: 8, adjustments: 7 },
  { date: "5/3", jobs: 8, adjustments: 8, badge: { text: "請求書発行", color: "blue" } },
  { date: "5/4", jobs: 8, adjustments: 7, alert: true, badge: { text: "支払い", color: "yellow" } },
  { date: "5/5", jobs: 8, adjustments: 8 }
];
