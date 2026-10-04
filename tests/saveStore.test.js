import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSaveStore } from '../src/save/saveStore.js';
import { createMemoryBackend } from '../src/save/storageBackend.js';
import { createDefaultSave } from '../src/save/saveSchema.js';

const dir = new URL('../docs/arquitetura/dados/', import.meta.url);
const partsJson = JSON.parse(readFileSync(new URL('parts.json', dir)));
const balanceJson = JSON.parse(readFileSync(new URL('balance.json', dir)));
const K = 'mustang68.save';
const mk = (init = {}, extra = {}) => {
  const b = createMemoryBackend(init);
  const warns = [];
  return { b, warns, s: createSaveStore(b, { partsJson, balanceJson, now: () => 42, debounceMs: 5, onWarn: (m) => warns.push(m), ...extra }) };
};
const saved = (money) => { const d = createDefaultSave(1, partsJson); d.profiles.p1.money = money; return JSON.stringify(d); };

test('sem save → default sem avisos', () => {
  const { s, warns } = mk();
  assert.equal(s.load().profiles.p1.money, 0);
  assert.deepEqual(warns, []);
});

test('save corrompido "{" → carrega .bak', () => {
  const { s, warns } = mk({ [K]: '{', [K + '.bak']: saved(77) });
  assert.equal(s.load().profiles.p1.money, 77);
  assert.deepEqual(warns, ['save_corrompido']);
});

test('ambos corrompidos → default', () => {
  const { s } = mk({ [K]: '{', [K + '.bak']: 'xx' });
  const d = s.load();
  assert.equal(d.profiles.p1.money, 0);
  assert.equal(Object.keys(d.profiles.p2.installed).length, 16);
});

test('flush() grava .bak com o conteúdo anterior', () => {
  const { b, s } = mk({ [K]: saved(5) });
  s.load();
  s.updateProfile('p1', (p) => ({ ...p, money: 9 }));
  s.flush();
  assert.equal(JSON.parse(b.getItem(K + '.bak')).profiles.p1.money, 5);
  assert.equal(JSON.parse(b.getItem(K)).profiles.p1.money, 9);
});

test('schemaVersion 99 → schema_futuro e nada é sobrescrito', () => {
  const orig = JSON.stringify({ schemaVersion: 99, x: 1 });
  const { b, s } = mk({ [K]: orig });
  assert.throws(() => s.load(), { message: 'schema_futuro' });
  s.updateProfile('p1', (p) => ({ ...p, money: 1 }));
  s.flush();
  assert.equal(b.getItem(K), orig);
  assert.equal(b.getItem(K + '.bak'), null);
  assert.equal(b.writes, 0);
});

test('importJSON rejeita app diferente, json ruim, versão futura e inválido', () => {
  const { s } = mk();
  s.load();
  assert.deepEqual(s.importJSON('{'), { ok: false, error: 'json' });
  assert.deepEqual(s.importJSON(JSON.stringify({ app: 'outro', save: {} })), { ok: false, error: 'app' });
  assert.deepEqual(s.importJSON(JSON.stringify({ app: 'mustang68', save: { schemaVersion: 99 } })), { ok: false, error: 'schema_futuro' });
  assert.deepEqual(s.importJSON(JSON.stringify({ app: 'mustang68', save: { schemaVersion: 1 } })), { ok: false, error: 'invalido' });
});

test('export → import faz ida e volta', () => {
  const a = mk();
  a.s.load();
  a.s.updateProfile('p2', (p) => ({ ...p, money: 300 }));
  const txt = a.s.exportJSON();
  assert.equal(JSON.parse(txt).app, 'mustang68');
  const c = mk();
  c.s.load();
  assert.deepEqual(c.s.importJSON(txt), { ok: true });
  assert.equal(c.s.getProfile('p2').money, 300);
});

test('normalização no load devolve dinheiro de peça inexistente', () => {
  const d = createDefaultSave(1, partsJson);
  d.profiles.p1.installed.motor = 'mot_fantasma';
  d.profiles.p1.installed.vidros = 'vid_1';
  const { s } = mk({ [K]: JSON.stringify(d) });
  const p = s.load().profiles.p1;
  assert.equal(p.installed.motor, 'mot_0');
  assert.equal(p.installed.vidros, 'vid_1');
});

test('debounce: 3 updateProfile seguidos = 1 escrita', async () => {
  const { b, s } = mk();
  s.load();
  for (const m of [1, 2, 3]) s.updateProfile('p1', (p) => ({ ...p, money: m }));
  assert.equal(b.writes, 0);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(b.writes, 1);
  assert.equal(JSON.parse(b.getItem(K)).profiles.p1.money, 3);
});

test('updateProfile não muta o perfil anterior; resetProfile mantém o nome', () => {
  const { s } = mk();
  s.load();
  const before = s.getProfile('p1');
  s.updateProfile('p1', (p) => { p.name = 'Zé'; p.money = 50; return p; });
  assert.equal(before.name, 'Piloto 1');
  s.resetProfile('p1');
  assert.equal(s.getProfile('p1').name, 'Zé');
  assert.equal(s.getProfile('p1').money, 0);
  assert.ok(Object.isFrozen(s.get()));
  s.flush();
});
