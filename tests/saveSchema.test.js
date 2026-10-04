import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDefaultSave, createDefaultProfile, normalizeSave, SCHEMA_VERSION } from '../src/save/saveSchema.js';

const parts = JSON.parse(readFileSync(new URL('../docs/arquitetura/dados/parts.json', import.meta.url)));
const tier0 = (slot) => parts.parts.find((p) => p.slot === slot && p.tier === 0).id;

test('default tem 2 perfis com 16 slots tier 0', () => {
  const s = createDefaultSave(1000, parts);
  assert.equal(s.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(Object.keys(s.profiles), ['p1', 'p2']);
  for (const p of Object.values(s.profiles)) {
    const slots = Object.keys(p.installed);
    assert.equal(slots.length, 16);
    for (const sl of slots) assert.equal(p.installed[sl], tier0(sl));
    assert.deepEqual(p.owned, []);
    assert.equal(Object.keys(p.equipped).length, 6);
  }
  assert.equal(s.profiles.p1.createdAt, 1000);
  assert.equal(createDefaultProfile('p2', 5, parts).helmet, 'capacete_vermelho');
});

test('normalização: slot ausente → tier 0', () => {
  const s = createDefaultSave(1, parts);
  delete s.profiles.p1.installed.motor;
  const n = normalizeSave(s, parts);
  assert.equal(n.profiles.p1.installed.motor, 'mot_0');
  assert.equal(n.profiles.p1.money, 0);
});

test('normalização: peça inexistente volta ao tier 0 e devolve o dinheiro', () => {
  const s = createDefaultSave(1, parts);
  s.profiles.p1.money = 10;
  s.profiles.p1.installed.vidros = 'vid_1';
  s.profiles.p1.installed.motor = 'mot_removido';
  s.profiles.p1.installed.pneus = 'pne_77'; // inexistente: devolve tiers 1..max
  const n = normalizeSave(s, parts);
  assert.equal(n.profiles.p1.installed.motor, 'mot_0');
  assert.equal(n.profiles.p1.installed.vidros, 'vid_1');
  const pne = parts.parts.filter((p) => p.slot === 'pneus' && p.tier >= 1).reduce((a, p) => a + p.price, 0);
  assert.equal(n.profiles.p1.installed.pneus, 'pne_0');
  assert.equal(n.profiles.p1.money, 10 + pne);
});

test('normalização: equipped não possuído vira null; owned desconhecido some', () => {
  const s = createDefaultSave(1, parts);
  s.profiles.p1.owned = ['c_cor_preta', 'nao_existe'];
  s.profiles.p1.equipped.c_cor = 'c_cor_preta';
  s.profiles.p1.equipped.c_rodas = 'c_cor_vermelha';
  const n = normalizeSave(s, parts);
  assert.deepEqual(n.profiles.p1.owned, ['c_cor_preta']);
  assert.equal(n.profiles.p1.equipped.c_cor, 'c_cor_preta');
  assert.equal(n.profiles.p1.equipped.c_rodas, null);
});
