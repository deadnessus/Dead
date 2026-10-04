import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateGameData } from '../src/data/validate.js';

const read = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const load = () => {
  const data = {};
  for (const f of ['car', 'parts', 'tracks', 'opponents', 'themes', 'balance']) data[f] = read(`data/${f}.json`);
  return { data, manifest: read('assets/manifest.json') };
};
const run = (mutate) => {
  const { data, manifest } = load();
  mutate(data, manifest);
  return validateGameData(data, manifest);
};

test('dados reais → 0 erros', () => {
  const { data, manifest } = load();
  assert.deepEqual(validateGameData(data, manifest), []);
});

test('slot inexistente', () => {
  const errs = run((d) => { d.parts.parts[3].slot = 'xyz'; });
  assert.ok(errs.includes("parts.parts[3].slot: 'xyz' não existe"), errs.join('\n'));
});

test('variante sem asset', () => {
  const errs = run((d) => {
    const p = d.parts.parts.find((x) => x.visual && x.visual.length);
    p.visual[0].variant = 'inexistente';
  });
  assert.ok(errs.some((e) => /car\.rear\..*\.inexistente.*não existe no manifesto/.test(e)), errs.join('\n'));
  assert.ok(errs.some((e) => /car\.side\..*\.inexistente/.test(e)));
});

test('id duplicado, tier, requires, stats', () => {
  const errs = run((d) => {
    d.parts.parts[1].id = d.parts.parts[0].id;
    d.parts.parts.find((p) => p.tier === 0).price = 10;
    d.parts.parts[2].requires = ['nada'];
    d.parts.parts[2].stats = { foo: 1 };
  });
  assert.ok(errs.some((e) => /duplicado/.test(e)));
  assert.ok(errs.some((e) => /tier 0 deve custar 0/.test(e)));
  assert.ok(errs.some((e) => /requires\[0\]: 'nada'/.test(e)));
  assert.ok(errs.some((e) => /stats\.foo/.test(e)));
});

test('pista: segmentos, hill, giro, oponentes, tema', () => {
  const errs = run((d) => {
    const t = d.tracks.tracks[0];
    t.segments += 1;
    t.sections[0].hill += 5;
    t.sections.forEach((s) => { s.curve = -Math.abs(s.curve); });
    t.opponents = ['o01', 'zz'];
    t.theme = 'marte';
  });
  for (const re of [/segments/, /soma dos hill/, /giro total/, /5 oponentes/, /'zz' não existe/, /'marte'/]) {
    assert.ok(errs.some((e) => re.test(e)), String(re));
  }
});

test('tema, motor, balance, car', () => {
  const errs = run((d, m) => {
    d.themes.themes.bairro.bg.sky = 'bg.nada';
    m.images['dec.arvore'].kind = 'background';
    d.parts.parts.find((p) => p.slot === 'motor').engineProfile = 'zzz';
    d.balance.difficulty.default = 'x';
    d.balance.economy.positionPayout.pop();
    d.car.customUnlockRequires.push('nope');
    d.car.layers[0].default = 'fantasma';
  });
  for (const re of [/bg\.sky: 'bg\.nada'/, /billboard/, /eng\.zzz\.low/, /difficulty\.default/, /positionPayout/, /'nope'/, /car\.rear\.sombra\.fantasma/]) {
    assert.ok(errs.some((e) => re.test(e)), String(re));
  }
});
