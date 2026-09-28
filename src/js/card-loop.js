// Бесконечная лента карточек справа налево, шагами — как hero на studioloop.com.br, но по горизонтали.
// Каждый шаг: все карточки сдвигаются на одну позицию (1.05 с, cubic-bezier(0.1, 0.9, 0.2, 1)), затем пауза 0.32 с.
// Поворот зависит от позиции: 15° на шаг, центральная карточка — 0°, как веер в макете.
// Карточки сразу стоят на местах, как в макете, и начинают движение после первой паузы.
// Разметка: <div data-card-loop data-cards="w-3,s-4,..." data-center="3">

(() => {
  const STEP_DURATION = 1050;
  const STEP_PAUSE = 320;
  const ROTATE_PER_SLOT = 15;      // градусов
  const OVERLAP = 80 / 384;        // в макете карточки 384px перекрываются на 80px
  const CARDS_PATH = 'assets/cards/';

  // cubic-bezier как в CSS
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t;
    const sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      let t = x;
      for (let i = 0; i < 8; i++) {
        const err = sx(t) - x;
        if (Math.abs(err) < 1e-5) break;
        const d = dx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= err / d;
      }
      return sy(Math.min(1, Math.max(0, t)));
    };
  }
  const glide = bezier(0.1, 0.9, 0.2, 1);

  function init(root) {
    const names = root.dataset.cards.split(',').map((s) => s.trim());
    const center = Number(root.dataset.center ?? 0);
    // кольцо из двух повторов набора: дубликаты не видны одновременно
    const ring = [...names, ...names];
    const N = ring.length;
    const minSlot = -Math.floor(N / 2);

    const cards = ring.map((name, i) => {
      const img = document.createElement('img');
      img.className = 'card';
      img.src = `${CARDS_PATH}${name}.webp`;
      img.alt = '';
      img.decoding = 'async';
      root.appendChild(img);
      // слот 0 — центр экрана; name с индексом center попадает в центр
      let slot = i - center;
      if (slot < minSlot) slot += N;
      if (slot >= minSlot + N) slot -= N;
      return { el: img, slot };
    });

    let step = 0;
    const measure = () => { step = root.querySelector('.card').offsetWidth * (1 - OVERLAP); };
    measure();
    new ResizeObserver(measure).observe(root);

    // t — дробный сдвиг: 0 = карточки на своих слотах, 1 = каждая сдвинулась на слот влево
    const render = (t) => {
      for (const c of cards) {
        const pos = c.slot - t;
        c.el.style.transform = `translate3d(${pos * step}px, 0, 0) rotate(${pos * ROTATE_PER_SLOT}deg)`;
        c.el.style.zIndex = String(100 + c.slot);
      }
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { render(0); return; }

    let visible = true;
    let phase = 'pause';
    let phaseStart = performance.now();

    const tick = (now) => {
      if (!visible) { requestAnimationFrame(tick); return; }
      const elapsed = now - phaseStart;

      if (phase === 'move') {
        const p = Math.min(1, elapsed / STEP_DURATION);
        render(glide(p));
        if (p === 1) {
          // шаг завершён: все слоты сдвигаются, ушедшая влево карточка переносится в конец справа
          for (const c of cards) {
            c.slot -= 1;
            if (c.slot < minSlot) c.slot += N;
          }
          render(0);
          phase = 'pause';
          phaseStart = now;
        }
      } else if (elapsed >= STEP_PAUSE) {
        phase = 'move';
        phaseStart = now;
      }
      requestAnimationFrame(tick);
    };

    // пауза, когда hero не виден или вкладка скрыта
    let hiddenAt = 0;
    const setVisible = (v) => {
      if (v === visible) return;
      visible = v;
      if (!v) hiddenAt = performance.now();
      else phaseStart += performance.now() - hiddenAt;
    };
    new IntersectionObserver(([e]) => setVisible(e.isIntersecting && !document.hidden)).observe(root);
    document.addEventListener('visibilitychange', () => setVisible(!document.hidden));

    render(0);
    requestAnimationFrame(tick);
  }

  document.querySelectorAll('[data-card-loop]').forEach(init);
})();
