window.CareTaxiData = {
  vendors: [
    { id: "v1", name: "東田" },
    { id: "v2", name: "西川" },
    { id: "v3", name: "山本" },
    { id: "v4", name: "広島ケア" },
    { id: "v5", name: "南交通" },
    { id: "v6", name: "北部介護" },
    { id: "v7", name: "予備担当" }
  ],
  bookings: [
    { id:"b1", vendorId:"v1", start:"07:00", end:"08:00", patient:"佐藤様", status:"向かい中", type:"insurance" },
    { id:"b2", vendorId:"v2", start:"08:30", end:"09:30", patient:"田中様", status:"搬送中", type:"cash" },
    { id:"b3", vendorId:"v3", start:"10:00", end:"11:30", patient:"山田様", status:"予約", type:"office" },
    { id:"b4", vendorId:"v4", start:"12:30", end:"14:00", patient:"高橋様", status:"待機中", type:"insurance" },
    { id:"b5", vendorId:"v5", start:"15:00", end:"16:00", patient:"仮登録", status:"未調整", type:"temporary", temporary:true, unassigned:true },
    { id:"b6", vendorId:"v6", start:"16:30", end:"17:30", patient:"鈴木様", status:"予約", type:"cash" }
  ],
  days: [
    { date:"5/11", dow:"月", kind:"weekday", cases:8, adjusts:1, notices:[{label:"請求", color:"blue"},{label:"支払", color:"yellow"}] },
    { date:"5/12", dow:"火", kind:"today", cases:10, adjusts:2, notices:[{label:"要確認", color:"pink"},{label:"入金", color:"green"},{label:"支払", color:"yellow"},{label:"超過分", color:"gray"}] },
    { date:"5/13", dow:"水", kind:"weekday", cases:6, adjusts:0, notices:[{label:"請求", color:"blue"}] },
    { date:"5/14", dow:"木", kind:"weekday", cases:7, adjusts:1, notices:[] },
    { date:"5/15", dow:"金", kind:"weekday", cases:9, adjusts:0, notices:[{label:"支払", color:"yellow"}] },
    { date:"5/16", dow:"土", kind:"weekday", cases:5, adjusts:1, notices:[{label:"確認", color:"gray"}] },
    { date:"5/17", dow:"日", kind:"holiday", cases:3, adjusts:0, notices:[{label:"祝日", color:"pink"}] }
  ],
  statuses: [
    { vendorId:"v1", name:"東田", state:"向かい中", tone:"moving" },
    { vendorId:"v2", name:"西川", state:"搬送中", tone:"carrying" },
    { vendorId:"v3", name:"山本", state:"待機中", tone:"waiting" },
    { vendorId:"v4", name:"広島ケア", state:"待機中", tone:"waiting" },
    { vendorId:"v5", name:"南交通", state:"終了", tone:"done" }
  ]
};
