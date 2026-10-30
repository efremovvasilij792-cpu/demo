(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ===== Огонь в топке ===== */
  const cv = document.getElementById('fire');
  if (cv) {
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, dpr = 1, wind = 0, windTarget = 0, power = 0.55;
    const parts = [];

    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    // Смена размера очищает холст: без анимации кадр надо нарисовать заново
    addEventListener('resize', () => { size(); if (reduce) frame(); });

    // Тяга: пламя клонится к курсору рядом с печью
    const stove = cv.parentElement;
    stove.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      windTarget = Math.max(-1, Math.min(1, dx)) * 0.9;
    });
    stove.addEventListener('pointerleave', () => { windTarget = 0; });

    // Мощность из калькулятора делает огонь сильнее
    window.setFirePower = p => { power = p; };

    const spawn = () => {
      const x = w * (0.18 + Math.random() * 0.64);
      parts.push({
        x, y: h * 0.92,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(0.6 + Math.random() * 1.1) * (0.6 + power),
        life: 0, max: 40 + Math.random() * 40,
        r: (w * 0.06) + Math.random() * w * 0.07
      });
    };

    const logs = () => {
      ctx.fillStyle = '#2a1a10';
      ctx.save();
      ctx.translate(w / 2, h * 0.93);
      ctx.rotate(-0.08); ctx.fillRect(-w * 0.38, -h * 0.05, w * 0.76, h * 0.08);
      ctx.rotate(0.18); ctx.fillRect(-w * 0.34, -h * 0.1, w * 0.68, h * 0.07);
      ctx.restore();
      const g = ctx.createLinearGradient(0, h * 0.82, 0, h);
      g.addColorStop(0, 'rgba(255,120,30,.0)');
      g.addColorStop(1, 'rgba(255,110,20,.55)');
      ctx.fillStyle = g; ctx.fillRect(0, h * 0.82, w, h * 0.18);
    };

    function frame() {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#120c08';
      ctx.fillRect(0, 0, w, h);
      wind += (windTarget - wind) * 0.05;

      const n = Math.round(3 + power * 5);
      for (let i = 0; i < n; i++) spawn();

      ctx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life++;
        p.vx += wind * 0.06 + (Math.random() - 0.5) * 0.12;
        p.x += p.vx; p.y += p.vy;
        const t = p.life / p.max;
        if (t >= 1 || p.y < -20) { parts.splice(i, 1); continue; }
        const rad = p.r * (1 - t * 0.7);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
        const a = (1 - t) * 0.5;
        g.addColorStop(0, `rgba(255,${200 - t * 120 | 0},${90 - t * 80 | 0},${a})`);
        g.addColorStop(1, 'rgba(200,60,10,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      logs();
      if (!reduce && visible) requestAnimationFrame(frame);
    }

    // Огонь не горит впустую, пока печь за пределами экрана
    let visible = true;
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => {
        const was = visible;
        visible = e.isIntersecting;
        if (visible && !was) requestAnimationFrame(frame);
      }).observe(cv);
    }

    if (reduce) {
      // Без анимации: один «застывший» кадр огня
      for (let k = 0; k < 60; k++) { for (let i = 0; i < 6; i++) spawn(); parts.forEach(p => { p.life++; p.x += p.vx; p.y += p.vy; }); }
      frame();
    } else {
      requestAnimationFrame(frame);
    }
  }

  /* ===== Калькулятор мощности ===== */
  const form = document.querySelector('.calc-form');
  if (!form) return;
  const $ = id => document.getElementById(id);
  const area = $('area'), areaOut = $('area-out'), areaLabel = $('area-label');
  const kwEl = $('kw'), advice = $('advice'), send = $('send'), meter = $('meter-fill');
  const val = name => form.querySelector(`input[name="${name}"]:checked`).value;
  let lastKind = 'house';

  const calc = () => {
    const kind = val('kind');
    if (kind !== lastKind) {
      // Для бани считаем по парилке, у неё другой диапазон
      if (kind === 'bath') { area.min = 3; area.max = 25; area.step = 1; area.value = 6; }
      else if (lastKind === 'bath') { area.min = 10; area.max = 250; area.step = 5; area.value = 80; }
      lastKind = kind;
    }
    const s = +area.value, c = +val('ceil'), k = +val('warm');
    let kw, text;

    if (kind === 'bath') {
      areaLabel.textContent = 'Площадь парилки';
      const vol = s * c;
      kw = vol * k; // около 1 кВт на 1 м³ парилки
      text = kw <= 18
        ? 'Подойдёт банная печь с закрытой каменкой. Если топите из предбанника, берите модель с выносным тоннелем.'
        : 'Нужна мощная банная печь с большой каменкой. Для большой парилки часто ставят модель с баком под воду.';
    } else {
      areaLabel.textContent = kind === 'dacha' ? 'Площадь дачи' : 'Площадь дома';
      kw = s * (c / 2.7) / 10 * k;
      if (kind === 'dacha') kw *= 1.2; // быстро прогреть промёрзший дом
      if (kw <= 10) text = 'Подойдёт отопительная печь длительного горения, поставленная в центре дома.';
      else if (kw <= 18) text = 'Подойдёт печь длительного горения с теплообменником, чтобы тепло доходило до дальних комнат.';
      else text = 'Для такой площади обычно ставят твердотопливный котёл с радиаторами или печь с водяным контуром. Обсудим на замере.';
    }
    kw = Math.max(4, Math.round(kw));
    areaOut.textContent = `${s} м²`;
    kwEl.textContent = kw;
    advice.textContent = text;
    const pct = Math.min(1, kw / 30);
    meter.style.transform = `scaleY(${0.18 + pct * 0.82})`;
    if (window.setFirePower) window.setFirePower(0.3 + pct * 0.9);

    const kindName = { house: 'дом', dacha: 'дача на выходные', bath: 'баня' }[kind];
    const msg = `Здравствуйте! Рассчитал печь на сайте.\nОбъект: ${kindName}\n${areaLabel.textContent}: ${s} м²\nПотолки: ${c === 3.2 ? '3 м и выше' : String(c).replace('.', ',') + ' м'}\nМощность: около ${kw} кВт\nПодскажите, какие печи есть в наличии и сколько стоит установка?`;
    send.href = `https://wa.me/79259920702?text=${encodeURIComponent(msg)}`;
  };

  form.addEventListener('input', calc);
  calc();
})();
