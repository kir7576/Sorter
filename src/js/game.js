// Игра: открывается кнопкой «Начать игру» ([data-game-open]) поверх страницы и начинает с обратного отсчёта.
// Отсчёт 3 → 2 → 1: каждая цифра появляется крупной и плавно уменьшается до появления следующей,
// смена цифр мгновенная. По окончании на .game срабатывает событие 'game:start'.
// Открыть сразу: адрес с #game.

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

  const zoom = () => parseFloat(getComputedStyle(countdown).getPropertyValue('--countdown-zoom')) || 1;

  function show(n) {
    digit.textContent = n;
    anim?.cancel();
    if (reduce) return;
    anim = digit.animate(
      [{ transform: 'scale(1)' }, { transform: `scale(${1 / zoom()})` }],
      { duration: STEP, easing: 'cubic-bezier(0.25, 0.6, 0.3, 1)' },
    );
  }

  function runCountdown() {
    clearTimeout(timer);
    controls.forEach((b) => { b.disabled = true; });
    countdown.hidden = false;
    let n = FROM;
    const tick = () => {
      if (n === 0) {
        countdown.hidden = true;
        controls.forEach((b) => { b.disabled = false; });
        game.dispatchEvent(new CustomEvent('game:start'));
        return;
      }
      show(n--);
      timer = setTimeout(tick, STEP);
    };
    tick();
  }

  function open() {
    document.documentElement.classList.add('is-game');
    game.classList.add('is-open');
    game.setAttribute('aria-hidden', 'false');
    countdown.hidden = true; // цифра появляется уже крупной, когда экран проявился
    clearTimeout(timer);
    timer = setTimeout(runCountdown, reduce ? 0 : FADE);
  }

  document.querySelectorAll('[data-game-open]').forEach((a) => {
    a.addEventListener('click', (e) => { e.preventDefault(); open(); });
  });
  if (location.hash === '#game') open();
})();
