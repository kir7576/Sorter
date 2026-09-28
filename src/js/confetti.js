// Конфетти: window.confetti(root?) — два залпа снизу из углов, бумажки кружатся и опадают.
// Рисуется на canvas поверх root (по умолчанию body), сам убирается после окончания.
// Цвета — из токенов, красный фирменный не берём: на красном фоне его не видно.

(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COUNT = 160;          // бумажек на оба залпа
  const GRAVITY = 1400;       // px/с²
  const DRAG = 0.9;           // сопротивление воздуха, 1/с
  const FALL = 240;           // предельная скорость падения, px/с — бумажки «планируют»
  const LIFE = 5200;          // мс, после этого canvas убирается
  const TOKENS = ['--color-3-solid-900', '--color-2-solid-700', '--grid-accent', '--text-light-primary', '--background-bg', '--color-1-solid-400'];

  function colors() {
    const cs = getComputedStyle(document.documentElement);
    return TOKENS.map((t) => cs.getPropertyValue(t).trim()).filter(Boolean);
  }

  function confetti(root = document.body) {
    if (reduce) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    canvas.setAttribute('aria-hidden', 'true');
    root.append(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const palette = colors();
    const k = Math.min(1, Math.max(0.6, W / 1440));    // на телефоне бумажки мельче
    const side = Math.min(1, (W / H) * 0.9);            // на узком экране залп круче, чтобы не улетал вбок
    const rnd = (a, b) => a + Math.random() * (b - a);

    const pieces = Array.from({ length: COUNT }, (_, i) => {
      const left = i % 2 === 0;
      const angle = (left ? rnd(-80, -55) : rnd(-125, -100)) * (Math.PI / 180);
      // скорость — от высоты экрана: залп долетает до 45–90% высоты на любом размере (+30% на сопротивление)
      const rise = rnd(0.45, 0.9) * H;
      const speed = (Math.sqrt(2 * GRAVITY * rise) * 1.3) / Math.max(0.5, -Math.sin(angle));
      const w = rnd(8, 14) * k + 4;
      return {
        x: left ? rnd(-10, W * 0.06) : rnd(W * 0.94, W + 10),
        y: H + rnd(0, 30),
        vx: Math.cos(angle) * speed * side,
        vy: Math.sin(angle) * speed,
        w,
        h: Math.random() < 0.35 ? w * 2.4 : w * 0.6,       // ленточки и квадратики
        rot: rnd(0, Math.PI * 2),
        vr: rnd(-10, 10),
        flip: rnd(0, Math.PI * 2),                          // «кувыркание» бумажки
        vf: rnd(6, 14),
        sway: rnd(0, Math.PI * 2),
        color: palette[i % palette.length],
        delay: left ? rnd(0, 120) : rnd(80, 200),           // правый залп чуть позже
      };
    });

    const t0 = performance.now();
    let last = t0;
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const age = now - t0;
      ctx.clearRect(0, 0, W, H);
      const fade = Math.min(1, Math.max(0, (LIFE - age) / 900));
      for (const p of pieces) {
        if (age < p.delay) continue;
        p.vx -= p.vx * DRAG * dt;
        p.vy += (GRAVITY - p.vy * DRAG) * dt;
        p.vy = Math.min(p.vy, FALL);
        p.sway += dt * 3;
        p.x += (p.vx + Math.sin(p.sway) * 40) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.flip += p.vf * dt;
        if (p.y > H + 40) continue;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.flip));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (age < LIFE) requestAnimationFrame(frame);
      else canvas.remove();
    };
    requestAnimationFrame(frame);
  }

  // если страница ещё под лоадером (прямая ссылка #win) — ждём, пока он исчезнет
  window.confetti = (root) => {
    const wait = () => (document.querySelector('[data-loader]') ? setTimeout(wait, 100) : confetti(root));
    wait();
  };
})();
