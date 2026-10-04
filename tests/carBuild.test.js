import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createCatalog } from '../src/game/partsCatalog.js';
import { computeCarBuild } from '../src/game/carBuild.js';
import { restorationProgress, isFullyRestored } from '../src/game/carLevel.js';

const dir = existsSync(new URL('../data/parts.json', import.meta.url)) ? '../data/' : '../docs/arquitetura/dados/';
const load = (f) => JSON.parse(readFileSync(new URL(dir + f, import.meta.url), 'utf8'));
const data = { car: load('car.json'), parts: load('parts.json') };
const cat = createCatalog(data.parts);
const profileWith = (pick) => {
  const installed = {};
  for (const s of data.parts.slots) {
    if (s.category === 'estetica') continue;
    const list = cat.partsBySlot(s.id);
    installed[s.id] = (pick(s, list) ?? list[0]).id;
  }
  return { installed, owned: [], equipped: {} };
};
const fresh = () => profileWith(() => null);
const maxed = () => profileWith((s, l) => l[l.length - 1]);

test('perfil novo', () => {
  const b = computeCarBuild(fresh(), data, cat);
  assert.deepEqual(b.stats, { acc: 10, vel: 10, ade: 12, frn: 10, dir: 15 });
  assert.equal(b.level, 11);
  assert.deepEqual(b.flags, { fumaca: true, falhando: true });
  assert.equal(b.engineProfile, 'i6_200');
  assert.equal(b.gears, 3);
  assert.equal(b.exhaust, 0);
  assert.equal(b.induction, 'none');
});

test('tudo no tier máximo', () => {
  const b = computeCarBuild(maxed(), data, cat);
  assert.deepEqual(b.stats, { acc: 95, vel: 95, ade: 90, frn: 90, dir: 85 });
  assert.equal(b.level, 91);
  assert.equal(b.engineProfile, 'v8_428');
  assert.equal(b.gears, 5);
  assert.equal(b.induction, 'compressor');
  assert.deepEqual(b.flags, { fumaca: false, falhando: false });
});

test('mot_2 soma tiers 1+2', () => {
  const p = fresh();
  p.installed.motor = 'mot_2';
  const b = computeCarBuild(p, data, cat);
  assert.equal(b.stats.acc, 10 + 8 + 10);
  assert.equal(b.engineProfile, 'v8_302');
});

test('não muta o perfil e restauração 0/9 → 9/9', () => {
  const p = fresh();
  const copy = structuredClone(p);
  assert.deepEqual(restorationProgress(p, cat), { done: 0, total: 9 });
  assert.equal(isFullyRestored(p, cat), false);
  computeCarBuild(p, data, cat);
  assert.deepEqual(p, copy);
  const m = maxed();
  assert.deepEqual(restorationProgress(m, cat), { done: 9, total: 9 });
  assert.equal(isFullyRestored(m, cat), true);
  const b = computeCarBuild(m, data, cat);
  assert.equal(b.restorationDone, 9);
  assert.equal(b.restorationTotal, 9);
});
