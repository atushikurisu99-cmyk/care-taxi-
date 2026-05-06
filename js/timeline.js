window.AppTimeline=function(){

  function render(root,onSelect){

    root.innerHTML="";

    try{

      var drivers=window.AppData.drivers||[];

      var startHour=8;
      var endHour=18;

      var leftWidth=140;
      var topHeight=50;

      var hourWidth=120;
      var rowHeight=72;

      var html='';

      html+='<div style="position:absolute;left:0;top:0;right:0;bottom:0;overflow:auto;">';

      /* 時間軸 */
      for(var h=startHour;h<=endHour;h++){

        var x=leftWidth+((h-startHour)*hourWidth);

        html+='<div style="position:absolute;';
        html+='left:'+x+'px;';
        html+='top:0;';
        html+='width:'+hourWidth+'px;';
        html+='height:'+topHeight+'px;';
        html+='border-left:1px solid #d0d0d0;';
        html+='font-size:18px;';
        html+='font-weight:700;';
        html+='color:#666;';
        html+='padding-top:12px;';
        html+='box-sizing:border-box;';
        html+='text-align:center;';
        html+='">';
        html+=h+':00';
        html+='</div>';

      }

      /* 業者レーン */
      for(var i=0;i<drivers.length;i++){

        var y=topHeight+(i*rowHeight);

        html+='<div style="position:absolute;';
        html+='left:0;';
        html+='top:'+y+'px;';
        html+='width:'+leftWidth+'px;';
        html+='height:'+rowHeight+'px;';
        html+='border-top:1px solid #e2e2e2;';
        html+='font-size:20px;';
        html+='font-weight:700;';
        html+='padding-left:18px;';
        html+='padding-top:22px;';
        html+='box-sizing:border-box;';
        html+='color:#333;';
        html+='background:#f7f7f7;';
        html+='">';
        html+=drivers[i].name;
        html+='</div>';

        /* 横ライン */
        html+='<div style="position:absolute;';
        html+='left:'+leftWidth+'px;';
        html+='top:'+y+'px;';
        html+='right:0;';
        html+='height:'+rowHeight+'px;';
        html+='border-top:1px solid #ededed;';
        html+='box-sizing:border-box;';
        html+='"></div>';

      }

      html+='</div>';

      root.innerHTML=html;

    }catch(e){

      root.innerHTML=
        '<div style="padding:30px;color:red;font-size:22px;font-weight:900;">'
        +'ERROR : '+e.message+
        '</div>';

    }

  }

  function selectJob(id){}

  return{
    render:render,
    selectJob:selectJob
  };

}();
