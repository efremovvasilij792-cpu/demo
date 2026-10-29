/* Лора мебель — демо-сайт */
(function () {
  const WA = '79107731010';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const K = window.Kitchen;
  const fmt = n => n.toLocaleString('ru-RU');

  /* ---------- Шапка, меню, мобильная кнопка ---------- */
  const hdr = $('#hdr'), mbar = $('.mbar');
  const onScroll = () => {
    hdr.classList.toggle('scrolled', scrollY > 20);
    mbar.classList.toggle('show', scrollY > innerHeight * .7);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  $('#burger').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  $$('#nav a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));

  /* ---------- Появление блоков ---------- */
  $$('.sec-head, .cfg, .style-card, .mat, .steps li, .trust-big, .trust-list > div, .faq-list details, .cont-card, .map').forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });

  // на телефоне дверцы открываются касанием
  document.addEventListener('click', e => {
    const d = e.target.closest && e.target.closest('.k .slot');
    if (d) d.classList.toggle('open');
  });

  /* ---------- Hero: кухня сама перекрашивается ---------- */
  const heroBox = $('#heroKitchen');
  heroBox.innerHTML = K.svg({ L: 300, uppers: true, fridge: true, handle: 'brass', vbW: 316 });
  const heroSvg = $('svg', heroBox);
  const cycle = [['milk', 'oak'], ['sage', 'marble'], ['graphite', 'concrete'], ['clay', 'marble'], ['navy', 'oak'], ['oak', 'black']];
  let hi = 0, heroTimer = 0, heroVisible = true, heroUser = false;
  const heroSet = n => {
    hi = n;
    K.paint(heroSvg, cycle[n][0], cycle[n][1], 'brass');
    $$('#heroSwatches button').forEach((b, i) => b.classList.toggle('on', i === n));
  };
  heroSet(0);
  const heroLoop = () => {
    clearInterval(heroTimer);
    heroTimer = setInterval(() => { if (heroVisible && !heroUser && !document.hidden) heroSet((hi + 1) % cycle.length); }, 3200);
  };
  setTimeout(heroLoop, 1800);
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }).observe(heroBox);
  $$('#heroSwatches button').forEach((b, i) => b.addEventListener('click', () => { heroUser = true; heroSet(i); }));
  $('#heroStage').addEventListener('mouseenter', () => { heroUser = true; });
  $('#heroStage').addEventListener('mouseleave', () => { heroUser = false; });

  /* ---------- Конструктор ---------- */
  const st = { layout: 'line', L: 320, color: 'milk', mat: 'film', top: 'oak', handle: 'gola', uppers: true, fridge: true };
  const box = $('#cfgKitchen');
  let svgEl = null, structKey = '';
  const LAYOUT = {
    line:   { name: 'прямая кухня', extra: 0 },
    corner: { name: 'угловая: + 1,8 м по второй стене', extra: 1.8 },
    u:      { name: 'П-образная: + 1,8 м по двум стенам', extra: 3.6 },
    island: { name: 'с островом 1,8 м', extra: 1.8 }
  };
  const PER_M = { ldsp: 28000, film: 36000, enamel: 48000, veneer: 62000 };
  const MAT_NAME = { ldsp: 'ЛДСП', film: 'МДФ в плёнке', enamel: 'МДФ эмаль', veneer: 'шпон' };
  const TOP_ADD = { oak: 0, concrete: 0, marble: 16000, black: 18000 };
  const HANDLE_ADD = { gola: 2500, brass: 3000, black: 1500 };
  const HANDLE_NAME = { gola: 'без ручек (профиль Gola)', brass: 'латунные ручки', black: 'чёрные ручки' };

  const planSvg = l => {
    const r = (x, y, w, h) => `<rect class="pl" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/>`;
    let s = r(4, 4, 68, 12);
    if (l === 'corner' || l === 'u') s += r(4, 4, 12, 48);
    if (l === 'u') s += r(60, 4, 12, 48);
    if (l === 'island') s += r(22, 34, 32, 14);
    return `<svg viewBox="0 0 76 56"><rect x="1" y="1" width="74" height="54" rx="6" fill="none" stroke="#d9cdbd" stroke-dasharray="3 3"/>${s}</svg>`;
  };

  const render = () => {
    const key = [st.L, st.uppers, st.fridge, st.handle].join('|');
    if (key !== structKey) {
      const first = !structKey;
      structKey = key;
      // масштаб комнаты постоянный: длиннее кухня — шире рисунок, а не крупнее
      box.innerHTML = K.svg({ L: st.L, uppers: st.uppers, fridge: st.fridge, handle: st.handle, vbW: 500, anim: first });
      svgEl = $('svg', box);
    }
    K.paint(svgEl, st.color, st.top, st.handle);

    $('#plan').innerHTML = planSvg(st.layout);
    const total = st.L / 100 + LAYOUT[st.layout].extra;
    $('#dimL').textContent = total.toFixed(1).replace('.', ',') + ' м';
    $('#dimText').textContent = LAYOUT[st.layout].name;
    $('#lenOut').textContent = st.L + ' см';
    $('#len').style.setProperty('--p', ((st.L - 180) / 300 * 100) + '%');
    $('#colOut').textContent = K.FACADES[st.color].name;
    $('#topOut').textContent = K.TOPS[st.top].name;

    // цена: погонный метр по материалу фасадов + столешница + ручки + пенал
    const m = total, perM = PER_M[st.mat];
    let p = m * perM * (st.uppers ? 1 : .78) + m * TOP_ADD[st.top] + m * HANDLE_ADD[st.handle];
    if (st.layout === 'island') p += 1.8 * perM * .25;          // остров сложнее обычного ряда
    if (st.fridge) p += 30000 * perM / 36000;
    const from = Math.round(p * .9 / 1000) * 1000, to = Math.round(p * 1.12 / 1000) * 1000;
    animate($('#priceFrom'), from); animate($('#priceTo'), to);

    const text = `Здравствуйте! Собрал кухню на сайте: ${LAYOUT[st.layout].name}, ${st.L} см у главной стены, ` +
      `фасады ${MAT_NAME[st.mat]} «${K.FACADES[st.color].name}», столешница «${K.TOPS[st.top].name}», ${HANDLE_NAME[st.handle]}` +
      `${st.uppers ? ', с верхними шкафами' : ', без верхних шкафов'}${st.fridge ? ', пенал под холодильник' : ''}. ` +
      `Ориентировочно ${fmt(from)}–${fmt(to)} ₽. Хочу бесплатный замер и точный расчёт.`;
    $('#sendCfg').href = `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
    $('#leadMsg').placeholder = `Кухня ${total.toFixed(1).replace('.', ',')} м, ${K.FACADES[st.color].name.toLowerCase()}, ${MAT_NAME[st.mat]}`;
  };

  const shown = new WeakMap();
  function animate(el, to) {
    const from = shown.get(el) || 0;
    shown.set(el, to);
    if (!from) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    cancelAnimationFrame(el._raf);
    const step = t => {
      const k = Math.min(1, (t - t0) / 450);
      el.textContent = fmt(Math.round((from + (to - from) * (1 - Math.pow(1 - k, 3))) / 100) * 100);
      if (k < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  const syncButtons = () => {
    $$('.cfg-panel [data-k]').forEach(g => $$('button', g).forEach(b => b.classList.toggle('on', b.dataset.v === st[g.dataset.k])));
    $('#len').value = st.L; $('#uppers').checked = st.uppers; $('#fridge').checked = st.fridge;
  };

  $$('.cfg-panel [data-k]').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    st[g.dataset.k] = b.dataset.v; syncButtons(); render();
  }));
  $('#len').addEventListener('input', e => { st.L = +e.target.value; render(); });
  $('#uppers').addEventListener('change', e => { st.uppers = e.target.checked; render(); });
  $('#fridge').addEventListener('change', e => { st.fridge = e.target.checked; render(); });
  render();
  // нижняя кнопка «Собрать кухню» не нужна, когда конструктор уже на экране
  new IntersectionObserver(([e]) => mbar.classList.toggle('hide', e.isIntersecting), { rootMargin: '-20% 0px -20% 0px' }).observe($('#build'));

  /* ---------- Готовые стили ---------- */
  const PRESETS = {
    scandi: { color: 'milk', top: 'oak', handle: 'black', uppers: true, fridge: false, mat: 'film' },
    loft:   { color: 'graphite', top: 'concrete', handle: 'black', uppers: false, fridge: true, mat: 'ldsp' },
    neo:    { color: 'sage', top: 'marble', handle: 'brass', uppers: true, fridge: true, mat: 'enamel' },
    warm:   { color: 'clay', top: 'marble', handle: 'gola', uppers: false, fridge: false, mat: 'enamel' }
  };
  $$('[data-mini]').forEach(el => {
    const p = PRESETS[el.dataset.mini];
    el.innerHTML = K.svg({ L: 260, uppers: p.uppers, fridge: p.fridge, handle: p.handle, vbW: 276, anim: false });
    K.paint($('svg', el), p.color, p.top, p.handle);
  });
  $$('[data-preset]').forEach(c => c.addEventListener('click', () => {
    Object.assign(st, PRESETS[c.dataset.preset]);
    syncButtons(); render();
    $('#build').scrollIntoView({ behavior: 'smooth' });
  }));

  /* ---------- Заявка → WhatsApp ---------- */
  $('#leadForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    const msg = f.get('msg') || $('#leadMsg').placeholder;
    const text = `Заявка на замер с сайта\nИмя: ${f.get('name')}\nТелефон: ${f.get('phone')}\n${msg}`;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  });

  $('#year').textContent = new Date().getFullYear();
})();
