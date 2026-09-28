// Пресеты скорости игры и панель настроек (открывается кликом по логотипу в шапке игры).
// window.gamePresets.get()  → текущие параметры { enter, wait, drop, fly, rampEnd, rampCurve }
// window.gamePresets.factor(p) → во сколько раз быстрее на доле игры p (0…1)
// Выбор запоминается в браузере (localStorage), если он доступен.

(() => {
  // Длительности в мс при множителе 1:
  //   enter — карточка слетает сверху в центр и растёт ×0.75 → ×1
  //   wait  — стоит в центре (медленно опускается), пока её можно сортировать
  //   drop  — не успели: пролетает вниз за экран
  //   fly   — отсортирована: улетает влево или вправо
  const SPEED = {
    slow:   { label: 'Медленно',  enter: 700, wait: 2000, drop: 750, fly: 500 },
    normal: { label: 'Нормально', enter: 550, wait: 1400, drop: 600, fly: 420 },
    fast:   { label: 'Быстро',    enter: 450, wait: 950,  drop: 500, fly: 360 },
    hard:   { label: 'Хардкор',   enter: 350, wait: 600,  drop: 420, fly: 300 },
  };

  // Ускорение к концу: множитель скорости = 1 + (rampEnd − 1) · p^rampCurve, p — доля прошедшего времени.
  // Чем больше rampCurve, тем дольше темп ровный и тем резче он растёт в конце.
  const RAMP = {
    none:   { label: 'Без ускорения',  rampEnd: 1,   rampCurve: 1 },
    smooth: { label: 'Плавное',        rampEnd: 1.6, rampCurve: 1.3 },
    strong: { label: 'Сильное',        rampEnd: 2.2, rampCurve: 1.5 },
    final:  { label: 'Рывок в финале', rampEnd: 2.5, rampCurve: 4 },
  };

  const GROUPS = { speed: SPEED, ramp: RAMP };
  const DEFAULTS = { speed: 'normal', ramp: 'smooth' };
  const KEY = 'sorter:game-presets';

  let choice = { ...DEFAULTS };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    for (const g in GROUPS) if (saved[g] in GROUPS[g]) choice[g] = saved[g];
  } catch { /* хранилище недоступно — берём значения по умолчанию */ }

  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(choice)); } catch { /* не критично */ }
  };

  const get = () => ({ ...SPEED[choice.speed], ...RAMP[choice.ramp] });
  const factor = (p) => {
    const { rampEnd, rampCurve } = get();
    return 1 + (rampEnd - 1) * Math.pow(Math.min(1, Math.max(0, p)), rampCurve);
  };

  window.gamePresets = { get, factor };

  // --- Панель -----------------------------------------------------------------
  const panel = document.querySelector('[data-settings]');
  const opener = document.querySelector('[data-settings-open]');
  if (!panel || !opener) return;
  const summary = panel.querySelector('[data-settings-summary]');
  const sec = (ms) => (ms / 1000).toFixed(1).replace('.', ',');

  const renderSummary = () => {
    const s = get();
    const start = s.enter + s.wait;
    summary.textContent = s.rampEnd > 1
      ? `Время на ответ: ${sec(start)} с в начале → ${sec(start / factor(1))} с в конце.`
      : `Время на ответ: ${sec(start)} с всю игру.`;
  };

  panel.querySelectorAll('[data-preset-group]').forEach((box) => {
    const group = box.dataset.presetGroup;
    for (const [id, preset] of Object.entries(GROUPS[group])) {
      const label = document.createElement('label');
      label.className = 'settings__option';
      label.innerHTML = `<input type="radio" name="preset-${group}" value="${id}"><span>${preset.label}</span>`;
      const input = label.querySelector('input');
      input.checked = choice[group] === id;
      input.addEventListener('change', () => {
        choice[group] = id;
        save();
        renderSummary();
      });
      box.append(label);
    }
  });
  renderSummary();

  const setOpen = (open) => {
    panel.hidden = !open;
    opener.setAttribute('aria-expanded', String(open));
    document.dispatchEvent(new CustomEvent('game:pause', { detail: { paused: open } }));
    if (open) panel.querySelector('input:checked')?.focus();
    else opener.focus();
  };

  opener.addEventListener('click', () => setOpen(panel.hidden));
  panel.querySelector('[data-settings-close]').addEventListener('click', () => setOpen(false));
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
  });
  panel.querySelector('[data-settings-restart]').addEventListener('click', () => {
    setOpen(false);
    window.gameScreen?.restart();
  });
})();
