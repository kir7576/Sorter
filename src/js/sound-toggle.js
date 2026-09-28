// Кнопка звука в шапке (HUD-Icons): переключает Sound Off ↔ On. Сам звук появится вместе с игрой.
(() => {
  document.querySelectorAll('[data-sound-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      document.querySelectorAll('[data-sound-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(on)));
      document.documentElement.dataset.sound = on ? 'on' : 'off';
    });
  });
})();
