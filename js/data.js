window.CareTaxiData = window.CareTaxiData || {
  contractors: ['協力業者 A','協力業者 B','協力業者 C','協力業者 D','協力業者 E','協力業者 F','協力業者 G'],
  days: [
    {date:'4/29', jobs:8, adjustments:8, statuses:[]},
    {date:'4/30', jobs:8, adjustments:7, statuses:[]},
    {date:'5/1', jobs:8, adjustments:8, statuses:[]},
    {date:'5/2', jobs:8, adjustments:7, statuses:[]},
    {date:'5/3', jobs:8, adjustments:8, statuses:[{text:'請求書発行', type:'blue'}, {text:'', type:'empty'}, {text:'', type:'empty'}]},
    {date:'5/4', jobs:8, adjustments:7, alert:true, statuses:[{text:'支払い', type:'yellow'}]},
    {date:'5/5', jobs:8, adjustments:8, statuses:[]}
  ]
};
