// Экран игры: открывается кнопкой «Начать игру» ([data-game-open]) поверх страницы и начинает с обратного отсчёта.
// Отсчёт 3 → 2 → 1: каждая цифра появляется крупной и плавно уменьшается до появления следующей,
// смена цифр мгновенная. Подсветка по краям пульсирует в такт: с каждой цифрой вспыхивает до 100%
// и вместе с цифрой гаснет до 40%, после отсчёта плавно возвращается к 100%.
// События на .game: 'game:reset' перед отсчётом, 'game:start' после него.
// window.gameScreen.restart() — начать заново. Открыть сразу: адрес с #game.

(() => {
  const game = document.querySelector('[data-game]');
  if (!game) return;
  const countdown = game.querySelector('[data-countdown]');
  const digit = countdown.querySelector('[data-countdown-digit]');
  const controls = game.querySelectorAll('[data-control]');
  const glow = game.querySelector('[data-edge-glow="base"]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FROM = 3;
  const STEP = 1000;   // мс на цифру
  const FADE = 400;    // появление экрана, как transition у .game
  const GLOW_MIN = 0.4; // минимум пульса подсветки во время отсчёта
  const EASE = 'cubic-bezier(0.25, 0.6, 0.3, 1)';

  let anim = null;
  let pulse = null;
  let timer = 0;
  let n = 0;           // сколько цифр осталось показать
  let counting = false;
  let due = 0;         // когда следующий шаг отсчёта
  let left = 0;        // сколько оставалось до шага в момент паузы
  let paused = false;

  const zoom = () => parseFloat(getComputedStyle(countdown).getPropertyValue('--countdown-zoom')) || 1;

  function show(value) {
    digit.textContent = value;
    anim?.cancel();
    pulse?.cancel();
    anim = pulse = null;
    if (reduce) return;
    anim = digit.animate(
      [{ transform: 'scale(1)' }, { transform: `scale(${1 / zoom()})` }],
      { duration: STEP, easing: EASE },
    );
    pulse = glow?.animate([{ opacity: 1 }, { opacity: GLOW_MIN }], { duration: STEP, easing: EASE, fill: 'forwards' }) ?? null;
  }

  // после отсчёта (или при сбросе) подсветка плавно возвращается к 100%
  function settleGlow() {
    if (!pulse) return;
    const from = parseFloat(getComputedStyle(glow).opacity);
    pulse.cancel();
    pulse = null;
    if (from < 1) glow.animate([{ opacity: from }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
  }

  function schedule(ms) {
    clearTimeout(timer);
    due = performance.now() + ms;
    if (!paused) timer = setTimeout(tick, ms);
    else left = ms;
  }

  function tick() {
    if (n === 0) {
      counting = false;
      settleGlow();
      countdown.hidden = true;
      controls.forEach((b) => { b.disabled = false; });
      game.dispatchEvent(new CustomEvent('game:start'));
      return;
    }
    countdown.hidden = false;
    show(n--);
    schedule(STEP);
  }

  function start() {
    clearTimeout(timer);
    anim?.cancel();
    settleGlow();
    controls.forEach((b) => { b.disabled = true; });
    countdown.hidden = true; // цифра появляется уже крупной, когда экран проявился
    game.dispatchEvent(new CustomEvent('game:reset'));
    n = FROM;
    counting = true;
    schedule(reduce ? 0 : FADE);
  }

  function open() {
    document.documentElement.classList.add('is-game');
    game.classList.add('is-open');
    game.setAttribute('aria-hidden', 'false');
    start();
  }

  // пауза из панели настроек: отсчёт и пульс подсветки замирают вместе с игрой
  document.addEventListener('game:pause', (e) => {
    const next = e.detail.paused;
    if (next === paused) return;
    paused = next;
    if (!counting) return;
    if (paused) {
      left = Math.max(0, due - performance.now());
      clearTimeout(timer);
      anim?.pause();
      pulse?.pause();
    } else {
      anim?.play();
      pulse?.play();
      schedule(left);
    }
  });

  window.gameScreen = { restart: start };

  document.querySelectorAll('[data-game-open]').forEach((a) => {
    a.addEventListener('click', (e) => { e.preventDefault(); open(); });
  });
  if (location.hash === '#game') open();
})();
