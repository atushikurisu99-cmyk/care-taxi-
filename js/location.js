/*
  LOCATION SCROLL RULES
  This file must preserve the PDF trace philosophy:
  1. Do not scroll the whole LOCATION block.
  2. Keep vendor names fixed horizontally.
  3. Keep time header fixed vertically.
  4. Move only the timeline canvas.
  5. Allow vertical and horizontal movement, but never diagonal movement in one gesture.
*/
(function(){
  const cfg = window.CareTaxiConfig.timeline;

  function toMinutes(time){
    const [h,m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  function nowMinutesClamped(){
    const d = new Date();
    return clamp(d.getHours() * 60 + d.getMinutes(), toMinutes(cfg.start), toMinutes(cfg.end));
  }

  function leftForTime(time){
    const min = typeof time === 'number' ? time : toMinutes(time);
    return ((min - toMinutes(cfg.start)) / cfg.stepMinutes) * cfg.halfHourWidth;
  }

  window.CareTaxiLocation = {
    render(root){
      const vendors = window.CareTaxiData.vendors;
      const bookings = window.CareTaxiData.bookings;
      const totalMinutes = toMinutes(cfg.end) - toMinutes(cfg.start);
      const slots = totalMinutes / cfg.stepMinutes;
      const timelineW = slots * cfg.halfHourWidth;
      const rowsH = vendors.length * cfg.rowHeight;

      root.innerHTML = `
        <section class="location-wrap">
          <div class="section-title">LOCATION</div>
          <div class="location-board" id="location-board">
            <div class="location-corner"><div class="location-corner-label">担当者</div></div>
            <div class="location-time-viewport"><div class="location-time-strip" id="location-time-strip" style="width:${timelineW}px"></div></div>
            <div class="location-person-viewport"><div class="location-person-strip" id="location-person-strip"></div></div>
            <div class="location-grid-viewport no-select" id="location-grid-viewport">
              <div class="location-scroll-canvas" id="location-scroll-canvas" style="width:${timelineW}px;height:${rowsH}px">
                <div class="location-grid-layer" id="location-grid-layer" style="width:${timelineW}px;height:${rowsH}px"></div>
                <div class="location-booking-layer" id="location-booking-layer" style="width:${timelineW}px;height:${rowsH}px"></div>
                <div class="location-now-layer" id="location-now-layer" style="width:${timelineW}px;height:${rowsH}px"></div>
              </div>
            </div>
            <div class="location-scrollbar"><div class="location-scrollbar-thumb" id="location-scrollbar-thumb"></div></div>
          </div>
        </section>
      `;

      this.state = {
        root,
        board: root.querySelector('#location-board'),
        viewport: root.querySelector('#location-grid-viewport'),
        canvas: root.querySelector('#location-scroll-canvas'),
        timeStrip: root.querySelector('#location-time-strip'),
        personStrip: root.querySelector('#location-person-strip'),
        gridLayer: root.querySelector('#location-grid-layer'),
        bookingLayer: root.querySelector('#location-booking-layer'),
        nowLayer: root.querySelector('#location-now-layer'),
        scrollbarThumb: root.querySelector('#location-scrollbar-thumb'),
        scrollLeft: 0,
        scrollTop: 0,
        maxLeft: 0,
        maxTop: 0,
        timelineW,
        rowsH,
        isDragging: false,
        lockAxis: null,
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0,
        autoTimer: null
      };

      this.renderTimeHeader(slots);
      this.renderPersons(vendors);
      this.renderGrid(slots, vendors.length);
      this.renderBookings(bookings, vendors);
      this.renderNowLine();
      this.measure();
      this.bindDrag();
      this.returnToNow(false);
      window.addEventListener('resize', () => { this.measure(); this.apply(); this.returnToNow(false); }, { passive:true });
      setInterval(() => { this.renderNowLine(); this.scheduleAutoReturn(); }, 60 * 1000);
    },

    renderTimeHeader(slots){
      let html = '';
      const start = toMinutes(cfg.start);
      for(let i=0; i<=slots; i++){
        const m = start + i * cfg.stepMinutes;
        const h = Math.floor(m / 60);
        const mm = m % 60;
        const label = mm === 0 ? `${h}:00` : `${h}:${String(mm).padStart(2,'0')}`;
        html += `<div class="time-cell ${mm === 0 ? 'hour' : 'half'}" style="left:${i * cfg.halfHourWidth}px;width:${cfg.halfHourWidth}px">${label}</div>`;
      }
      this.state.timeStrip.innerHTML = html;
    },

    renderPersons(vendors){
      this.state.personStrip.innerHTML = vendors.map(v => `<div class="person-row">${v.name}</div>`).join('');
    },

    renderGrid(slots, rowCount){
      const totalH = rowCount * cfg.rowHeight;
      let html = '';
      for(let i=0; i<=slots; i++){
        const minute = toMinutes(cfg.start) + i * cfg.stepMinutes;
        html += `<div class="grid-vline ${minute % 60 === 0 ? 'hour' : ''}" style="left:${i * cfg.halfHourWidth}px;height:${totalH}px"></div>`;
      }
      for(let r=0; r<=rowCount; r++){
        html += `<div class="grid-hline" style="top:${r * cfg.rowHeight}px"></div>`;
      }
      this.state.gridLayer.innerHTML = html;
    },

    renderBookings(bookings, vendors){
      const vendorIndex = new Map(vendors.map((v,i)=>[v.id,i]));
      const colors = {
        insurance: '#E9F6FF',
        cash: '#EFF7E7',
        office: '#FFF4D8',
        temporary: '#FFFFFF'
      };
      const html = bookings.map(b => {
        const row = vendorIndex.get(b.vendorId);
        if(row == null) return '';
        const left = leftForTime(b.start);
        const width = Math.max(42, leftForTime(b.end) - leftForTime(b.start));
        const top = row * cfg.rowHeight;
        const tempClass = b.temporary ? 'is-temp' : '';
        const statusClass = b.unassigned ? 'is-unassigned' : '';
        const bg = '#a9ddd3';
        return `
          <button class="booking-band ${tempClass}" type="button" data-booking-id="${b.id}" style="left:${left}px;top:${top}px;width:${width}px;background:${bg}">
            <span class="booking-patient">${b.patient}</span>
            <span class="booking-status ${statusClass}">${b.status}</span>
          </button>
        `;
      }).join('');
      this.state.bookingLayer.innerHTML = html;
      this.state.bookingLayer.querySelectorAll('[data-booking-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const booking = window.CareTaxiData.bookings.find(b => b.id === btn.dataset.bookingId);
          const vendor = window.CareTaxiData.vendors.find(v => v.id === booking.vendorId);
          window.CareTaxiDetail.showBooking(booking, vendor);
        });
      });
    },

    renderNowLine(){
      if(!this.state) return;
      const left = leftForTime(nowMinutesClamped());
      this.state.nowLayer.innerHTML = `<div class="now-line" style="left:${left}px"></div>`;
    },

    measure(){
      const s = this.state;
      const rect = s.viewport.getBoundingClientRect();
      s.viewW = rect.width;
      s.viewH = rect.height;
      s.maxLeft = Math.max(0, s.timelineW - s.viewW);
      s.maxTop = Math.max(0, s.rowsH - s.viewH);
      s.scrollLeft = clamp(s.scrollLeft, 0, s.maxLeft);
      s.scrollTop = clamp(s.scrollTop, 0, s.maxTop);
      this.apply();
    },

    apply(){
      const s = this.state;
      s.canvas.style.transform = `translate3d(${-s.scrollLeft}px, ${-s.scrollTop}px, 0)`;
      s.timeStrip.style.transform = `translate3d(${-s.scrollLeft}px, 0, 0)`;
      s.personStrip.style.transform = `translate3d(0, ${-s.scrollTop}px, 0)`;
      if(s.scrollbarThumb && s.viewW){
        const barW = s.viewport.getBoundingClientRect().width;
        const thumbW = Math.max(80, barW * (s.viewW / Math.max(s.timelineW, s.viewW)));
        const maxThumbLeft = Math.max(0, barW - thumbW);
        const thumbLeft = s.maxLeft ? (s.scrollLeft / s.maxLeft) * maxThumbLeft : 0;
        s.scrollbarThumb.style.width = thumbW + 'px';
        s.scrollbarThumb.style.left = thumbLeft + 'px';
      }
    },

    bindDrag(){
      const s = this.state;
      const onPointerDown = (e) => {
        s.isDragging = true;
        s.lockAxis = null;
        s.startX = e.clientX;
        s.startY = e.clientY;
        s.startLeft = s.scrollLeft;
        s.startTop = s.scrollTop;
        s.viewport.setPointerCapture(e.pointerId);
        this.clearAutoTimer();
      };
      const onPointerMove = (e) => {
        if(!s.isDragging) return;
        const dx = e.clientX - s.startX;
        const dy = e.clientY - s.startY;
        if(!s.lockAxis){
          if(Math.abs(dx) < cfg.lockThresholdPx && Math.abs(dy) < cfg.lockThresholdPx) return;
          s.lockAxis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        }
        if(s.lockAxis === 'x'){
          e.preventDefault();
          const next = s.startLeft - dx * cfg.horizontalFriction;
          s.scrollLeft = clamp(next, 0, s.maxLeft);
        }else{
          e.preventDefault();
          const next = s.startTop - dy * cfg.verticalFriction;
          s.scrollTop = clamp(next, 0, s.maxTop);
        }
        this.apply();
      };
      const onPointerUp = (e) => {
        if(!s.isDragging) return;
        s.isDragging = false;
        try{ s.viewport.releasePointerCapture(e.pointerId); }catch(_e){}
        if(s.lockAxis === 'x') this.scheduleAutoReturn();
        s.lockAxis = null;
      };
      s.viewport.addEventListener('pointerdown', onPointerDown);
      s.viewport.addEventListener('pointermove', onPointerMove);
      s.viewport.addEventListener('pointerup', onPointerUp);
      s.viewport.addEventListener('pointercancel', onPointerUp);
    },

    clearAutoTimer(){
      if(this.state.autoTimer){
        clearTimeout(this.state.autoTimer);
        this.state.autoTimer = null;
      }
    },

    scheduleAutoReturn(){
      const s = this.state;
      this.clearAutoTimer();
      s.autoTimer = setTimeout(() => this.returnToNow(true), cfg.autoReturnDelayMs);
    },

    returnToNow(animated){
      const s = this.state;
      if(!s || !s.viewW) return;
      const nowX = leftForTime(nowMinutesClamped());
      const desired = nowX - s.viewW * (1 - cfg.futureRatio);
      const target = clamp(desired, 0, s.maxLeft);
      if(animated){
        s.canvas.style.transition = 'transform .28s ease-out';
        s.timeStrip.style.transition = 'transform .28s ease-out';
        setTimeout(() => {
          s.canvas.style.transition = '';
          s.timeStrip.style.transition = '';
        }, 320);
      }
      s.scrollLeft = target;
      this.apply();
    }
  };
})();
