// Механика игры «волки влево, овцы вправо».
// Карточки идут без пауз в случайном порядке. Следующая ждёт сверху (×0.75, +15°).
// Затем одно непрерывное падение через весь экран: быстро влетает, растёт до ×1 (−15°) и замедляется
// в центре, потом разгоняется и уходит вниз. Сортировать можно всё это время.
// Не успели — ушла за экран, минус жизнь. Ошиблись — минус жизнь.
// Подсветка по краям переключается в состояние error / success (js/edge-glow.js).
// Управление: кнопки ← →, стрелки клавиатуры, свайп.
// Темп берётся из window.gamePresets (js/game-presets.js) и растёт к концу игры.
// Конец игры: событие 'game:end' на .game с detail { result: 'win' | 'lose', lives }.
//
// Геометрия — из макетов (desktop 1920×1080 / mobile 360×632):
//   центр:     карточка 480 / 240, центр на 50px выше середины / на 62px ниже середины
//   следующая: ×0.75, центр в 20px / 46px от верха, на mobile смещена вправо на 46.5px

(() => {
  const game = document.querySelector('[data-game]');
  const field = game?.querySelector('[data-field]');
  if (!game || !field) return;

  const minEl = game.querySelector('[data-timer-min]');
  const secEl = game.querySelector('[data-timer-sec]');
  const hearts = [...game.querySelectorAll('.hud-health .heart')];
  const buttons = game.querySelectorAll('[data-control]');
  const mobile = window.matchMedia('(max-width: 767.98px)');

  const CARDS = ['s-1', 's-2', 's-3', 's-4', 'w-1', 'w-2', 'w-3', 'w-4'];
  const CARDS_PATH = 'assets/cards/';
  const DURATION = 60000;
  const LIVES = 3;

  const presets = () => window.gamePresets?.get() ?? { enter: 550, fall: 2600, fly: 420 };
  const speed = (p) => window.gamePresets?.factor(p) ?? 1;

  // картинки заранее, чтобы первая карточка не мигала пустой
  CARDS.forEach((name) => { new Image().src = `${CARDS_PATH}${name}.webp`; });

  const ease = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    in: (t) => t * t * t,
  };

  let L = null;            // раскладка
  let state = 'idle';      // idle | play | over
  let paused = false;
  let clock = 0;           // мс анимаций (стоит на паузе)
  let played = 0;          // мс игрового времени (идёт только в play)
  let lives = LIVES;
  let cur = null;          // карточка в центре
  let next = null;         // карточка сверху
  let leaving = [];        // улетающие
  let lastName = '';
  let raf = 0;
  let last = 0;

  // --- Раскладка -------------------------------------------------------------------
  function layout() {
    const W = field.clientWidth;
    const H = field.clientHeight;
    const m = mobile.matches;
    const k = m ? Math.min(1.5, W / 360, H / 632) : Math.min(1.4, H / 1080, W / 1280);
    const size = (m ? 240 : 480) * k;
    const center = { x: 0, y: m ? H / 2 + 62 * k : H / 2 - 50 * k, r: -15, s: 1 };
    const peek = { x: (m ? 46.5 : 0) * k, y: (m ? 46 : 20) * k, r: 15, s: 0.75 };
    L = {
      size,
      center,
      peek,
      above: { ...peek, y: -size },
      below: { x: 0, y: H + size * 0.8, r: 5, s: 1 },
      left: { x: -(W / 2 + size), y: center.y + size * 0.1, r: -45, s: 1 },
      right: { x: W / 2 + size, y: center.y + size * 0.1, r: 15, s: 1 },
    };
    for (const c of [cur, next, ...leaving]) if (c) size_(c);
  }
  const size_ = (c) => {
    c.el.style.width = c.el.style.height = `${L.size}px`;
  };

  // --- Карточки ---------------------------------------------------------------------
  function pick() {
    let name;
    do name = CARDS[Math.floor(Math.random() * CARDS.length)];
    while (name === lastName);
    lastName = name;
    return name;
  }

  function spawn() {
    const name = pick();
    const el = document.createElement('img');
    el.className = 'game-card';
    el.src = `${CARDS_PATH}${name}.webp`;
    el.alt = '';
    el.draggable = false;
    field.append(el);
    const c = { el, kind: name[0], phase: 'peek', pose: { ...L.above }, m: null };
    size_(c);
    move(c, L.peek, presets().enter / factor(), ease.out);
    return c;
  }

  function move(c, to, dur, fn) {
    c.m = { from: { ...c.pose }, to, t0: clock, dur: Math.max(1, dur), fn };
  }

  function pose(c) {
    if (!c.m) return c.pose;
    const t = Math.min(1, (clock - c.m.t0) / c.m.dur);
    if (c.m.fall) return (c.pose = fallPose(c, t));
    const e = c.m.fn(t);
    const { from, to } = c.m;
    c.pose = {
      x: from.x + (to.x - from.x) * e,
      y: from.y + (to.y - from.y) * e,
      r: from.r + (to.r - from.r) * e,
      s: from.s + (to.s - from.s) * e,
    };
    return c.pose;
  }

  const done = (c) => clock - c.m.t0 >= c.m.dur;

  // Падение: путь «сверху → центр → за нижний край», y по пути линейный.
  // Скорость — перевёрнутый колокол: u(t) проходит центр (uc) в момент t = uc, где скорость минимальна.
  // g(x) = a·x + (1 − a)·x³ — чем меньше a, тем сильнее замедление в центре.
  const SLOW = 0.18;
  const g = (x) => SLOW * x + (1 - SLOW) * x * x * x;

  function fall(c, dur) {
    const from = { ...c.pose };
    const uc = Math.min(0.9, Math.max(0.1, (L.center.y - from.y) / (L.below.y - from.y)));
    c.m = { fall: true, from, uc, t0: clock, dur: Math.max(1, dur) };
  }

  function fallPose(c, t) {
    const { from, uc } = c.m;
    const u = t < uc ? uc - uc * g((uc - t) / uc) : uc + (1 - uc) * g((t - uc) / (1 - uc));
    const lerp = (a, b, k) => ({
      x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, r: a.r + (b.r - a.r) * k, s: a.s + (b.s - a.s) * k,
    });
    return u < uc ? lerp(from, L.center, u / uc) : lerp(L.center, L.below, (u - uc) / (1 - uc));
  }

  function draw(c) {
    const p = pose(c);
    const h = L.size / 2;
    c.el.style.transform =
      `translate(${(p.x - h).toFixed(1)}px, ${(p.y - h).toFixed(1)}px) rotate(${p.r.toFixed(2)}deg) scale(${p.s.toFixed(4)})`;
  }

  const factor = () => speed(played / DURATION);

  function promote() {
    cur = next;
    next = null;
    cur.phase = 'fall';
    fall(cur, presets().fall / factor());
    cur.el.style.zIndex = 2;
  }

  function leave(c, to, dur, fn) {
    c.phase = 'leave';
    move(c, to, dur, fn);
    c.el.style.zIndex = 1;
    leaving.push(c);
  }

  // --- Ходы -----------------------------------------------------------------------------
  function answer(dir) {
    if (state !== 'play' || paused || !cur || cur.phase === 'leave') return;
    const correct = (dir === 'right') === (cur.kind === 's');
    const c = cur;
    cur = null;
    leave(c, L[dir], presets().fly / factor(), ease.in);
    window.edgeGlow?.state(correct ? 'ok' : 'err', game);
    if (!correct) loseLife();
  }

  function miss() {
    // карточка уже ушла за нижний край — просто убираем
    cur.el.remove();
    cur = null;
    window.edgeGlow?.state('err', game);
    loseLife();
  }

  function loseLife() {
    lives = Math.max(0, lives - 1);
    hearts[lives]?.classList.add('heart--disable');
    if (lives === 0) finish('lose');
  }

  function finish(result) {
    if (state !== 'play') return;
    state = 'over';
    buttons.forEach((b) => { b.disabled = true; });
    game.dispatchEvent(new CustomEvent('game:end', { detail: { result, lives } }));
  }

  // --- Таймер -----------------------------------------------------------------------------
  let shown = -1;
  function renderTimer() {
    const left = Math.max(0, Math.ceil((DURATION - played) / 1000));
    if (left === shown) return;
    shown = left;
    const min = Math.floor(left / 60);
    minEl.textContent = min;
    minEl.classList.toggle('is-active', min > 0);
    secEl.textContent = String(left % 60).padStart(2, '0');
  }

  // --- Цикл -------------------------------------------------------------------------------
  function step() {
    if (state === 'play') {
      if (played >= DURATION) { finish('win'); return; }
      if (cur?.phase === 'fall' && done(cur)) miss();
      if (state === 'play') {
        if (!cur && next) promote();
        if (!next) next = spawn();
      }
    }
    leaving = leaving.filter((c) => {
      if (!done(c)) return true;
      c.el.remove();
      return false;
    });
  }

  function frame(ts) {
    const dt = last ? Math.min(50, ts - last) : 0;
    last = ts;
    if (!paused) {
      clock += dt;
      if (state === 'play') played = Math.min(DURATION, played + dt);
      step();
      renderTimer();
    }
    for (const c of [next, cur, ...leaving]) if (c) draw(c);
    const idle = state !== 'play' && !leaving.length;
    raf = idle ? 0 : requestAnimationFrame(frame);
  }

  const run = () => {
    if (raf) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  };

  // --- Сброс и старт ------------------------------------------------------------------------
  function reset() {
    cancelAnimationFrame(raf);
    raf = 0;
    field.replaceChildren();
    cur = next = null;
    leaving = [];
    state = 'idle';
    clock = played = 0;
    lives = LIVES;
    hearts.forEach((h) => h.classList.remove('heart--disable'));
    shown = -1;
    renderTimer();
    window.edgeGlow?.state('base', game);
    layout();
  }

  game.addEventListener('game:reset', reset);
  game.addEventListener('game:start', () => {
    layout();
    state = 'play';
    run();
  });
  document.addEventListener('game:pause', (e) => { paused = e.detail.paused; });
  window.addEventListener('resize', () => { if (L) layout(); });

  // --- Управление -----------------------------------------------------------------------------
  buttons.forEach((b) => {
    b.addEventListener('click', () => answer(b.dataset.control === 'sheep' ? 'right' : 'left'));
  });

  document.addEventListener('keydown', (e) => {
    if (!game.classList.contains('is-open') || paused || e.repeat) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); answer('left'); }
    if (e.key === 'ArrowRight') { e.preventDefault(); answer('right'); }
  });

  // свайп по полю (кнопки и шапка не считаются)
  let sx = null;
  game.addEventListener('pointerdown', (e) => {
    sx = e.target.closest('button, header, [data-settings]') ? null : e.clientX;
  });
  game.addEventListener('pointerup', (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 40) answer(dx > 0 ? 'right' : 'left');
  });

  reset();
})();
