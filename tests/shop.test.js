import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCatalog } from '../src/game/partsCatalog.js';
import { createDefaultProfile } from '../src/save/saveSchema.js';
import { canBuy, buy, equip, unequip } from '../src/game/shop.js';

const load = (f) => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url)));
const parts = load('parts');
const data = { car: load('car'), parts };
const catalog = createCatalog(parts);
const fresh = (over = {}, inst = {}) => {
  const p = createDefaultProfile('p1', 0, parts);
  return { ...p, ...over, installed: { ...p.installed, ...inst } };
};

test('comprar vid_1 com $120', () => {
  const p = fresh({ money: 120 });
  const snapshot = JSON.stringify(p);
  const { profile, part } = buy(p, 'vid_1', data, catalog);
  assert.equal(part.id, 'vid_1');
  assert.equal(profile.money, 0);
  assert.equal(profile.installed.vidros, 'vid_1');
  assert.equal(profile.totals.moneySpent, 120);
  assert.equal(JSON.stringify(p), snapshot);
});

test('requisitos, ordem e dinheiro', () => {
  const p = fresh({ money: 99999 }, { ferrugem: 'fer_1' });
  assert.deepEqual(canBuy(p, 'pin_1', data, catalog), { result: 'requisito', missing: ['fun_1'] });
  assert.equal(canBuy(p, 'mot_2', data, catalog).result, 'fora_de_ordem');
  const q = fresh({ money: 99999 }, { motor: 'mot_2' });
  const c = canBuy(q, 'ind_1', data, catalog);
  assert.equal(c.result, 'requisito');
  assert.deepEqual(c.missing, ['mot_3']);
  assert.equal(canBuy(fresh({ money: 119 }), 'vid_1', data, catalog).result, 'sem_dinheiro');
  assert.equal(canBuy(q, 'mot_1', data, catalog).result, 'ja_tem');
  assert.throws(() => buy(fresh(), 'vid_1', data, catalog));
});

test('estética: bloqueio, compra equipa, equip/unequip', () => {
  const locked = fresh({ money: 5000 }, { ferrugem: 'fer_1', funilaria: 'fun_1' });
  assert.equal(canBuy(locked, 'c_cor_preta', data, catalog).result, 'estetica_bloqueada');
  const open = fresh({ money: 5000 }, { ferrugem: 'fer_1', funilaria: 'fun_1', pintura: 'pin_2' });
  assert.equal(canBuy({ ...open, installed: { ...open.installed, pintura: 'pin_1' } }, 'c_cor_preta', data, catalog).result, 'requisito');
  const free = parts.parts.find((x) => x.id === 'c_cor_preta');
  assert.equal(free.price, 0);
  const a = buy(open, 'c_cor_preta', data, catalog).profile;
  assert.deepEqual(a.owned, ['c_cor_preta']);
  assert.equal(a.equipped.c_cor, 'c_cor_preta');
  assert.equal(canBuy(a, 'c_cor_preta', data, catalog).result, 'ja_tem');
  const b = unequip(a, 'c_cor');
  assert.equal(b.equipped.c_cor, null);
  assert.equal(equip(b, 'c_cor_preta', catalog).equipped.c_cor, 'c_cor_preta');
  assert.throws(() => equip(b, 'vid_1', catalog));
});
