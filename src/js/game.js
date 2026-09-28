// Экран игры: открывается кнопкой «Начать игру» ([data-game-open]) поверх страницы и начинает с обратного отсчёта.
// Отсчёт 3 → 2 → 1: каждая цифра появляется крупной и плавно уменьшается до появления следующей,
// смена цифр мгновенная. События на .game: 'game:reset' перед отсчётом, 'game:start' после него.
// window.gameScreen.restart() — начать заново. Открыть сразу: адрес с #game.

(() => {
  const game = document.querySelector('[data-game]');
  if (!game) return;
  const countdown = game.querySelector('[data-countdown]');
  const digit = countdown.querySelector('[data-countdown-digit]');
  const controls = game.querySelectorAll('[data-control]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FROM = 3;
  const STEP = 1000;   // мс на цифру
  const FADE = 400;    // появление экрана, как transition у .game

  let anim = null;
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
    anim = null;
    if (reduce) return;
    anim = digit.animate(
      [{ transform: 'scale(1)' }, { transform: `scale(${1 / zoom()})` }],
      { duration: STEP, easing: 'cubic-bezier(0.25, 0.6, 0.3, 1)' },
    );
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

  // пауза из панели настроек: отсчёт замирает вместе с игрой
  document.addEventListener('game:pause', (e) => {
    const next = e.detail.paused;
    if (next === paused) return;
    paused = next;
    if (!counting) return;
    if (paused) {
      left = Math.max(0, due - performance.now());
      clearTimeout(timer);
      anim?.pause();
    } else {
      anim?.play();
      schedule(left);
    }
  });

  window.gameScreen = { restart: start };

  document.querySelectorAll('[data-game-open]').forEach((a) => {
    a.addEventListener('click', (e) => { e.preventDefault(); open(); });
  });
  if (location.hash === '#game') open();
})();
