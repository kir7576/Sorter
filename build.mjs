// Сборка сайта под клиента: токены → dist/<client>/tokens.css, src/ → dist/<client>/, assets/<client>/ → dist/<client>/assets/
// Запуск: node build.mjs [client]   (по умолчанию sorter)

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const client = process.argv[2] ?? 'sorter';
const out = `dist/${client}`;

fs.rmSync(out, { recursive: true, force: true });
execFileSync('node', ['build-tokens.mjs', client], { stdio: 'inherit' });

fs.cpSync('src', out, { recursive: true });
if (fs.existsSync(`assets/${client}`)) fs.cpSync(`assets/${client}`, `${out}/assets`, { recursive: true });

console.log(`✔ сайт: ${out}/`);
