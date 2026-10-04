import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createCatalog } from '../src/game/partsCatalog.js';

const dir = existsSync(new URL('../data/parts.json', import.meta.url)) ? '../data/' : '../docs/arquitetura/dados/';
const partsJson = JSON.parse(readFileSync(new URL(dir + 'parts.json', import.meta.url), 'utf8'));
const cat = createCatalog(partsJson);
const profile = (installed = {}, owned = []) => ({ installed: { motor: 'mot_0', ...installed }, owned });

test('índices', () => {
  assert.equal(cat.partById('mot_2').tier, 2);
  assert.equal(cat.slotById('motor').category, 'desempenho');
  assert.deepEqual(cat.partsBySlot('motor').map((p) => p.tier), [0, 1, 2, 3, 4]);
  assert.equal(cat.stockPartId('motor'), 'mot_0');
  assert.equal(cat.maxTier('motor'), 4);
  assert.equal(cat.slotsByCategory('restauracao').length, 8);
});

test('requisito de desempenho por tier instalado', () => {
  assert.equal(cat.isRequirementMet(profile(), 'mot_3'), false);
  assert.equal(cat.isRequirementMet(profile({ motor: 'mot_3' }), 'mot_3'), true);
  assert.equal(cat.isRequirementMet(profile({ motor: 'mot_4' }), 'mot_3'), true);
});

test('requisito de estética = posse', () => {
  const id = partsJson.parts.find((p) => p.id.startsWith('c_')).id;
  assert.equal(cat.isRequirementMet(profile(), id), false);
  assert.equal(cat.isRequirementMet(profile({}, [id]), id), true);
});
