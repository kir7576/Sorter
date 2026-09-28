// Подсветка по краям (ДС: Backlight 41:819, State: Default | Error | Success).
// window.edgeGlow.state('ok' | 'err' | 'base', root?) — переключает состояние:
// слой ok/err плавно проявляется и полностью заменяет базовое свечение, держится HOLD мс
// и возвращается к Default. Новый ответ сразу перебивает предыдущий, без скачков яркости.

(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IN = reduce ? 0 : 160;     // переход в Error / Success
  const HOLD = 900;                // сколько держится состояние
  const OUT = reduce ? 0 : 500;    // возврат в Default
  const running = new WeakMap();

  const layer = (root, name) => root.querySelector(`[data-edge-glow="${name}"]`);

  // анимирует opacity от текущего видимого значения, чтобы смена состояний не дёргалась
  function fade(el, frames, total) {
    const from = parseFloat(getComputedStyle(el).opacity);
    const keyframes = [{ opacity: from, offset: 0 }, ...frames];
    return el.animate(keyframes, { duration: Math.max(1, total), fill: 'forwards' });
  }

  function state(kind, root = document) {
    const layers = ['base', 'ok', 'err'].map((n) => layer(root, n));
    if (!layers[0]) return;
    // зафиксировать текущие значения до отмены старых анимаций
    const now = layers.map((el) => el && parseFloat(getComputedStyle(el).opacity));
    (running.get(root) || []).forEach((a) => a.cancel());
    layers.forEach((el, i) => { if (el) el.style.opacity = now[i]; });

    const total = kind === 'base' ? OUT : IN + HOLD + OUT;
    const k1 = kind === 'base' ? 1 : IN / total;
    const k2 = kind === 'base' ? 1 : (IN + HOLD) / total;
    const anims = [];
    ['base', 'ok', 'err'].forEach((name, i) => {
      const el = layers[i];
      if (!el) return;
      const rest = name === 'base' ? 1 : 0;          // значение в Default
      const peak = name === 'base' ? 0 : name === kind ? 1 : 0;
      const frames = kind === 'base'
        ? [{ opacity: rest, offset: 1 }]
        : [{ opacity: peak, offset: k1 }, { opacity: peak, offset: k2 }, { opacity: rest, offset: 1 }];
      anims.push(fade(el, frames, total));
    });
    running.set(root, anims);
  }

  // совместимость со старым вызовом
  window.edgeGlow = { state, flash: state };
})();
