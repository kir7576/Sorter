// Конфетти: window.confetti(root?) — взрыв из центра во все стороны, как в примере:
// за полсекунды мелкие бумажки разлетаются по всему экрану, резко тормозят,
// потом медленно планируют вниз, кружатся и тают. Форма — квадратик, кружок, треугольник, полоска.
// Рисуется на canvas поверх root (по умолчанию body) и сам убирается.
// Цвета — из токенов; фирменный красный не берём: на красном фоне его не видно.

(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DRAG = 3.2;            // сильное сопротивление: быстрый разлёт и резкое торможение, 1/с
  const GRAVITY = 260;         // лёгкая «гравитация» — бумажки планируют, px/с²
  const FALL = 110;            // предельная скорость падения, px/с
  const LIFE = 4800;           // мс всего
  const FADE = 1600;           // последние мс — плавное исчезновение
  const TOKENS = ['--grid-accent', '--color-3-solid-900', '--text-light-primary', '--color-2-solid-500'];
  const SHAPES = ['square', 'circle', 'triangle', 'strip'];

  function colors() {
    const cs = getComputedStyle(document.documentElement);
    return TOKENS.map((t) => cs.getPropertyValue(t).trim()).filter(Boolean);
  }

  function draw(ctx, p) {
    const s = p.size;
    ctx.beginPath();
    switch (p.shape) {
      case 'circle': ctx.arc(0, 0, s / 2, 0, Math.PI * 2); break;
      case 'triangle': ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.lineTo(-s / 2, s / 2); ctx.closePath(); break;
      case 'strip': ctx.rect(-s * 0.15, -s * 0.7, s * 0.3, s * 1.4); break;
      default: ctx.rect(-s / 2, -s / 2, s, s);
    }
    ctx.fill();
  }

  function burst(root) {
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
    const rnd = (a, b) => a + Math.random() * (b - a);
    const reach = Math.hypot(W, H) / 2;                        // до углов экрана
    const count = Math.round(Math.min(160, Math.max(70, (W * H) / 11000)));
    const unit = Math.min(1.4, Math.max(0.9, W / 1100));       // размер бумажек

    const pieces = Array.from({ length: count }, (_, i) => {
      const a = rnd(0, Math.PI * 2);
      // скорость так, чтобы с учётом сопротивления долететь на 15–120% расстояния до углов
      const dist = reach * (0.15 + Math.pow(Math.random(), 0.6) * 1.05);
      const v = dist * DRAG;
      return {
        x: W / 2 + rnd(-20, 20),
        y: H / 2 + rnd(-20, 20),
        vx: Math.cos(a) * v,             // скорость разлёта — гаснет из-за сопротивления
        vy: Math.sin(a) * v * 0.85,
        fall: 0,                          // скорость планирования вниз — растёт до FALL
        size: rnd(6, 11) * unit,
        shape: SHAPES[i % SHAPES.length],
        color: palette[i % palette.length],
        rot: rnd(0, Math.PI * 2),
        vr: rnd(-6, 6),
        flip: rnd(0, Math.PI * 2),
        vf: rnd(4, 10),
        sway: rnd(0, Math.PI * 2),
        swayAmp: rnd(10, 30),
        life: rnd(0.75, 1) * LIFE,
      };
    });

    const t0 = performance.now();
    let last = t0;
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const age = now - t0;
      ctx.clearRect(0, 0, W, H);
      const k = Math.exp(-DRAG * dt);
      for (const p of pieces) {
        if (age > p.life) continue;
        p.vx *= k;
        p.vy *= k;
        p.fall = Math.min(FALL, p.fall + GRAVITY * dt);
        p.sway += dt * 2.5;
        p.x += (p.vx + Math.sin(p.sway) * p.swayAmp) * dt;
        p.y += (p.vy + p.fall) * dt;
        p.rot += p.vr * dt;
        p.flip += p.vf * dt;
        ctx.save();
        ctx.globalAlpha = Math.min(1, (p.life - age) / FADE);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.flip));                         // бумажка переворачивается в воздухе
        draw(ctx, p);
        ctx.restore();
      }
      if (age < LIFE) requestAnimationFrame(frame);
      else canvas.remove();
    };
    requestAnimationFrame(frame);
  }

  // если страница ещё под лоадером (прямая ссылка #win) — ждём, пока он исчезнет
  window.confetti = (root = document.body) => {
    if (reduce) return;
    const wait = () => (document.querySelector('[data-loader]') ? setTimeout(wait, 100) : burst(root));
    wait();
  };
})();
