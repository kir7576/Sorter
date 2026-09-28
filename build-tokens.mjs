// Сборка дизайн-токенов: tokens/<client>/tokens.json (Tokens Studio, W3C DTCG) → dist/<client>/tokens.css
//
// Правила:
// - Режим «Mobile» любой коллекции уходит в @media (max-width: 767.98px), остальные режимы — в :root.
// - Единицы задаются здесь, в Figma и JSON числа хранятся без единиц:
//     Letter-Spacing → px · Weight → без единицы · Max-radius → 9999px
//     кегль, интерлиньяж, отступы, радиусы → rem (1rem = 16px)
// - Ссылки между токенами сохраняются как var(--…), чтобы семантика в CSS тоже ссылалась на примитивы.
// - Для каждого числового токена с Mobile-значением дополнительно выпускается --<имя>-fluid:
//   clamp() с линейной интерполяцией Mobile-значения (экран 360px) → Desktop-значения (экран 1920px).

import fs from 'node:fs';
import path from 'node:path';
import StyleDictionary from 'style-dictionary';
import { fileHeader, formattedVariables } from 'style-dictionary/utils';

const TOKENS_DIR = 'tokens';
const DIST_DIR = 'dist';
const REM_BASE = 16;
const MOBILE_MEDIA = '(max-width: 767.98px)';
const REM_SCOPES = ['FONT_SIZE', 'LINE_HEIGHT', 'GAP', 'CORNER_RADIUS', 'WIDTH_HEIGHT'];
const FLUID_FROM = 360;   // ширина макета Mobile
const FLUID_TO = 1920;    // ширина макета Desktop

// --- transforms -------------------------------------------------------------

StyleDictionary.registerTransform({
  name: 'sorter/name',
  type: 'name',
  // Space/-2 → space-neg-2 (иначе совпадёт с Space/2)
  transform: (token) => cssName(token.path),
});

StyleDictionary.registerTransform({
  name: 'sorter/number-units',
  type: 'value',
  filter: (token) => token.$type === 'number',
  transform: (token) => {
    const v = Number(token.$value);
    const name = token.path.join('/');
    const scopes = token.$extensions?.['com.figma.scopes'] ?? [];
    if (/Letter-Spacing/i.test(name)) return `${v}px`;
    if (/^Weight\//.test(name) || scopes.includes('FONT_WEIGHT')) return v;
    if (/Max-radius/i.test(name)) return `${v}px`;
    if (v === 0) return '0';
    if (scopes.some((s) => REM_SCOPES.includes(s))) return `${+(v / REM_BASE).toFixed(4)}rem`;
    return v;
  },
});

StyleDictionary.registerTransform({
  name: 'sorter/font-family',
  type: 'value',
  filter: (token) => token.$type === 'text' && token.path[0] === 'Family',
  transform: (token) => `"${token.$value}"`,
});

// --- format: переменные в :root или внутри @media ---------------------------

StyleDictionary.registerFormat({
  name: 'sorter/css',
  format: async ({ dictionary, file, options }) => {
    const vars = formattedVariables({
      format: 'css',
      dictionary,
      outputReferences: true,
      usesDtcg: true,
    });
    const header = await fileHeader({ file });
    const block = `:root {\n${vars}\n}`;
    if (!options.media) return `${header}${block}\n`;
    return `${header}@media ${options.media} {\n${block.replace(/^/gm, '  ')}\n}\n`;
  },
});

// --- fluid-переменные --------------------------------------------------------

const cssName = (tokenPath) =>
  tokenPath
    .map((p) => p.replace(/^-/, 'neg-'))
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-');

const round = (n) => +n.toFixed(4);

// clamp(min, a + b·vw, max): значение mobile на FLUID_FROM, desktop на FLUID_TO
function fluid(mobile, desktop, unit) {
  const slope = (desktop - mobile) / (FLUID_TO - FLUID_FROM); // px на 1px ширины
  const intercept = mobile - slope * FLUID_FROM;               // px
  const conv = (px) => (unit === 'rem' ? `${round(px / REM_BASE)}rem` : `${round(px)}px`);
  const lo = Math.min(mobile, desktop);
  const hi = Math.max(mobile, desktop);
  const vw = round(slope * 100);
  return `clamp(${conv(lo)}, ${conv(intercept)} ${vw < 0 ? '-' : '+'} ${Math.abs(vw)}vw, ${conv(hi)})`;
}

function fluidVars(base, mobileSetTokens, valueAt) {
  const lines = [];
  const walk = (obj, prefix) => {
    for (const [k, v] of Object.entries(obj)) {
      const p = [...prefix, k];
      if (v && typeof v === 'object' && '$value' in v) {
        const desktop = valueAt(base, p.join('.'));
        if (v.$type !== 'number' || typeof desktop !== 'number' || desktop === v.$value) continue;
        const name = p.join('/');
        const scopes = v.$extensions?.['com.figma.scopes'] ?? [];
        const unit = /Letter-Spacing/i.test(name) ? 'px'
          : scopes.some((s) => REM_SCOPES.includes(s)) ? 'rem' : null;
        if (unit) lines.push(`  --${cssName(p)}-fluid: ${fluid(v.$value, desktop, unit)};`);
      } else if (v && typeof v === 'object') walk(v, p);
    }
  };
  walk(mobileSetTokens, []);
  return lines.length ? `\n/* Плавная шкала ${FLUID_FROM}→${FLUID_TO}px: Mobile → Desktop */\n:root {\n${lines.join('\n')}\n}\n` : '';
}

// --- сборка -----------------------------------------------------------------

function deepMerge(target, source, where) {
  for (const [k, v] of Object.entries(source)) {
    const isGroup = v && typeof v === 'object' && !('$value' in v);
    if (isGroup) target[k] = deepMerge(target[k] ?? {}, v, `${where}.${k}`);
    else {
      if (k in target && !where.includes('override')) console.warn(`⚠ дубль токена: ${where}.${k}`);
      target[k] = v;
    }
  }
  return target;
}

function collectPaths(obj, prefix = []) {
  const out = new Set();
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && '$value' in v) out.add([...prefix, k].join('.'));
    else if (v && typeof v === 'object') collectPaths(v, [...prefix, k]).forEach((p) => out.add(p));
  }
  return out;
}

