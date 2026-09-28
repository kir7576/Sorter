# Sorter

Игра-сортировщик «овцы / волки». Оформление полностью задаётся дизайн-токенами — под нового клиента меняются только токены, код не трогается.

## Токены

```
Figma (копия файла под клиента)
  → Tokens Studio: Import variables → Push
  → tokens/<client>/tokens.json   (W3C DTCG, формат Tokens Studio)
  → npm run build:tokens
  → dist/<client>/tokens.css      (CSS-переменные)
```

- `npm run build:tokens` — собрать всех клиентов; `npm run build:tokens -- sorter` — одного.
- Режим `Mobile` из Figma уходит в `@media (max-width: 767.98px)`.
- Единицы расставляет сборка (в Figma числа без единиц): кегль, интерлиньяж, отступы, радиусы → rem (1rem = 16px); letter-spacing → px; weight → без единицы.
- `dist/` не коммитится — собирается при деплое.

### Новый клиент
1. Дублировать файл Figma, поправить переменные.
2. Tokens Studio → Import variables (Convert numbers to dimensions — **выключено**) → Settings → Token Storage → новое подключение с File path `tokens/<client>/tokens.json` → Push.

### Правило для вёрстки
В CSS используются только семантические токены (`--background-*`, `--brand-*`, `--text-*`, `--button-*`, `--stroke-*`, `--game-ui-*`) и типографика/отступы/радиусы. Примитивы (`--dark-solid-*`, `--color-*-solid-*`, `--light-alpha-*`) напрямую не использовать.
