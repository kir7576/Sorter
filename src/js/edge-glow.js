// Сигнал свечения по краям: window.edgeGlow.flash('ok' | 'err', root?)
// Ошибка — два коротких импульса, успех — один мягкий; базовое свечение на это время приглушается.
// Понадобится на экране игры (ответ на карточку). Логика перенесена из демо «Свечение по краям».

(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const running = new WeakMap();

  function flash(kind, root = document) {
    const layer = (name) => root.querySelector(`[data-edge-glow="${name}"]`);
    const el = layer(kind);
    const other = layer(kind === 'err' ? 'ok' : 'err');
    const base = layer('base');
    if (!el) return;

    (running.get(root) || []).forEach((a) => a.cancel()); // быстрые ответы не копятся
    if (other) other.style.opacity = 0;

    const frames = kind === 'err'
      ? [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 0.35, offset: 0.28 }, { opacity: 1, offset: 0.42 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }]
      : [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }];
    const duration = reduce ? 700 : kind === 'err' ? 1100 : 1000;

    const anims = [el.animate(frames, { duration, easing: 'ease-out' })];
    if (base) {
      anims.push(base.animate(
        [{ opacity: 1 }, { opacity: 0.25, offset: 0.2 }, { opacity: 0.25, offset: 0.6 }, { opacity: 1 }],
        { duration, easing: 'ease-out' },
      ));
    }
    running.set(root, anims);
  }

  window.edgeGlow = { flash };
})();
