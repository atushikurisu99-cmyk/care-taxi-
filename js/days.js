window.AppDays = (function(){

  function render(root){

    var html = '';

    html += '<div style="position:absolute;inset:0;display:flex;gap:10px;align-items:flex-start;padding-top:18px;box-sizing:border-box;">';

    for(var i=0;i<14;i++){
      html += '<div style="';
      html += 'width:58px;';
      html += 'height:92px;';
      html += 'border:1px solid rgba(0,0,0,0.08);';
      html += 'border-radius:11px;';
      html += 'background:#fff;';
      html += 'box-sizing:border-box;';
      html += 'padding-top:10px;';
      html += 'text-align:center;';
      html += 'font-size:11px;';
      html += 'color:#555;';
      html += '">';
      html += '<div style="font-size:16px;font-weight:800;color:#333;line-height:24px;">'+(i+1)+'</div>';
      html += '<div style="font-size:10px;color:#888;line-height:18px;">案件</div>';
      html += '<div style="font-size:13px;font-weight:700;color:#333;line-height:18px;">3</div>';
      html += '<div style="font-size:10px;color:#999;line-height:18px;">状態</div>';
      html += '</div>';
    }

    html += '</div>';

    root.innerHTML = html;
  }

  return {
    render: render
  };

})();
