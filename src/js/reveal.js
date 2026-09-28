// Переход к следующему экрану — «параллакс + фейд», как переход к футеру на studioloop.com.br.
// Следующий экран (position: fixed) лежит под страницей. У страницы margin-bottom = его высота,
// поэтому при скролле страница уезжает вверх и открывает его. Прогресс p = доля пройденной высоты:
//   внутренний блок: translateY((1 - p) * 120px), opacity: min(1, 1.25 * p)

(() => {
  const page = document.querySelector('[data-reveal-page]');
  const next = document.querySelector('[data-reveal]');
  const inner = next?.querySelector('[data-reveal-inner]');
  if (!page || !next || !inner) return;

  const SHIFT = 120;
  let height = 0;
  let start = 0;
  let lastTransform = '';
  let lastOpacity = '';

  const clamp = (v) => Math.min(1, Math.max(0, v));

  const layout = () => {
    height = next.offsetHeight;
    page.style.marginBottom = `${height}px`;
    start = page.offsetTop + page.offsetHeight - window.innerHeight;
  };

  const update = () => {
    const p = height > 0 ? clamp((window.scrollY - start) / height) : 0;
    const transform = `translate3d(0, ${((1 - p) * SHIFT).toFixed(2)}px, 0)`;
    const opacity = Math.min(1, 1.25 * p).toFixed(3);
    if (transform !== lastTransform) inner.style.transform = lastTransform = transform;
    if (opacity !== lastOpacity) inner.style.opacity = lastOpacity = opacity;
    // пока экран не открыт, клики проходят только по странице
    next.style.visibility = p > 0 ? 'visible' : 'hidden';
  };

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  };

  layout();
  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { layout(); update(); });
  new ResizeObserver(() => { layout(); update(); }).observe(page);

  // кнопка «Играть» — своя плавная прокрутка до полного раскрытия:
  // в 1.5 раза дольше стандартной (≈550 мс) и с мягким разгоном и торможением.
  // Колесо, касание или клавиши во время перехода его останавливают.
  const DURATION = 850;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let anim = 0;

  const stop = () => { cancelAnimationFrame(anim); anim = 0; };
  ['wheel', 'touchstart', 'keydown'].forEach((type) => window.addEventListener(type, stop, { passive: true }));

  function scrollToReveal() {
    stop();
    const from = window.scrollY;
    const to = start + height;
    if (reduce || Math.abs(to - from) < 2) { window.scrollTo({ top: to, behavior: 'instant' }); return; }
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / DURATION);
      window.scrollTo({ top: from + (to - from) * easeInOut(t), behavior: 'instant' });
      anim = t < 1 ? requestAnimationFrame(step) : 0;
    };
    anim = requestAnimationFrame(step);
  }

  document.querySelectorAll('[data-reveal-link]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      scrollToReveal();
    });
  });
})();
