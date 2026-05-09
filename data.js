window.CARE_TAXI_DATA={
hours:["7:00","8:00","9:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"],
vendors:["協力業者 A","協力業者 B","協力業者 C","協力業者 D","協力業者 E","協力業者 F","協力業者 G"],
jobs:[
{vendor:0,start:1.15,duration:1.3,name:"田中様",status:"向かい中"},
{vendor:1,start:3.0,duration:1.65,name:"佐藤様",status:"搬送中"},
{vendor:2,start:5.65,duration:1.9,name:"山田様",status:"終了"}
],
days:[
{date:"4/29",cases:8,adjust:8,actions:[]},
{date:"4/30",cases:8,adjust:7,actions:[]},
{date:"5/1",cases:8,adjust:8,actions:[]},
{date:"5/2",cases:8,adjust:7,actions:[]},
{date:"5/3",cases:8,adjust:8,actions:[{label:"請求書発行",type:"invoice"},{label:"支払い",type:"pay"},{label:"支払い",type:"pay"}]},
{date:"5/4",cases:7,adjust:7,danger:true,actions:[{label:"支払い",type:"pay"}]},
{date:"5/5",cases:8,adjust:8,actions:[]}
],
detail:["時間","患者名","出発 → 到着","担当","状態","特記","ーーー"],
status:[["協力業者 A","待機中"],["協力業者 B","向かい中"],["協力業者 C","搬送中"],["協力業者 D","終了"],["協力業者 E","終了"],["協力業者 F","終了"],["協力業者 G","終了"]]
};