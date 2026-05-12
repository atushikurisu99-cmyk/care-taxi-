window.CareTaxiHeader = {
  render(root){
    root.innerHTML = `
      <header class="app-header">
        <div class="header-left"><button class="header-menu" type="button">MENU</button></div>
        <div class="header-center" id="header-clock">--:--</div>
        <div class="header-right"><button class="header-btn" type="button">予約</button></div>
      </header>
    `;
    this.startClock();
  },
  startClock(){
    const el = document.getElementById('header-clock');
    const tick = () => {
      const d = new Date();
      el.textContent = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    };
    tick();
    setInterval(tick, 1000 * 30);
  }
};
