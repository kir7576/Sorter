// Финал игры: по событию 'game:end' показывает «Почти получилось» (lose) или форму приза (win),
// после отправки формы — «Спасибо за игру». Шапка с таймером и жизнями остаётся как в конце игры.
// Форма — демо: данные проверяются, но никуда не отправляются.
// Открыть экран сразу для проверки: #win, #lose или #thanks в адресе.

(() => {
  const game = document.querySelector('[data-game]');
  const final = game?.querySelector('[data-final]');
  if (!game || !final) return;

  const screens = Object.fromEntries(
    [...final.querySelectorAll('[data-final-screen]')].map((el) => [el.dataset.finalScreen, el]),
  );
  const form = final.querySelector('[data-prize-form]');
  const submit = form.querySelector('[type="submit"]');
  const DELAY = 700; // даём последней карточке улететь

  let timer = 0;

  function show(name) {
    clearTimeout(timer);
    game.classList.add('is-final');
    final.hidden = false;
    for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
    requestAnimationFrame(() => final.classList.add('is-visible'));
    const focusable = screens[name].querySelector('button, input, a');
    focusable?.focus({ preventScroll: true });
  }

  function hide() {
    clearTimeout(timer);
    game.classList.remove('is-final');
    final.classList.remove('is-visible');
    final.hidden = true;
    form.reset();
    form.querySelectorAll('.is-error').forEach((el) => el.classList.remove('is-error'));
    form.querySelectorAll('.field__error').forEach((el) => { el.textContent = ''; });
    submit.disabled = true;
  }

  game.addEventListener('game:end', (e) => {
    timer = setTimeout(() => show(e.detail.result === 'win' ? 'win' : 'lose'), DELAY);
  });
  game.addEventListener('game:reset', hide);

  final.querySelector('[data-final-restart]').addEventListener('click', () => window.gameScreen?.restart());

  // --- Форма ------------------------------------------------------------------
  const NAME = /^[А-Яа-яЁё]+(?:[ -][А-Яа-яЁё]+)*$/;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const wrap = (name) => form.querySelector(`[data-field-wrap="${name}"]`);

  const rules = {
    name: (v) => (!v ? 'Введите имя' : NAME.test(v) ? '' : 'Укажите имя кириллицей'),
    email: (v) => (!v ? 'Введите email' : EMAIL.test(v) ? '' : 'Проверьте email'),
  };

  function setError(name, message) {
    const box = wrap(name);
    box.classList.toggle('is-error', Boolean(message));
    const out = box.querySelector('.field__error');
    if (out) out.textContent = message;
    box.querySelector('input').setAttribute('aria-invalid', String(Boolean(message)));
  }

  // кнопка активна, когда поля заполнены (как в макете: Default — disable, Filled — активна)
  const refresh = () => {
    submit.disabled = !(form.name.value.trim() && form.email.value.trim());
  };

  form.addEventListener('input', (e) => {
    const { name } = e.target;
    if (wrap(name)?.classList.contains('is-error')) {
      // ошибка снимается, как только значение стало верным
      if (name in rules) setError(name, rules[name](e.target.value.trim()));
      else setError(name, e.target.checked ? '' : 'required');
    }
    refresh();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    for (const [name, check] of Object.entries(rules)) {
      const message = check(form[name].value.trim());
      setError(name, message);
      if (message) ok = false;
    }
    // оба согласия обязательны — как в макете Pop-Up-Form-Error
    for (const name of ['policy', 'mailing']) {
      const bad = !form[name].checked;
      setError(name, bad ? 'required' : '');
      if (bad) ok = false;
    }
    if (!ok) {
      form.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    show('thanks');
  });

  form.querySelectorAll('[data-demo-link]').forEach((a) => a.addEventListener('click', (e) => e.preventDefault()));

  // --- Шаринг -----------------------------------------------------------------
  const url = location.href.split('#')[0];
  const text = 'Найдите волков среди овец';
  const SHARE = {
    vk: `https://vk.com/share.php?url=${encodeURIComponent(url)}`,
    ok: `https://connect.ok.ru/offer?url=${encodeURIComponent(url)}`,
    tg: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  };
  final.querySelectorAll('[data-share]').forEach((a) => {
    const href = SHARE[a.dataset.share];
    if (href) { a.href = href; return; }
    // у Max и Дзена нет ссылки «поделиться» — системное меню или копирование ссылки
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        if (navigator.share) await navigator.share({ title: text, url });
        else { await navigator.clipboard.writeText(url); a.setAttribute('aria-label', 'Ссылка скопирована'); }
      } catch { /* пользователь закрыл меню */ }
    });
  });

  const hash = location.hash.slice(1);
  if (hash in screens) {
    document.documentElement.classList.add('is-game');
    game.classList.add('is-open');
    game.setAttribute('aria-hidden', 'false');
    show(hash);
  }
})();
