/* ЭкоЛайф — живая природа: луг, цветы, бабочки, пчёлы, светлячки */
(function () {
  const mobile = matchMedia('(max-width: 760px)').matches;
  const DPR = Math.min(devicePixelRatio || 1, mobile ? 1 : 1.5);
  const TAU = Math.PI * 2;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];

  /* ---------- Курсор (в координатах окна) ---------- */
  const mouse = { x: -9999, y: -9999 };
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  addEventListener('touchend', () => setTimeout(() => { mouse.x = mouse.y = -9999; }, 500), { passive: true });

  /* ---------- Ветер: лёгкое колыхание + порывы, бегущие волной ---------- */
  const gustAt = (x, t) => Math.pow(Math.max(0, Math.sin(x * .0032 - t * 1.35)), 8) * (.22 + .2 * Math.sin(t * .29));
  const breeze = t => .35 + .25 * Math.sin(t * .21) + .15 * Math.sin(t * .67);

  /* ---------- Удар воздуха при приземлении телефона ---------- */
  const blast = { x: -9999, y: -9999, t0: -99 };
  let clock = 0;
  addEventListener('phone:land', e => { blast.x = e.detail.x; blast.y = e.detail.y; blast.t0 = clock; });
  const blastAt = (px, py) => {
    const k = clock - blast.t0;
    if (k > 2.5) return 0;
    const dx = px - blast.x, d = Math.hypot(dx, py - blast.y);
    const front = k * 900; // волна расходится от телефона
    const w = Math.exp(-Math.pow((d - front) / 160, 2)) * Math.exp(-k * 1.2);
    return (dx >= 0 ? 1 : -1) * w;
  };

  /* ---------- Общий цикл: рисуем только видимые сцены ---------- */
  const scenes = [];
  let last = 0;
  const loop = now => {
    const t = now / 1000, dt = Math.min(.05, t - (last || t));
    last = t; clock = t;
    for (const s of scenes) if (s.visible) s.draw(t, dt);
    requestAnimationFrame(loop);
  };
  const io = new IntersectionObserver(es => es.forEach(e => { e.target._scene.visible = e.isIntersecting; }), { rootMargin: '80px' });
  const addScene = (cv, s) => {
    cv._scene = s;
    scenes.push(s);
    io.observe(cv);
    s.build();
    s.draw(0, 0);
  };
  // положение холстов читаем только при прокрутке и ресайзе, а не каждый кадр
  const updateRects = () => scenes.forEach(s => { s.rect = s.cv.getBoundingClientRect(); });
  addEventListener('scroll', updateRects, { passive: true });
  const fit = (cv, ctx) => {
    const r = cv.getBoundingClientRect();
    cv.width = Math.round(r.width * DPR);
    cv.height = Math.round(r.height * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    return [r.width, r.height];
  };

  /* =====================================================================
     ЛУГ
     ===================================================================== */
  function Meadow(cv, cfg) {
    const ctx = cv.getContext('2d');
    const S = { cv, W: 0, H: 0, layers: [], flowers: [], rect: cv.getBoundingClientRect(), onSeeds: null, shade: null };

    const hillY = (L, x) => {
      const u = x / S.W;
      return S.H - L.base - L.amp * Math.sin(u * Math.PI * L.f + L.p) - L.amp * .35 * Math.sin(u * Math.PI * L.f * 2.7 + L.p * 1.7);
    };

    S.build = () => {
      [S.W, S.H] = fit(cv, ctx);
      S.rect = cv.getBoundingClientRect();
      S.flowers = [];
      const k = mobile ? .55 : 1;
      // размеры слоя можно задать функцией от высоты холста — тогда луг масштабируется вместе с ним
      const R = v => (typeof v === 'function' ? v(S.H) : v);
      S.layers = cfg.layers.map(L0 => {
        const L = Object.assign({}, L0, {
          base: R(L0.base), amp: R(L0.amp), depth: R(L0.depth),
          h: L0.h.map(R), fh: (L0.fh || [0, 0]).map(R)
        });
        const groups = L.pal.map(() => []);
        const n = Math.round(S.W * L.density * k);
        for (let i = 0; i < n; i++) {
          const x = rnd(-10, S.W + 10);
          groups[(Math.random() * L.pal.length) | 0].push({
            x, y: hillY(L, x) + rnd(0, L.depth),
            h: rnd(L.h[0], L.h[1]) * (mobile && !L.fixed ? .75 : 1),
            w: rnd(L.w[0], L.w[1]), lean: rnd(-.22, .22), ph: rnd(0, TAU), m: 0
          });
        }
        const fl = [];
        const nf = Math.round(S.W * (L.flowers || 0) * (mobile ? .7 : 1));
        for (let i = 0; i < nf; i++) {
          const x = rnd(0, S.W);
          const f = {
            x, y: hillY(L, x) + rnd(0, L.depth * .5),
            h: rnd(L.fh[0], L.fh[1]) * (mobile ? .8 : 1),
            w: 0, lean: rnd(-.12, .12), ph: rnd(0, TAU), m: 0,
            kind: pick(L.kinds), size: rnd(.8, 1.25) * L.fs, full: true, regrow: 0, hx: x, hy: 0
          };
          fl.push(f);
          S.flowers.push(f);
        }
        fl.sort((a, b) => a.y - b.y);
        // тело холма и его градиент считаем один раз
        const body = new Path2D();
        body.moveTo(0, S.H);
        for (let x = 0; x <= S.W + 12; x += 12) body.lineTo(x, hillY(L, x) + L.depth * .4);
        body.lineTo(S.W, S.H);
        body.closePath();
        const grad = ctx.createLinearGradient(0, S.H - L.base - L.amp * 1.4, 0, S.H);
        grad.addColorStop(0, L.ground[0]); grad.addColorStop(1, L.ground[1]);
        return Object.assign({}, L, { groups, fl, body, grad });
      });
      if (cfg.shade) {
        S.shade = ctx.createLinearGradient(0, S.H * .55, 0, S.H);
        S.shade.addColorStop(0, 'rgba(0,0,0,0)'); S.shade.addColorStop(1, cfg.shade);
      }
    };

    const bend = (b, t, L, mx, my) => {
      const w = .15 * Math.sin(t * 1.2 + b.x * .009 + b.ph) + .07 * Math.sin(t * 2.4 + b.x * .021 + b.ph * 2)
        + gustAt(b.x, t) + .06 * breeze(t);
      let target = 0;
      const dx = b.x - mx;
      if (dx < L.reach && dx > -L.reach) {
        const dy = (b.y - b.h * .6) - my, d2 = dx * dx + dy * dy, R = L.reach;
        if (d2 < R * R) { const q = 1 - Math.sqrt(d2) / R; target = (dx >= 0 ? 1 : -1) * q * q * 1.25; }
      }
      if (S.blastOn) target += blastAt(b.x + S.rect.left, b.y + S.rect.top) * 1.6;
      b.m += (target - b.m) * .08;
      return (w + b.lean + b.m) * b.h * L.flex;
    };

    const blade = (b, bd) => {
      const tx = b.x + bd, ty = b.y - b.h + Math.abs(bd) * .28;
      const cx = b.x + bd * .32, cy = b.y - b.h * .55;
      ctx.moveTo(b.x - b.w, b.y);
      ctx.quadraticCurveTo(cx - b.w * .55, cy, tx, ty);
      ctx.quadraticCurveTo(cx + b.w * .55, cy, b.x + b.w, b.y);
    };

    const flower = (f, bd, t, mx, my) => {
      const tx = f.x + bd, ty = f.y - f.h + Math.abs(bd) * .28;
      f.hx = tx; f.hy = ty;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.quadraticCurveTo(f.x + bd * .32, f.y - f.h * .55, tx, ty);
      ctx.stroke();

      const s = f.size;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(bd / f.h * .9 + Math.sin(t * 1.7 + f.ph) * .06);
      switch (f.kind) {
        case 'daisy':
          ctx.fillStyle = '#fbfbf4';
          ctx.beginPath();
          for (let i = 0; i < 10; i++) { const a = i * TAU / 10; ctx.moveTo(0, 0); ctx.ellipse(Math.sin(a) * s * 4.2, -Math.cos(a) * s * 4.2, s * 1.5, s * 3.4, a, 0, TAU); }
          ctx.fill();
          ctx.fillStyle = '#f5c22a'; ctx.beginPath(); ctx.arc(0, 0, s * 2.4, 0, TAU); ctx.fill();
          break;
        case 'dand':
          ctx.fillStyle = '#f7cf1d';
          ctx.beginPath();
          for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.moveTo(0, 0); ctx.ellipse(Math.sin(a) * s * 3, -Math.cos(a) * s * 3, s * .8, s * 2.2, a, 0, TAU); }
          ctx.fill();
          ctx.fillStyle = '#ffdf3d'; ctx.beginPath(); ctx.arc(0, 0, s * 2.4, 0, TAU); ctx.fill();
          break;
        case 'corn':
          ctx.fillStyle = '#4f7fe0';
          ctx.beginPath();
          for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.moveTo(0, 0); ctx.ellipse(Math.sin(a) * s * 3, -Math.cos(a) * s * 3, s * 1.2, s * 2.6, a, 0, TAU); }
          ctx.fill();
          ctx.fillStyle = '#2b4aa8'; ctx.beginPath(); ctx.arc(0, 0, s * 1.5, 0, TAU); ctx.fill();
          break;
        case 'clover':
          ctx.fillStyle = '#e58fb9';
          ctx.beginPath();
          for (let i = 0; i < 10; i++) { const a = i * 2.4, r = Math.sqrt(i) * s * 1.1; ctx.moveTo(Math.cos(a) * r + s * 1.4, Math.sin(a) * r - s); ctx.arc(Math.cos(a) * r, Math.sin(a) * r - s, s * 1.4, 0, TAU); }
          ctx.fill();
          break;
        case 'poppy':
          ctx.fillStyle = '#ef5a3c';
          ctx.beginPath();
          for (let i = 0; i < 4; i++) { const a = i * TAU / 4; ctx.moveTo(0, 0); ctx.ellipse(Math.sin(a) * s * 2.4, -Math.cos(a) * s * 2.4, s * 3, s * 2.7, a, 0, TAU); }
          ctx.fill();
          ctx.fillStyle = '#2a1a12'; ctx.beginPath(); ctx.arc(0, 0, s * 1.4, 0, TAU); ctx.fill();
          break;
        case 'puff':
          if (f.full) {
            ctx.fillStyle = 'rgba(255,255,255,.45)';
            ctx.beginPath(); ctx.arc(0, 0, s * 6, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.8)';
            ctx.beginPath(); ctx.arc(0, 0, s * 3.4, 0, TAU); ctx.fill();
            const dx = tx - mx, dy = ty - my;
            if (dx * dx + dy * dy < 2600) {
              f.full = false; f.regrow = t + rnd(8, 14);
              S.onSeeds && S.onSeeds(tx + S.rect.left, ty + S.rect.top, 10);
            }
          } else {
            ctx.fillStyle = '#7d9a3a'; ctx.beginPath(); ctx.arc(0, 0, s * 1.6, 0, TAU); ctx.fill();
            if (t > f.regrow) f.full = true;
          }
          break;
      }
      ctx.restore();
    };

    S.draw = t => {
      const mx = mouse.x - S.rect.left, my = mouse.y - S.rect.top;
      S.blastOn = clock - blast.t0 < 2.5;
      ctx.clearRect(0, 0, S.W, S.H);
      for (const L of S.layers) {
        ctx.fillStyle = L.grad;
        ctx.fill(L.body);
        for (let ci = 0; ci < L.groups.length; ci++) {
          const grp = L.groups[ci];
          ctx.fillStyle = L.pal[ci];
          ctx.beginPath();
          for (let i = 0; i < grp.length; i++) blade(grp[i], bend(grp[i], t, L, mx, my));
          ctx.fill();
        }
        ctx.strokeStyle = cfg.stem || '#3d7419';
        ctx.lineWidth = 1.3;
        for (const f of L.fl) flower(f, bend(f, t, L, mx, my), t, mx, my);
      }
      if (S.shade) {
        ctx.fillStyle = S.shade;
        ctx.fillRect(0, S.H * .55, S.W, S.H * .45);
      }
    };
    return S;
  }

  /* =====================================================================
     ЖИВНОСТЬ: бабочки, пчёлы, семена одуванчика, светлячки
     ===================================================================== */
  const BFLY = [
    ['#f7e05a', '#3a3410'], ['#ffffff', '#2a3320'], ['#ff9a3c', '#3a1d0a'],
    ['#8fc6ff', '#1c2c55'], ['#dbfb6e', '#1d2a12'], ['#f4a7d0', '#4a1f38']
  ];

  // спрайт свечения светлячка рисуем один раз
  const glow = document.createElement('canvas');
  glow.width = glow.height = 32;
  {
    const g = glow.getContext('2d');
    const rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, 'rgba(240,255,170,1)');
    rg.addColorStop(.25, 'rgba(219,251,110,.7)');
    rg.addColorStop(1, 'rgba(219,251,110,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, 32, 32);
  }

  function Life(cv, cfg) {
    const ctx = cv.getContext('2d');
    const S = { cv, W: 0, H: 0, bugs: [], seeds: [], flies: [], rect: cv.getBoundingClientRect() };
    const meadow = cfg.meadow;

    S.build = () => {
      [S.W, S.H] = fit(cv, ctx);
      S.rect = cv.getBoundingClientRect();
      const k = mobile ? .55 : 1;
      S.bugs = [];
      for (let i = 0; i < Math.round((cfg.butterflies || 0) * k); i++) S.bugs.push(newBug('bfly'));
      for (let i = 0; i < Math.round((cfg.bees || 0) * k); i++) S.bugs.push(newBug('bee'));
      S.flies = Array.from({ length: Math.round((cfg.fireflies || 0) * k) }, newFly);
    };

    const newBug = kind => {
      const c = pick(BFLY);
      return {
        kind, x: rnd(0, S.W), y: rnd(S.H * .2, S.H * .8), a: rnd(0, TAU),
        sp: kind === 'bee' ? rnd(1.6, 2.4) : rnd(.7, 1.3),
        size: kind === 'bee' ? rnd(5, 6.5) : rnd(12, 19) * (mobile ? .8 : 1),
        c1: c[0], c2: c[1], ph: rnd(0, TAU), state: 'fly', timer: 0, target: null, boost: 1
      };
    };
    function newFly() {
      return { x: rnd(0, S.W), y: rnd(S.H * .15, S.H * .9), vx: rnd(-.3, .3), vy: rnd(-.3, .3), ph: rnd(0, TAU), sp: rnd(.6, 1.6) };
    }

    S.addSeeds = (px, py, n) => {
      const x = px - S.rect.left, y = py - S.rect.top;
      for (let i = 0; i < n; i++) {
        S.seeds.push({ x: x + rnd(-6, 6), y: y + rnd(-6, 6), vx: rnd(-.6, 1.4), vy: rnd(-1.4, -.3), rot: 0, life: rnd(6, 10), age: 0 });
      }
    };
    if (meadow) meadow.onSeeds = S.addSeeds;

    // бабочки разлетаются, когда приземляется телефон
    addEventListener('phone:land', e => {
      const x = e.detail.x - S.rect.left, y = e.detail.y - S.rect.top;
      S.bugs.forEach(b => {
        if (Math.hypot(b.x - x, b.y - y) < 600) {
          b.state = 'fly'; b.target = null; b.boost = 3.2;
          b.a = Math.atan2(b.y - y, b.x - x);
        }
      });
    });

    const flowerPos = f => [f.hx + meadow.rect.left - S.rect.left, f.hy + meadow.rect.top - S.rect.top];

    const updateBug = (b, t, dt, mx, my) => {
      const dxm = b.x - mx, dym = b.y - my, dm = Math.hypot(dxm, dym);
      if (b.state === 'land') {
        [b.x, b.y] = flowerPos(b.target);
        b.timer -= dt;
        if (b.timer <= 0 || dm < 70) { b.state = 'fly'; b.target = null; b.a = -Math.PI / 2 + rnd(-.8, .8); b.cool = t + rnd(3, 7); }
        return;
      }
      if (dm < 110) {
        b.a = Math.atan2(dym, dxm) + rnd(-.3, .3);
        b.target = null;
        b.boost = 2.2;
      } else if (b.target) {
        const [fx, fy] = flowerPos(b.target);
        let d = Math.atan2(fy - b.y, fx - b.x) - b.a;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        b.a += d * .08;
        if (Math.hypot(fx - b.x, fy - b.y) < 6) {
          b.state = 'land';
          b.timer = b.kind === 'bee' ? rnd(1, 2.2) : rnd(2.5, 6);
        }
      } else {
        b.a += rnd(-.22, .22);
        const cx = S.W / 2, cy = S.H * (cfg.home || .62);
        if (b.x < 40 || b.x > S.W - 40 || b.y < S.H * .1 || b.y > S.H - 30) {
          let d = Math.atan2(cy - b.y, cx - b.x) - b.a;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          b.a += d * .12;
        }
        if (meadow && meadow.flowers.length && t > (b.cool || 0) && Math.random() < (b.kind === 'bee' ? .02 : .006)) {
          const f = pick(meadow.flowers);
          const [fx, fy] = flowerPos(f);
          if (fy > 0 && fy < S.H && fx > 0 && fx < S.W && f.kind !== 'puff') b.target = f;
        }
      }
      b.boost = Math.max(1, b.boost * .97);
      const sp = b.sp * b.boost * 60 * dt;
      b.x += Math.cos(b.a) * sp;
      b.y += Math.sin(b.a) * sp + Math.sin(t * (b.kind === 'bee' ? 9 : 3.2) + b.ph) * (b.kind === 'bee' ? .5 : .9);
    };

    const drawButterfly = (b, t) => {
      const s = b.size;
      const landed = b.state === 'land';
      const flap = landed ? .35 + .65 * Math.abs(Math.sin(t * 1.4 + b.ph)) : .12 + .88 * Math.abs(Math.sin(t * 13 + b.ph));
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(landed ? 0 : Math.cos(b.a) * .35);
      for (let side = -1; side <= 1; side += 2) {
        ctx.save();
        ctx.scale(side * flap, 1);
        ctx.fillStyle = b.c1;
        ctx.beginPath();
        ctx.moveTo(0, -s * .1);
        ctx.bezierCurveTo(s * .4, -s * 1.3, s * 1.5, -s * 1.25, s * 1.2, -s * .25);
        ctx.bezierCurveTo(s * 1.05, s * .05, s * .4, s * .1, 0, s * .05);
        ctx.moveTo(0, s * .05);
        ctx.bezierCurveTo(s * .9, s * .1, s * 1, s * .85, s * .45, s * .9);
        ctx.bezierCurveTo(s * .2, s * .9, s * .05, s * .5, 0, s * .2);
        ctx.fill();
        ctx.fillStyle = b.c2;
        ctx.globalAlpha = .55;
        ctx.beginPath();
        ctx.arc(s * .95, -s * .62, s * .17, 0, TAU);
        ctx.moveTo(s * .67, s * .55);
        ctx.arc(s * .55, s * .55, s * .12, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      ctx.fillStyle = b.c2;
      ctx.beginPath(); ctx.ellipse(0, s * .1, s * .12, s * .55, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = b.c2; ctx.lineWidth = .8;
      ctx.beginPath(); ctx.moveTo(0, -s * .4); ctx.quadraticCurveTo(-s * .15, -s * .8, -s * .35, -s * .95); ctx.moveTo(0, -s * .4); ctx.quadraticCurveTo(s * .15, -s * .8, s * .35, -s * .95); ctx.stroke();
      ctx.restore();
    };

    const drawBee = (b, t) => {
      const s = b.size, flip = Math.cos(b.a) < 0 ? -1 : 1;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(flip, 1);
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      const w = .6 + .4 * Math.abs(Math.sin(t * 60 + b.ph));
      ctx.beginPath();
      ctx.ellipse(-s * .1, -s * 1.1, s * .55, s * .9 * w, -.4, 0, TAU);
      ctx.ellipse(s * .35, -s * 1, s * .45, s * .75 * w, .3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#f2b51b';
      ctx.beginPath(); ctx.ellipse(0, 0, s * 1.3, s * .85, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a1f0c';
      ctx.fillRect(-s * .35, -s * .82, s * .32, s * 1.64);
      ctx.fillRect(s * .3, -s * .7, s * .3, s * 1.4);
      ctx.beginPath(); ctx.arc(s * 1.15, 0, s * .45, 0, TAU); ctx.fill();
      ctx.restore();
    };

    S.draw = (t, dt) => {
      ctx.clearRect(0, 0, S.W, S.H);
      const mx = mouse.x - S.rect.left, my = mouse.y - S.rect.top;
      const wind = breeze(t) * .5;

      // семена одуванчика (только когда их сдули)
      if (S.seeds.length) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = .7;
        for (let i = S.seeds.length - 1; i >= 0; i--) {
          const s = S.seeds[i];
          s.age += dt;
          s.vx += (wind * 2 + gustAt(s.x, t) * 5 - s.vx) * .015;
          s.vy += (-.35 - s.vy) * .02;
          s.x += s.vx; s.y += s.vy;
          const a = Math.min(1, s.age * 2, (s.life - s.age) / 2);
          if (a <= 0) { S.seeds.splice(i, 1); continue; }
          ctx.globalAlpha = a;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y + 8);
          for (let k = -3; k <= 3; k++) { ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + k * 1.6, s.y - 4 + Math.abs(k) * .6); }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // светлячки
      for (const f of S.flies) {
        f.vx += rnd(-.04, .04); f.vy += rnd(-.04, .04);
        f.vx *= .98; f.vy *= .98;
        f.x += f.vx * f.sp; f.y += f.vy * f.sp;
        if (f.x < 0 || f.x > S.W) f.vx *= -1;
        if (f.y < S.H * .1 || f.y > S.H) f.vy *= -1;
        const g = Math.max(0, Math.sin(t * 1.3 * f.sp + f.ph)) ** 2;
        if (g < .02) continue;
        ctx.globalAlpha = g;
        ctx.drawImage(glow, f.x - 14, f.y - 14, 28, 28);
      }
      ctx.globalAlpha = 1;

      // бабочки и пчёлы
      for (const b of S.bugs) {
        updateBug(b, t, dt, mx, my);
        b.kind === 'bee' ? drawBee(b, t) : drawButterfly(b, t);
      }
    };
    return S;
  }

  /* =====================================================================
     Сцены сайта
     ===================================================================== */
  const heroMeadowCv = document.getElementById('meadow');
  const heroLifeCv = document.getElementById('heroLife');
  let heroMeadow = null;

  if (heroMeadowCv) {
    heroMeadow = Meadow(heroMeadowCv, {
      shade: 'rgba(22,40,10,.55)',
      layers: [
        { // дальний холм — в дымке
          base: 190, amp: 46, f: 1.6, p: 2.2, depth: 30, density: .3, h: [14, 30], w: [1.4, 2.4], flex: .5, reach: 90,
          pal: ['#8ea27a', '#97ab82', '#86996f'], ground: ['#8ea27a', '#6f8659'],
          flowers: .008, fh: [18, 30], fs: .55, kinds: ['daisy', 'dand']
        },
        { // средний план
          base: 120, amp: 52, f: 1.25, p: .3, depth: 50, density: .5, h: [30, 80], w: [2, 3.4], flex: .7, reach: 130,
          pal: ['#5f9c2a', '#6eaa30', '#7fb83a', '#4f8a22', '#8cc645'], ground: ['#5f9c2a', '#3f7519'],
          flowers: .03, fh: [50, 95], fs: .8, kinds: ['daisy', 'daisy', 'dand', 'corn', 'clover', 'puff', 'poppy']
        },
        { // ближний — высокая сочная трава
          base: 40, amp: 34, f: 1.9, p: 1.1, depth: 60, density: .55, h: [70, 190], w: [2.8, 5.4], flex: .85, reach: 170,
          pal: ['#3f7a1b', '#4f8a22', '#5f9c2a', '#73b236', '#8cc645', '#a6d455'], ground: ['#3f7a1b', '#21420c'],
          flowers: .014, fh: [110, 200], fs: 1.05, kinds: ['daisy', 'dand', 'puff', 'corn', 'poppy']
        }
      ]
    });
    addScene(heroMeadowCv, heroMeadow);
  }
  if (heroLifeCv) addScene(heroLifeCv, Life(heroLifeCv, { meadow: heroMeadow, butterflies: 9, bees: 3, home: .7 }));

  /* Подвал: слово «ЭкоЛайф» растёт из луга.
     Задний луг — за буквами, передний — перед ними. Тёмная земля переднего луга
     закрывает низ букв и хвост «ф». Все размеры — доли высоты холста,
     поэтому травинки никогда не упираются в его верх и не обрезаются. */
  const footBackCv = document.getElementById('footBack');
  const footMeadowCv = document.getElementById('footMeadow');
  const footLifeCv = document.getElementById('footLife');
  let footMeadow = null;
  if (footBackCv) {
    addScene(footBackCv, Meadow(footBackCv, {
      stem: '#2a4a17',
      layers: [{
        base: H => H * .32, amp: H => H * .05, f: 1.3, p: .4, depth: H => H * .08, density: .28, fixed: true,
        h: [H => H * .16, H => H * .48], w: [2, 3.6], flex: .6, reach: 120,
        pal: ['#2a4a17', '#314f1c', '#3a5d20', '#263f15'], ground: ['#2a4a17', '#1d2a12'],
        flowers: .008, fh: [H => H * .3, H => H * .5], fs: .75, kinds: ['daisy', 'dand', 'corn']
      }]
    }));
  }
  if (footMeadowCv) {
    footMeadow = Meadow(footMeadowCv, {
      stem: '#2f5d14',
      layers: [
        {
          base: H => H * .3, amp: H => H * .05, f: 1.6, p: 1.2, depth: H => H * .06, density: .4, fixed: true,
          h: [H => H * .14, H => H * .42], w: [2.2, 4], flex: .75, reach: 140,
          pal: ['#2f5d14', '#3d7419', '#4f8a22', '#5f9c2a'], ground: ['#1d2a12', '#1d2a12'],
          flowers: .012, fh: [H => H * .3, H => H * .5], fs: .85, kinds: ['daisy', 'dand', 'poppy', 'corn', 'clover']
        },
        {
          base: H => H * .2, amp: H => H * .04, f: 2.3, p: 2.6, depth: H => H * .05, density: .45, fixed: true,
          h: [H => H * .1, H => H * .32], w: [2.6, 4.8], flex: .85, reach: 160,
          pal: ['#264c10', '#2f5d14', '#3f7a1b', '#4f8a22'], ground: ['#1d2a12', '#1d2a12'],
          flowers: .006, fh: [H => H * .28, H => H * .42], fs: 1, kinds: ['daisy', 'poppy']
        }
      ]
    });
    addScene(footMeadowCv, footMeadow);
  }
  if (footLifeCv) addScene(footLifeCv, Life(footLifeCv, { meadow: footMeadow, butterflies: 3, fireflies: 30, home: .6 }));

  // На телефоне при прокрутке прячется адресная строка — меняется только высота окна.
  // Это не настоящий ресайз: луг и бабочек не пересоздаём, только обновляем координаты.
  // Пересобираем только ту сцену, чей холст действительно изменил размер (поворот экрана, ресайз окна).
  let rt;
  addEventListener('resize', () => {
    updateRects();
    clearTimeout(rt);
    rt = setTimeout(() => scenes.forEach(s => {
      if (Math.abs(s.cv.clientWidth - s.W) < 1 && Math.abs(s.cv.clientHeight - s.H) < 1) return;
      s.build();
      s.draw(performance.now() / 1000, 0);
    }), 180);
  });

  requestAnimationFrame(loop);
})();
