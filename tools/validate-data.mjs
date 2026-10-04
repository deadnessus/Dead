// Uso: node tools/validate-data.mjs — valida data/*.json contra assets/manifest.json.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { validateGameData } from '../src/data/validate.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const data = {};
for (const f of ['car', 'parts', 'tracks', 'opponents', 'themes', 'balance']) data[f] = read(`data/${f}.json`);
const errors = validateGameData(data, read('assets/manifest.json'));
if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`${errors.length} erro(s)`);
  process.exit(1);
}
console.log('OK');
