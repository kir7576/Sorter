// Вписывает «сцену» экрана (свёрстанную в пикселях макета от центра) между шапкой и кнопкой.
// Параметры берутся из CSS-переменных элемента [data-stage] — у desktop и mobile они свои:
//   --stage-w       ширина содержимого сцены
//   --stage-up      от центра экрана до верхнего края содержимого
//   --stage-down    от центра экрана до нижнего края содержимого
//   --reserve-top   сколько сверху занято (шапка + отступ)
//   --reserve-bottom сколько снизу занято (кнопка + отступы)
//   --stage-max     максимальный масштаб (по умолчанию 1)
// Результат пишется в --stage-k.

(() => {
  const stages = [...document.querySelectorAll('[data-stage]')];
  if (!stages.length) return;

  const num = (cs, name, fallback) => {
    const v = parseFloat(cs.getPropertyValue(name));
    return Number.isFinite(v) ? v : fallback;
  };

  const fit = () => {
    for (const stage of stages) {
      const box = stage.parentElement.getBoundingClientRect();
      const cs = getComputedStyle(stage);
      const half = box.height / 2;
      const k = Math.min(
        num(cs, '--stage-max', 1),
        (box.width - 24) / num(cs, '--stage-w', box.width),
        (half - num(cs, '--reserve-top', 0)) / num(cs, '--stage-up', half),
        (half - num(cs, '--reserve-bottom', 0)) / num(cs, '--stage-down', half),
      );
      stage.style.setProperty('--stage-k', Math.max(0.4, k).toFixed(4));
    }
  };

  fit();
  window.addEventListener('resize', fit);
  document.fonts?.ready.then(fit);
})();