async function buildClient(client) {
  const raw = JSON.parse(fs.readFileSync(path.join(TOKENS_DIR, client, 'tokens.json'), 'utf8'));
  const order = raw.$metadata?.tokenSetOrder ?? Object.keys(raw).filter((k) => !k.startsWith('$'));

  // первый режим каждой коллекции — базовый, «Mobile» — переопределение
  const baseSets = [];
  const mobileSets = [];
  const seenCollections = new Set();
  for (const set of order) {
    const [collection, mode] = set.split('/');
    if (mode === 'Mobile') mobileSets.push(set);
    else if (!seenCollections.has(collection)) {
      baseSets.push(set);
      seenCollections.add(collection);
    }
  }

  const base = {};
  for (const s of baseSets) deepMerge(base, structuredClone(raw[s]), s);

  const mobile = structuredClone(base);
  const mobilePaths = new Set();
  const valueAt = (obj, p) => p.split('.').reduce((o, k) => o?.[k], obj)?.$value;
  for (const s of mobileSets) {
    deepMerge(mobile, structuredClone(raw[s]), `override:${s}`);
    // в @media попадают только значения, отличающиеся от базового режима
    collectPaths(raw[s]).forEach((p) => {
      if (JSON.stringify(valueAt(raw[s], p)) !== JSON.stringify(valueAt(base, p))) mobilePaths.add(p);
    });
  }

  const outDir = path.join(DIST_DIR, client) + '/';
  const platform = (files) => ({
    transforms: ['sorter/name', 'sorter/number-units', 'sorter/font-family'],
    buildPath: outDir,
    files,
  });

  await new StyleDictionary({
    tokens: base,
    usesDtcg: true,
    log: { verbosity: 'silent' },
    platforms: { css: platform([{ destination: 'tokens.base.css', format: 'sorter/css' }]) },
  }).buildAllPlatforms();

  await new StyleDictionary({
    tokens: mobile,
    usesDtcg: true,
    log: { verbosity: 'silent' },
    platforms: {
      css: platform([
        {
          destination: 'tokens.mobile.css',
          format: 'sorter/css',
          filter: (t) => mobilePaths.has(t.path.join('.')),
          options: { media: MOBILE_MEDIA },
        },
      ]),
    },
  }).buildAllPlatforms();

  // один итоговый файл для подключения на сайте
  const css = ['tokens.base.css', 'tokens.mobile.css']
    .map((f) => fs.readFileSync(outDir + f, 'utf8'))
    .join('\n');
  const fluidCss = mobileSets.map((s) => fluidVars(base, raw[s], valueAt)).join('');
  fs.writeFileSync(outDir + 'tokens.css', css + fluidCss);
  fs.rmSync(outDir + 'tokens.base.css');
  fs.rmSync(outDir + 'tokens.mobile.css');
  console.log(`✔ ${client}: ${outDir}tokens.css (${baseSets.length} наборов + ${mobileSets.length} mobile)`);
}

const only = process.argv[2];
const clients = only
  ? [only]
  : fs.readdirSync(TOKENS_DIR).filter((d) => fs.existsSync(path.join(TOKENS_DIR, d, 'tokens.json')));
for (const c of clients) await buildClient(c);
