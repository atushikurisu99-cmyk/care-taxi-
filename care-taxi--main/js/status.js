(function(){
  function render(root,data){
    root.innerHTML='';
    data.statuses.forEach(row=>{const div=document.createElement('div');div.className='status-row';div.innerHTML='<b>'+row[0]+'</b><span>'+row[1]+'</span>';root.appendChild(div);});
  }
  window.CareTaxiStatus={render};
})();
