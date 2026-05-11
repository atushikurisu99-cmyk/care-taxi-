window.CareTaxiData = {
  dateLabel: '5/10（日） 05:14',
  hours: ['7:00','8:00','9:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'],
  contractors: [
    {id:'a', name:'協力業者 A', status:'待機'},
    {id:'b', name:'協力業者 B', status:'向かい中'},
    {id:'c', name:'協力業者 C', status:'到着'},
    {id:'d', name:'協力業者 D', status:'搬送中'},
    {id:'e', name:'協力業者 E', status:'終了'},
    {id:'f', name:'協力業者 F', status:'終了'},
    {id:'g', name:'協力業者 G', status:'待機'},
    {id:'h', name:'協力業者 H', status:'待機'},
    {id:'i', name:'協力業者 I', status:'待機'},
    {id:'j', name:'協力業者 J', status:'終了'},
    {id:'k', name:'協力業者 K', status:'待機'},
    {id:'l', name:'協力業者 L', status:'待機'}
  ],
  jobs: [
    {id:'job-001', contractorId:'a', patient:'田中様', status:'向かい中', start:'08:20', end:'09:30', from:'自宅', to:'市民病院', note:'車椅子'},
    {id:'job-002', contractorId:'b', patient:'佐藤様', status:'搬送中', start:'08:40', end:'09:50', from:'施設', to:'整形外科', note:''},
    {id:'job-003', contractorId:'c', patient:'山田様', status:'到着', start:'09:10', end:'10:20', from:'自宅', to:'総合病院', note:'院内介助'},
    {id:'job-004', contractorId:'d', patient:'井上様', status:'仮登録', start:'13:35', end:'14:12', from:'', to:'', note:'仮'},
    {id:'job-005', contractorId:'a', patient:'村上様', status:'待機', start:'15:10', end:'16:05', from:'病院', to:'自宅', note:''},
    {id:'job-006', contractorId:'f', patient:'高橋様', status:'要確認', start:'16:20', end:'17:15', from:'施設', to:'病院', note:'要確認'}
  ]
};
