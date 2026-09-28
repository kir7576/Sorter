// Лоадер: знак EMX заполняется снизу вверх (CSS-анимация до 85%),
// после полной загрузки страницы доливается до конца и исчезает.

(() => {
  const loader = document.querySelector('[data-loader]');
  if (!loader) return;
  const FILL = 300;   // долить до конца, как transition у .loader__fill

  const finish = () => {
    // зафиксировать текущую высоту, чтобы долив шёл от неё, а не скачком
    const fill = loader.querySelector('.loader__fill');
    fill.style.height = `${fill.getBoundingClientRect().height}px`;
    requestAnimationFrame(() => {
      loader.classList.add('is-full');
      fill.style.height = '';
      loader.setAttribute('aria-valuenow', '100');
      setTimeout(() => {
        loader.classList.add('is-done');
        loader.addEventListener('transitionend', () => loader.remove(), { once: true });
      }, FILL + 150);
    });
  };
  if (document.readyState === 'complete') finish();
  else window.addEventListener('load', finish, { once: true });
})();
