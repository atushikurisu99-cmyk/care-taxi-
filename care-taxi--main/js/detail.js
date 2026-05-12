(function(){
  function render(root,data){
    root.innerHTML='';
    data.detailRows.forEach((t,i)=>{const div=document.createElement('div');div.className=i===data.detailRows.length-1?'detail-line detail-dash':'detail-line';div.textContent=t;root.appendChild(div);});
  }
  window.CareTaxiDetail={render};
})();
