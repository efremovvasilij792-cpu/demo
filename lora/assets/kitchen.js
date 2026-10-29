/* Лора мебель — рисуем кухню в SVG (вид спереди, 1 единица = 1 см).
   Цвета фасадов и столешницы меняются через CSS-переменные — плавно, без перерисовки. */
(function () {
  const FACADES = {
    milk:     { name: 'Молочный', fa: '#efe7da', fg: 0 },
    sage:     { name: 'Шалфей',   fa: '#9ba792', fg: 0 },
    graphite: { name: 'Графит',   fa: '#3a3c3f', fg: 0 },
    clay:     { name: 'Глина',    fa: '#b9694b', fg: 0 },
    navy:     { name: 'Индиго',   fa: '#2f3d55', fg: 0 },
    oak:      { name: 'Дуб',      fa: '#b98e62', fg: 1 }
  };
  const TOPS = {
    oak:      { name: 'Дуб',          tp: '#c49a6c', tg: 1, tv: 0, ts: 0 },
    concrete: { name: 'Бетон',        tp: '#a39e96', tg: 0, tv: 0, ts: 1 },
    marble:   { name: 'Кварц-мрамор', tp: '#efede8', tg: 0, tv: 1, ts: 0 },
    black:    { name: 'Чёрный кварц', tp: '#262626', tg: 0, tv: 0, ts: 1 }
  };
  const HANDLES = { gola: '#2b2b2b', brass: '#c9a14a', black: '#1e1e1e' };

  // высоты (см): пол 250, цоколь 10, нижние фасады 72, столешница 5, фартук 60, верхние 72
  const FLOOR = 250, PL = 240, BT = 168, CT = 163, UB = 103, UT = 31;

  let uid = 0;

  // раскладка модулей под длину стены
  function modules(L, fridge) {
    const m = [];
    let rem = L;
    if (fridge) { m.push({ t: 'fridge', w: 60 }); rem -= 60; }
    const core = [{ t: 'drawers', w: 40 }, { t: 'sink', w: 80 }, { t: 'dw', w: 60 }, { t: 'hob', w: 60 }];
    if (rem < 240) core.splice(2, 1);          // без посудомойки
    if (rem < 180) core.shift();               // без ящиков у края
    let sum = core.reduce((a, b) => a + b.w, 0);
    if (sum > rem) { core[core.length - 1].w = Math.max(45, core[core.length - 1].w - (sum - rem)); sum = rem; }
    m.push(...core);
    let extra = rem - sum;
    const tail = [];
    while (extra >= 60) { tail.push({ t: tail.length % 2 ? 'door' : 'drawers', w: 60 }); extra -= 60; }
    if (extra >= 30) tail.push({ t: 'drawers', w: extra });
    else if (extra > 0) { const last = tail.length ? tail[tail.length - 1] : m[m.length - 1]; last.w += extra; }
    m.push(...tail);
    return m;
  }

  // фасад: цвет + текстура дуба + блик
  const front = (x, y, w, h, id) =>
    `<rect class="f" x="${x}" y="${y}" width="${w}" height="${h}" rx=".8"/>` +
    `<rect class="fg" fill="url(#gr${id})" x="${x}" y="${y}" width="${w}" height="${h}" rx=".8"/>` +
    `<rect fill="url(#sh${id})" x="${x}" y="${y}" width="${w}" height="${h}" rx=".8"/>` +
    `<rect class="seam" x="${x}" y="${y}" width="${w}" height="${h}" rx=".8"/>`;

  function hBar(x, y, w, hd) { // горизонтальная ручка по центру фасада
    if (hd === 'gola') return '';
    const bw = hd === 'black' ? Math.min(w * .7, 40) : Math.min(w * .42, 18);
    return `<rect class="hd" x="${x + (w - bw) / 2}" y="${y}" width="${bw}" height="1.3" rx=".65"/>`;
  }
  function vBar(x, y, h, hd) {
    if (hd === 'gola') return '';
    const bh = hd === 'black' ? Math.min(h * .55, 34) : Math.min(h * .3, 14);
    return `<rect class="hd" x="${x}" y="${y}" width="1.3" height="${bh}" rx=".65"/>`;
  }

  // что лежит внутри шкафчика
  function inside(x, y, w, h, seed, upper) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e9e1d4"/><rect x="${x}" y="${y}" width="${w}" height="5" fill="#000" opacity=".08"/>`;
    const shelves = upper ? [y + h * .48] : [y + h * .52];
    shelves.forEach(sy => { s += `<rect x="${x}" y="${sy}" width="${w}" height="1" fill="#cfc4b4"/>`; });
    const rows = upper ? [y + h * .48, y + h] : [y + h * .52, y + h];
    const pal = ['#d97b55', '#e3c26a', '#7f9a83', '#f5f1ea', '#5d6d8a', '#c9a36f'];
    rows.forEach((by, ri) => {
      let cx = x + 3;
      let k = seed * 7 + ri * 3;
      while (cx < x + w - 8) {
        const kind = k % 3, c = pal[k % pal.length];
        if (kind === 0) { // банка
          const jh = 9 + (k % 4) * 2; s += `<rect x="${cx}" y="${by - jh}" width="6" height="${jh}" rx="1.4" fill="${c}" opacity=".9"/><rect x="${cx - .3}" y="${by - jh - 1.6}" width="6.6" height="2" rx=".6" fill="#6b5a4a"/>`; cx += 9;
        } else if (kind === 1) { // стопка тарелок
          for (let p = 0; p < 4; p++) s += `<rect x="${cx}" y="${by - 1.6 - p * 1.7}" width="13" height="1.3" rx=".6" fill="#fbf8f2" stroke="#d5ccbf" stroke-width=".3"/>`; cx += 16;
        } else { // чашка
          s += `<path d="M${cx} ${by - 7}h7v5a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2z" fill="${c}"/><path d="M${cx + 7} ${by - 5.5}a1.6 1.6 0 0 1 0 3.2" fill="none" stroke="${c}" stroke-width=".8"/>`; cx += 11;
        }
        k++;
      }
    });
    return s;
  }

  // Наведение ловит неподвижный прозрачный прямоугольник на месте фасада, а не сам фасад:
  // иначе открывающаяся дверца уходит из-под курсора, закрывается и снова открывается — дрожит.
  const slot = (inner, x, y, w, h) =>
    `<g class="slot">${inner}<rect class="hit" x="${x}" y="${y}" width="${w}" height="${h}"/></g>`;
  const drawer = (x, y, w, h, id, hd, barY) =>
    slot(`<g class="drw">${front(x + .2, y, w - .4, h, id)}${hBar(x, barY, w, hd)}</g>`, x + .2, y, w - .4, h);

  // распашная дверца поверх содержимого
  function doors(x, y, w, h, id, hd, seed, upper) {
    let s = inside(x + .3, y + .3, w - .6, h - .6, seed, upper);
    const pair = w >= 60;
    const dw = pair ? (w - .6) / 2 : w - .4;
    const barY = upper ? y + h - (hd === 'black' ? 36 : 17) : y + 4;
    // левая (петли слева)
    s += slot(`<g class="door">${front(x + .2, y + .2, dw, h - .4, id)}${vBar(x + dw - 3.2, barY, h, hd)}</g>`, x + .2, y + .2, dw, h - .4);
    if (pair) s += slot(`<g class="door r">${front(x + dw + .4, y + .2, dw, h - .4, id)}${vBar(x + dw + 2.6, barY, h, hd)}</g>`, x + dw + .4, y + .2, dw, h - .4);
    return s;
  }

  function base(mod, x, id, hd, i) {
    const w = mod.w, y = BT + .4, h = PL - BT - .8;
    let s = '';
    switch (mod.t) {
      case 'drawers': {
        const hs = [17.6, 24, h - 17.6 - 24 - 1.2];
        let yy = y;
        hs.forEach(hh => { s += drawer(x, yy, w, hh, id, hd, yy + 3); yy += hh + .6; });
        break;
      }
      case 'sink': s += doors(x, y, w, h, id, hd, i, false); break;
      case 'door': s += doors(x, y, w, h, id, hd, i + 2, false); break;
      case 'dw': s += drawer(x, y, w, h, id, hd, y + 3); break;
      case 'hob': {
        s += drawer(x, y, w, 11.4, id, hd, y + 3);
        s += `<rect x="${x + .6}" y="${y + 12}" width="${w - 1.2}" height="45" rx="1" fill="#1d1d1f"/>` +
             `<rect x="${x + 4}" y="${y + 19}" width="${w - 8}" height="33" rx="2" fill="#2c2d31"/>` +
             `<rect x="${x + 4}" y="${y + 19}" width="${w - 8}" height="10" rx="2" fill="#fff" opacity=".05"/>` +
             `<rect x="${x + 6}" y="${y + 14.2}" width="${w - 12}" height="1.6" rx=".8" fill="#9b9b9b"/>`;
        s += drawer(x, y + 57.6, w, h - 57.6, id, hd, y + 60.6);
        break;
      }
    }
    return s;
  }

  function upperFor(mod, x, id, hd, i) {
    const y = UT + .4, h = UB - UT - .8;
    if (mod.t === 'hob') {
      return `<g>${front(x + .2, y, mod.w - .4, h - 14, id)}${hBar(x, y + h - 19, mod.w, hd)}</g>` +
        `<rect x="${x + 1}" y="${y + h - 13.4}" width="${mod.w - 2}" height="9" rx="1" fill="#b8b8b6"/>` +
        `<rect x="${x + 1}" y="${y + h - 5.8}" width="${mod.w - 2}" height="1.4" fill="#8d8d8b"/>`;
    }
    return doors(x, y, mod.w, h, id, hd, i + 5, true);
  }

  function fridge(x, id, hd) {
    const w = 60;
    let s = drawer(x, UT + .4, w, 28, id, hd, UT + 22);
    s += `<g>${front(x + .2, UT + 29, w - .4, 108, id)}</g>`;
    s += `<g>${front(x + .2, UT + 137.6, w - .4, PL - UT - 138.2, id)}${vBar(x + w - 6, UT + 141, 60, hd)}</g>`;
    if (hd !== 'gola') s += `<rect class="hd" x="${x + w - 6}" y="${UT + 96}" width="1.3" height="${hd === 'black' ? 34 : 14}" rx=".65"/>`;
    s += `<rect class="f" x="${x + .2}" y="${PL}" width="${w - .4}" height="${FLOOR - PL}"/><rect x="${x + .2}" y="${PL}" width="${w - .4}" height="${FLOOR - PL}" fill="#000" opacity=".35"/>`;
    return s;
  }

  // открытая полка, если нет верхних шкафов
  function shelf(x0, x1, seed) {
    const y = 92;
    let s = `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="3.2" rx=".6" fill="#a87d52"/><rect x="${x0}" y="${y}" width="${x1 - x0}" height="1" fill="#fff" opacity=".18"/>`;
    let cx = x0 + 8, k = seed;
    while (cx < x1 - 22) {
      const t = k % 4;
      if (t === 0) { s += `<path d="M${cx} ${y}l1.5-10h11l1.5 10z" fill="#c2633d"/><path d="M${cx + 7} ${y - 10}c-6-6-8-14-3-17 2 5 3 9 3 17zm0 0c5-7 9-11 13-10-2 5-6 8-13 10zm0 0c-4-3-10-4-13-1 4 2 8 2 13 1z" fill="#6f8a5d"/>`; cx += 26; }
      else if (t === 1) { for (let p = 0; p < 3; p++) s += `<rect x="${cx + p * 7}" y="${y - 12 - (p % 2) * 3}" width="5.5" height="${12 + (p % 2) * 3}" rx="1.2" fill="${['#e3c26a', '#f5f1ea', '#d97b55'][p]}" stroke="#6b5a4a" stroke-width=".4"/>`; cx += 28; }
      else if (t === 2) { s += `<path d="M${cx} ${y - 8}h18a9 8 0 0 1-18 0z" fill="#f5f1ea" stroke="#cfc4b4" stroke-width=".4" transform="translate(0 0)"/><path d="M${cx} ${y - 8}h18" stroke="#cfc4b4" stroke-width=".4"/>`; cx += 26; }
      else { s += `<rect x="${cx}" y="${y - 20}" width="3" height="20" fill="#5b4636"/><rect x="${cx + 4}" y="${y - 17}" width="3" height="17" fill="#7f9a83"/><rect x="${cx + 8}" y="${y - 22}" width="3.4" height="22" fill="#c9a36f"/>`; cx += 22; }
      k++;
    }
    return s;
  }

  function svg(o) {
    const id = ++uid;
    const L = o.L, hd = o.handle || 'gola';
    const mods = modules(L, o.fridge);
    const vbW = o.vbW || L + 16;
    const x0 = (vbW - L) / 2;
    let s = '';
    let x = x0;
    const items = [];
    mods.forEach((m, i) => { items.push({ m, x, i }); x += m.w; });

    // фартук и стена
    s += `<rect x="${x0}" y="${UB}" width="${L}" height="${CT - UB}" fill="url(#tile${id})"/>`;
    s += `<rect x="${x0}" y="${UB}" width="${L}" height="14" fill="url(#ush${id})"/>`;
    // тень на полу
    s += `<ellipse cx="${x0 + L / 2}" cy="${FLOOR + 1}" rx="${L / 2 + 6}" ry="3.2" fill="#3a2a1c" opacity=".22"/>`;

    // столешница
    const hasF = o.fridge;
    const ctX = x0 + (hasF ? 60 : 0) - .6, ctW = L - (hasF ? 60 : 0) + 1.2;
    const counter = `<g class="mod" style="--i:${mods.length}"><rect class="tp" x="${ctX}" y="${CT}" width="${ctW}" height="${BT - CT}" rx=".6"/>` +
      `<rect class="tg" fill="url(#tgr${id})" x="${ctX}" y="${CT}" width="${ctW}" height="${BT - CT}"/>` +
      `<rect class="tv" fill="url(#tvn${id})" x="${ctX}" y="${CT}" width="${ctW}" height="${BT - CT}"/>` +
      `<rect class="ts" fill="url(#tsp${id})" x="${ctX}" y="${CT}" width="${ctW}" height="${BT - CT}" style="opacity:var(--ts);transition:opacity .7s"/>` +
      `<rect x="${ctX}" y="${CT}" width="${ctW}" height=".7" fill="#fff" opacity=".35"/>` +
      `<rect x="${ctX}" y="${BT - .6}" width="${ctW}" height=".6" fill="#000" opacity=".18"/></g>`;

    let low = '', up = '', extra = '';
    items.forEach(({ m, x, i }) => {
      if (m.t === 'fridge') { low += `<g class="mod" style="--i:${i}">${fridge(x, id, hd)}</g>`; return; }
      low += `<g class="mod" style="--i:${i}">${base(m, x, id, hd, i)}` +
        `<rect class="f" x="${x}" y="${PL}" width="${m.w}" height="${FLOOR - PL}"/><rect x="${x}" y="${PL}" width="${m.w}" height="${FLOOR - PL}" fill="#000" opacity=".38"/></g>`;
      if (hd === 'gola') low += `<rect x="${x}" y="${BT + .2}" width="${m.w}" height="1.6" fill="#000" opacity=".28"/>`;
      if (o.uppers) up += `<g class="mod" style="--i:${i + 1}">${upperFor(m, x, id, hd, i)}</g>`;
      if (m.t === 'sink') {
        const cx = x + m.w / 2;
        extra += `<g class="mod" style="--i:${mods.length + 1}"><path d="M${cx - 2} ${CT}v-17a7 7 0 0 1 14 0v3" fill="none" stroke="#a9a9a7" stroke-width="1.8" stroke-linecap="round"/>` +
          `<rect x="${cx - 4.5}" y="${CT - 2}" width="5" height="2" rx=".6" fill="#8f8f8d"/><rect x="${cx + 14}" y="${CT - 4}" width="3" height="4" rx="1" fill="#a9a9a7"/></g>`;
      }
      if (m.t === 'hob') {
        extra += `<rect x="${x + 3}" y="${CT - 1.2}" width="${m.w - 6}" height="1.2" fill="#161616"/>` +
          `<path d="M${x + 8} ${CT - 1.2}h18v-6a3 3 0 0 0-3-3h-12a3 3 0 0 0-3 3z" fill="#3a3c3f"/><rect x="${x + 6}" y="${CT - 11}" width="22" height="1.4" rx=".7" fill="#3a3c3f"/>`;
        if (!o.uppers) extra += `<path d="M${x + m.w / 2 - 6} 20v48h12V20z" fill="#b8b8b6"/><path d="M${x + 4} 92l${m.w / 2 - 10}-24h12l${m.w / 2 - 10} 24z" fill="#c9c9c7"/><rect x="${x + 4}" y="92" width="${m.w - 8}" height="2" fill="#8d8d8b"/>`;
      }
    });
    if (!o.uppers) {
      const sx0 = x0 + (hasF ? 66 : 4);
      const hob = items.find(it => it.m.t === 'hob');
      if (hob) {
        if (hob.x - sx0 > 40) extra += shelf(sx0, hob.x - 4, 1);
        if (x0 + L - (hob.x + hob.m.w) > 40) extra += shelf(hob.x + hob.m.w + 4, x0 + L - 4, 2);
      } else extra += shelf(sx0, x0 + L - 4, 1);
    }

    const defs = `<defs>
      <linearGradient id="sh${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".07"/></linearGradient>
      <linearGradient id="ush${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1d12" stop-opacity="${o.uppers ? .22 : 0}"/><stop offset="1" stop-color="#2a1d12" stop-opacity="0"/></linearGradient>
      <pattern id="gr${id}" width="9" height="80" patternUnits="userSpaceOnUse"><rect width="9" height="80" fill="#000" opacity="0"/><path d="M1 0c1 20-1 40 0 80M4.5 0c-1 25 1 50 0 80M7.5 0c.8 18-.6 46 0 80" stroke="#6a4424" stroke-width=".35" fill="none" opacity=".45"/><path d="M3 0c.6 30-.4 50 0 80" stroke="#e8c79c" stroke-width=".5" fill="none" opacity=".35"/></pattern>
      <pattern id="tgr${id}" width="70" height="5" patternUnits="userSpaceOnUse"><path d="M0 1.2c20 .4 40-.4 70 0M0 3.4c25-.3 45 .3 70 0" stroke="#7a5230" stroke-width=".3" fill="none" opacity=".5"/></pattern>
      <pattern id="tvn${id}" width="60" height="5" patternUnits="userSpaceOnUse"><path d="M0 4.5L14 0M30 5L48 0M40 5L52 2" stroke="#b9b3a8" stroke-width=".45" fill="none"/></pattern>
      <pattern id="tsp${id}" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx=".8" cy="1" r=".28" fill="#fff" opacity=".22"/><circle cx="2.2" cy="2.3" r=".22" fill="#000" opacity=".2"/></pattern>
      <pattern id="tile${id}" width="15" height="7.5" patternUnits="userSpaceOnUse"><rect width="15" height="7.5" fill="#f4efe7"/><path d="M0 7.25H15M7.5 0v3.75M0 3.5H15M0 3.75v3.5" stroke="#d8cfc2" stroke-width=".45"/></pattern>
    </defs>`;

    const vbY = 14;
    return `<svg class="k${o.anim === false ? ' noanim' : ''}" viewBox="0 ${vbY} ${vbW} ${FLOOR + 6 - vbY}" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Кухня ${L} см">${defs}${low}${counter}${up}${extra}</svg>`;
  }

  function paint(el, color, top, handle) {
    const f = FACADES[color], t = TOPS[top];
    const st = el.style;
    if (f) { st.setProperty('--fa', f.fa); st.setProperty('--fg', f.fg); }
    if (t) { st.setProperty('--tp', t.tp); st.setProperty('--tg', t.tg); st.setProperty('--tv', t.tv); st.setProperty('--ts', t.ts); }
    if (handle) st.setProperty('--hd', HANDLES[handle]);
  }

  window.Kitchen = { svg, paint, modules, FACADES, TOPS };
})();
