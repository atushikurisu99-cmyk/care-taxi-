window.CareTaxiLocation=(function(){
  var cfg={start:'6:30',end:'20:00',step:30,rowH:36,colW:26};
  var st={};
  function toMin(t){var p=t.split(':');return Number(p[0])*60+Number(p[1]);}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
  function xFor(t){return ((toMin(t)-toMin(cfg.start))/cfg.step)*cfg.colW;}
  function render(root){
    var vendors=window.CareTaxiData.vendors;
    var total=(toMin(cfg.end)-toMin(cfg.start))/cfg.step;
    var w=total*cfg.colW;
    var h=vendors.length*cfg.rowH;
    root.innerHTML='<div class="location"><div class="section-title">LOCATION</div><div class="location-board">'+
      '<div class="loc-corner"><span>担当者</span></div>'+
      '<div class="loc-time-view"><div id="locTime" class="loc-time-strip"></div></div>'+
      '<div class="loc-name-view"><div id="locNames" class="loc-name-strip"></div></div>'+
      '<div id="locGridView" class="loc-grid-view no-select"><div id="locCanvas" class="loc-canvas"></div></div>'+
      '<div class="loc-scrollbar"><div id="locThumb" class="loc-thumb"></div></div>'+
      '</div></div>';
    st.root=root;st.view=root.querySelector('#locGridView');st.canvas=root.querySelector('#locCanvas');st.time=root.querySelector('#locTime');st.names=root.querySelector('#locNames');st.thumb=root.querySelector('#locThumb');st.w=w;st.h=h;st.left=0;st.top=0;st.maxLeft=0;st.maxTop=0;st.lock=null;st.down=false;
    st.time.style.width=w+'px';st.canvas.style.width=w+'px';st.canvas.style.height=h+'px';
    drawTime(total);drawNames(vendors);drawGrid(total,vendors.length);drawBookings(vendors);drawNow();measure();bind();apply();
    window.addEventListener('resize',function(){measure();apply();},false);
  }
  function drawTime(total){var html='',start=toMin(cfg.start);for(var i=0;i<=total;i++){var m=start+i*cfg.step,h=Math.floor(m/60),mm=m%60;var label=mm===0?h+':00':h+':'+('0'+mm).slice(-2);html+='<div class="loc-time-cell '+(mm===0?'hour':'half')+'" style="left:'+(i*cfg.colW)+'px;width:'+cfg.colW+'px">'+label+'</div>';}st.time.innerHTML=html;}
  function drawNames(vendors){var html='';for(var i=0;i<vendors.length;i++){html+='<div class="loc-name-row">'+vendors[i].name+'</div>';}st.names.innerHTML=html;}
  function drawGrid(total,rows){var html='';for(var i=0;i<=total;i++){var minute=toMin(cfg.start)+i*cfg.step;html+='<div class="grid-line-v '+(minute%60===0?'hour':'')+'" style="left:'+(i*cfg.colW)+'px;height:'+(rows*cfg.rowH)+'px"></div>';}for(var r=0;r<=rows;r++){html+='<div class="grid-line-h" style="top:'+(r*cfg.rowH)+'px;width:'+st.w+'px"></div>';}st.canvas.innerHTML=html;}
  function drawBookings(vendors){var html=st.canvas.innerHTML;var bks=window.CareTaxiData.bookings;for(var i=0;i<bks.length;i++){var b=bks[i],row=0;for(var v=0;v<vendors.length;v++){if(vendors[v].id===b.vendorId){row=v;break;}}var left=xFor(b.start),width=Math.max(26,xFor(b.end)-left);html+='<button class="booking" data-book="'+i+'" style="left:'+left+'px;top:'+(row*cfg.rowH)+'px;width:'+width+'px"><span class="patient">'+b.patient+'</span><span class="state">'+b.state+'</span></button>';}
st.canvas.innerHTML=html;var btns=st.canvas.querySelectorAll('[data-book]');for(var j=0;j<btns.length;j++){btns[j].onclick=function(){var idx=Number(this.getAttribute('data-book')),b=window.CareTaxiData.bookings[idx],v=null;for(var k=0;k<vendors.length;k++){if(vendors[k].id===b.vendorId){v=vendors[k];break;}}window.CareTaxiDetail.showBooking(b,v);};}}
  function drawNow(){var m=12*60+30;var left=((m-toMin(cfg.start))/cfg.step)*cfg.colW;var n=document.createElement('div');n.className='now-line';n.style.left=left+'px';n.style.height=st.h+'px';st.canvas.appendChild(n);}
  function measure(){st.maxLeft=Math.max(0,st.w-st.view.clientWidth);st.maxTop=Math.max(0,st.h-st.view.clientHeight);st.left=clamp(st.left,0,st.maxLeft);st.top=clamp(st.top,0,st.maxTop);}
  function apply(){st.left=clamp(st.left,0,st.maxLeft);st.top=clamp(st.top,0,st.maxTop);var tr='translate('+(-st.left)+'px,'+(-st.top)+'px)';st.canvas.style.transform=tr;st.canvas.style.webkitTransform=tr;st.time.style.transform='translateX('+(-st.left)+'px)';st.time.style.webkitTransform='translateX('+(-st.left)+'px)';st.names.style.transform='translateY('+(-st.top)+'px)';st.names.style.webkitTransform='translateY('+(-st.top)+'px)';var track=st.view.clientWidth,thumbW=st.maxLeft?Math.max(35,track*(track/st.w)):track;var thumbL=st.maxLeft?(track-thumbW)*(st.left/st.maxLeft):0;st.thumb.style.width=thumbW+'px';st.thumb.style.left=thumbL+'px';}
  function moveBy(dx,dy){st.left=clamp(st.left+dx,0,st.maxLeft);st.top=clamp(st.top+dy,0,st.maxTop);apply();}
  function bind(){
    st.view.addEventListener('wheel',function(e){e.preventDefault();var ax=Math.abs(e.deltaX)>Math.abs(e.deltaY)?'x':'y';if(ax==='x'){moveBy(e.deltaX,0);}else{moveBy(0,e.deltaY);}}, {passive:false});
    st.view.addEventListener('touchstart',function(e){if(e.touches.length!==1)return;st.down=true;st.lock=null;st.sx=e.touches[0].clientX;st.sy=e.touches[0].clientY;st.sl=st.left;st.st=st.top;}, {passive:false});
    st.view.addEventListener('touchmove',function(e){if(!st.down||e.touches.length!==1)return;e.preventDefault();var x=e.touches[0].clientX,y=e.touches[0].clientY,dx=x-st.sx,dy=y-st.sy;if(!st.lock&&Math.max(Math.abs(dx),Math.abs(dy))>5){st.lock=Math.abs(dx)>=Math.abs(dy)?'x':'y';}if(st.lock==='x'){st.left=clamp(st.sl-dx,0,st.maxLeft);}else if(st.lock==='y'){st.top=clamp(st.st-dy,0,st.maxTop);}apply();}, {passive:false});
    st.view.addEventListener('touchend',function(){st.down=false;st.lock=null;}, false);
    st.view.addEventListener('mousedown',function(e){st.down=true;st.lock=null;st.sx=e.clientX;st.sy=e.clientY;st.sl=st.left;st.st=st.top;document.body.className+=' no-select';e.preventDefault();}, false);
    window.addEventListener('mousemove',function(e){if(!st.down)return;var dx=e.clientX-st.sx,dy=e.clientY-st.sy;if(!st.lock&&Math.max(Math.abs(dx),Math.abs(dy))>5){st.lock=Math.abs(dx)>=Math.abs(dy)?'x':'y';}if(st.lock==='x'){st.left=clamp(st.sl-dx,0,st.maxLeft);}else if(st.lock==='y'){st.top=clamp(st.st-dy,0,st.maxTop);}apply();}, false);
    window.addEventListener('mouseup',function(){st.down=false;st.lock=null;document.body.className=document.body.className.replace(' no-select','');}, false);
  }
  return {render:render};
})();
