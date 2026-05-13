window.CareTaxiData={
  vendors:[
    {id:'v1',name:'協力業者 A'},{id:'v2',name:'協力業者 B'},{id:'v3',name:'協力業者 C'},{id:'v4',name:'協力業者 D'},{id:'v5',name:'協力業者 E'},{id:'v6',name:'協力業者 F'},{id:'v7',name:'協力業者 G'},{id:'v8',name:'協力業者 H'},{id:'v9',name:'協力業者 I'}
  ],
  bookings:[
    {vendorId:'v1',patient:'田中様',start:'8:10',end:'9:40',state:'向かい中'},
    {vendorId:'v2',patient:'佐藤様',start:'8:10',end:'9:40',state:'搬送中'},
    {vendorId:'v3',patient:'山田様',start:'8:10',end:'9:40',state:'終了'},
    {vendorId:'v4',patient:'高橋様',start:'13:40',end:'15:10',state:'予約'},
    {vendorId:'v6',patient:'鈴木様',start:'16:30',end:'18:00',state:'待機'}
  ],
  days:[
    {date:'4/29',cases:8,adjusts:8,notices:[]},
    {date:'4/30',cases:8,adjusts:7,notices:[]},
    {date:'5/1',cases:8,adjusts:8,notices:[]},
    {date:'5/2',cases:8,adjusts:7,notices:[]},
    {date:'5/3',cases:8,adjusts:8,notices:[{label:'請求書発行',color:'blue'},{label:'',color:'blue'},{label:'',color:'blue'}]},
    {date:'5/4',cases:8,adjusts:7,notices:[{label:'要確認 7件',color:'pink'},{label:'支払い',color:'yellow'}]},
    {date:'5/5',cases:8,adjusts:8,notices:[]}
  ],
  statuses:[
    {name:'協力業者 A',state:'待機'},
    {name:'協力業者 B',state:'向かい中'},
    {name:'協力業者 C',state:'向かい中'},
    {name:'協力業者 D',state:'搬送中'},
    {name:'協力業者 E',state:'終了'},
    {name:'協力業者 F',state:'終了'},
    {name:'協力業者 G',state:'終了'}
  ]
};
