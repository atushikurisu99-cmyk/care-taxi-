window.CareTaxiData={
  dateLabel:'5/10（日） 05:14',
  hours:['7:00','8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'],
  contractors:[
    {id:'a',name:'協力業者 A'},
    {id:'b',name:'協力業者 B'},
    {id:'c',name:'協力業者 C'},
    {id:'d',name:'協力業者 D'},
    {id:'e',name:'協力業者 E'},
    {id:'f',name:'協力業者 F'},
    {id:'g',name:'協力業者 G'},
    {id:'h',name:'協力業者 H'},
    {id:'i',name:'協力業者 I'},
    {id:'j',name:'協力業者 J'}
  ],
  jobs:[
    {id:'job-001',contractorId:'a',patient:'田中様',status:'向かい中',start:'08:20',end:'10:20'},
    {id:'job-002',contractorId:'b',patient:'佐藤様',status:'搬送中',start:'08:35',end:'09:50'},
    {id:'job-003',contractorId:'c',patient:'山田様',status:'終了',start:'08:45',end:'10:30'},
    {id:'job-004',contractorId:'d',patient:'井上様',status:'仮登録',start:'13:30',end:'14:10',type:'temp'},
    {id:'job-005',contractorId:'f',patient:'高橋様',status:'要確認',start:'16:20',end:'17:10',type:'alert'}
  ],
  detailRows:['時間','患者名','出発 → 到着','担当','状態','特記','ーーー'],
  days:[
    {date:'4/29',jobs:8,adjustments:8,statuses:[]},
    {date:'4/30',jobs:8,adjustments:7,statuses:[]},
    {date:'5/1',jobs:8,adjustments:8,statuses:[]},
    {date:'5/2',jobs:8,adjustments:7,statuses:[]},
    {date:'5/3',jobs:8,adjustments:8,statuses:[{text:'請求書発行',type:'blue'},{text:'',type:'empty'},{text:'',type:'empty'}]},
    {date:'5/4',jobs:8,adjustments:7,alert:true,statuses:[{text:'支払い',type:'yellow'}]},
    {date:'5/5',jobs:8,adjustments:8,statuses:[]}
  ],
  statuses:[
    ['協力業者 A','待機'],['協力業者 B','向かい中'],['協力業者 C','向かい中'],['協力業者 D','搬送中'],['協力業者 E','終了'],['協力業者 F','終了'],['協力業者 G','終了']
  ]
};
