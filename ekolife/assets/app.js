/* ЭкоЛайф — демо-сайт */
(function () {
  const WA = '79257556595';
  // природа оживлена всегда: это главный эффект сайта, анимации мягкие
  const reduce = false;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- Шапка, меню, мобильная панель ---------- */
  const header = $('#header');
  const mbar = $('.mbar');
  const onScroll = () => {
    const y = scrollY;
    header.classList.toggle('scrolled', y > 30);
    mbar.classList.toggle('show', y > innerHeight * .6);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  $('#burger').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  $$('#nav a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));

  /* ---------- Появление и счётчики ---------- */
  const countUp = el => {
    const to = +el.dataset.count;
    if (reduce) { el.textContent = to; return; }
    const t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / 1400);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      const counters = $$('[data-count]', e.target);
      if (document.body.classList.contains('loading')) addEventListener('site:ready', () => counters.forEach(countUp), { once: true });
      else counters.forEach(countUp);
      io.unobserve(e.target);
    });
  }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  /* ---------- Телефон вылетает сразу при открытии ---------- */
  const wrap = $('#deviceWrap');
  // после посадки снимаем анимацию — телефон становится обычным резким элементом
  wrap.addEventListener('animationend', e => { if (e.target === wrap) wrap.classList.add('landed'); });
  setTimeout(() => wrap.classList.add('landed'), 1900);
  requestAnimationFrame(() => {
    wrap.classList.add('launch');
    // телефон «приземляется» — от него расходится волна по траве
    setTimeout(() => {
      const r = wrap.getBoundingClientRect();
      dispatchEvent(new CustomEvent('phone:land', { detail: { x: r.left + r.width / 2, y: r.bottom } }));
    }, 1000);
  });

  /* ---------- Наклон телефона за мышью и эффект при наведении ---------- */
  const device = $('#device');
  // Наклон плавно догоняет мышь. Когда мышь замерла или курсор на самом телефоне,
  // телефон возвращается ровно — и в покое стоит без transform, то есть максимально чётко.
  let tx = 0, ty = 0, cx = 0, cy = 0, tiltRaf = 0, idle = 0, onPhone = false, lastT = 0;
  const tilt = now => {
    const k = 1 - Math.pow(.88, Math.min(4, (now - (lastT || now)) / 16.67)); // одинаково при 60 и 144 Гц
    lastT = now;
    const gx = onPhone ? 0 : tx, gy = onPhone ? 0 : ty;
    cx += (gx - cx) * k; cy += (gy - cy) * k;
    if (Math.abs(gx - cx) + Math.abs(gy - cy) < .015 && gx === 0 && gy === 0) {
      cx = cy = 0; device.style.transform = ''; tiltRaf = 0; lastT = 0;
      return;
    }
    device.style.transform = `rotateY(${cx.toFixed(3)}deg) rotateX(${cy.toFixed(3)}deg)`;
    if (Math.abs(gx - cx) + Math.abs(gy - cy) < .015) { tiltRaf = 0; lastT = 0; return; }
    tiltRaf = requestAnimationFrame(tilt);
  };
  const kick = () => { if (!tiltRaf) tiltRaf = requestAnimationFrame(tilt); };
  const rest = () => { clearTimeout(idle); idle = setTimeout(() => { tx = ty = 0; kick(); }, 1400); };
  // уход курсора — с маленькой задержкой, чтобы плашки не дёргались на краю телефона
  let hotTimer = 0;
  const setHot = on => {
    clearTimeout(hotTimer);
    if (on) wrap.classList.add('hot');
    else hotTimer = setTimeout(() => wrap.classList.remove('hot'), 140);
  };
  if (matchMedia('(hover: hover)').matches) {
    $('.hero').addEventListener('mousemove', e => {
      tx = (e.clientX / innerWidth - .5) * 12;
      ty = -(e.clientY / innerHeight - .5) * 8;
      kick(); rest();
    }, { passive: true });
    $('.hero').addEventListener('mouseleave', () => { tx = ty = 0; kick(); });
    wrap.addEventListener('mouseenter', () => { onPhone = true; setHot(true); kick(); });
    wrap.addEventListener('mouseleave', () => { onPhone = false; setHot(false); kick(); });
  } else {
    // на телефоне — по касанию
    wrap.addEventListener('click', e => { if (!e.target.closest('a')) setHot(!wrap.classList.contains('hot')); });
  }

  /* ---------- Как работает: шаги и схема ---------- */
  const steps = $$('#howSteps li');
  const station = $('#station');
  const cap = $('#howCap');
  let cur = 0, auto;
  const setStep = n => {
    cur = n;
    steps.forEach((li, i) => li.classList.toggle('active', i === n));
    station.classList.add('has-active');
    $$('.ch', station).forEach((g, i) => g.classList.toggle('on', i === n));
    $$('.hl rect', station).forEach((r, i) => r.classList.toggle('on', i === n));
    cap.textContent = $('b', steps[n]).textContent;
  };
  const startAuto = () => { clearInterval(auto); if (!reduce) auto = setInterval(() => setStep((cur + 1) % steps.length), 4200); };
  steps.forEach((li, i) => li.addEventListener('click', () => { setStep(i); startAuto(); }));
  $$('.ch', station).forEach((g, i) => g.addEventListener('click', () => { setStep(i); startAuto(); }));
  setStep(0);
  new IntersectionObserver(([e]) => (e.isIntersecting ? startAuto() : clearInterval(auto))).observe(station);

  /* ---------- Калькулятор ---------- */
  const people = $('#people');
  const state = { mode: 'all', soil: 'sand', out: 'grav' };
  const labels = {
    mode: { all: 'круглый год', season: 'дача, по сезону' },
    soil: { sand: 'песок', loam: 'суглинок', clay: 'глина', water: 'высокие грунтовые воды' },
    out: { grav: 'самотёком', pump: 'насосом' }
  };
  const sizes = [3, 5, 6, 8, 10, 12];
  const base = { 3: 110000, 5: 145000, 6: 158000, 8: 195000, 10: 235000, 12: 275000 };
  const soilAdd = { sand: 0, loam: 8000, clay: 18000, water: 32000 };
  const fmt = n => n.toLocaleString('ru-RU');
  let shownPrice = 0, priceAnim;

  const animatePrice = to => {
    const el = $('#resPrice');
    cancelAnimationFrame(priceAnim);
    if (reduce || !shownPrice) { shownPrice = to; el.textContent = fmt(to); return; }
    const from = shownPrice, t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / 500);
      shownPrice = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      el.textContent = fmt(shownPrice);
      if (k < 1) priceAnim = requestAnimationFrame(step);
    };
    priceAnim = requestAnimationFrame(step);
  };

  const calc = () => {
    const n = +people.value;
    const bath = $('#bath').checked;
    $('#peopleOut').textContent = n;
    people.style.setProperty('--p', ((n - 1) / 11 * 100) + '%');

    let idx = sizes.findIndex(s => s >= n);
    if (bath && idx < sizes.length - 1) idx++;
    const capN = sizes[idx];
    const season = state.mode === 'season' && capN <= 5;

    let price = base[capN] * (season ? .86 : 1) + soilAdd[state.soil] + (state.out === 'pump' ? 14000 : 0);
    price = Math.round(price / 1000) * 1000;

    let model = season ? `Септик для дачи на ${capN} пользователей` : `Станция биоочистки на ${capN} пользователей`;
    if (state.soil === 'water') model += ', усиленный корпус';
    if (state.out === 'pump') model += ', с насосом';

    $('#resModel').textContent = model;
    $('#resFlow').textContent = (capN * .2).toFixed(1).replace('.', ',') + ' м³/сут';
    $('#resBurst').textContent = capN * 50 + ' л';
    animatePrice(price);

    const text = `Здравствуйте! Посчитал септик на сайте: ${n} чел., ${labels.mode[state.mode]}, грунт — ${labels.soil[state.soil]}, отвод ${labels.out[state.out]}${bath ? ', есть большая ванна' : ''}. ` +
      `Рекомендация: ${model.toLowerCase()}, ориентировочно ${fmt(price)} ₽. Хочу точную смету.`;
    $('#sendCalc').href = `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
    $('#leadMsg').placeholder = `${n} чел., ${labels.soil[state.soil]}, ${labels.mode[state.mode]}`;
  };

  $$('.seg').forEach(seg => {
    seg.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      $$('button', seg).forEach(x => x.classList.toggle('on', x === b));
      state[seg.dataset.name] = b.dataset.v;
      calc();
    });
  });
  people.addEventListener('input', calc);
  $('#bath').addEventListener('change', calc);
  calc();

  /* ---------- Тарифы → форма ---------- */
  $$('[data-plan]').forEach(a => a.addEventListener('click', () => {
    $('#leadMsg').value = `Интересует решение «${a.dataset.plan}».`;
  }));

  /* ---------- Форма заявки → WhatsApp ---------- */
  $('#leadForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const text = `Заявка с сайта ЭкоЛайф\nИмя: ${f.get('name')}\nТелефон: ${f.get('phone')}` + (f.get('msg') ? `\n${f.get('msg')}` : '');
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });

  $('#year').textContent = new Date().getFullYear();
})();
