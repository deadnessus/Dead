import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCatalog } from '../src/game/partsCatalog.js';
import { createDefaultProfile } from '../src/save/saveSchema.js';
import { unlockedTrackIds, newlyUnlockedTrackIds, markUnlocksSeen, isCustomUnlocked } from '../src/game/progression.js';

const load = (f) => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url)));
const parts = load('parts');
const data = { car: load('car'), parts, tracks: load('tracks') };
const catalog = createCatalog(parts);
const base = () => createDefaultProfile('p1', 0, parts);
const withTop = (slots, p = base()) => {
  const installed = { ...p.installed };
  for (const s of slots) installed[s] = catalog.partsBySlot(s).at(-1).id;
  return { ...p, installed };
};
const category = (c) => catalog.slotsByCategory(c).map((s) => s.id);

test('nível 11 → só t1', () => {
  assert.deepEqual(unlockedTrackIds(base(), data, catalog), ['t1']);
});

test('nível ≥ 70 sem restauração completa não inclui t8; com tudo inclui', () => {
  const perf = withTop(category('desempenho'));
  const ids = unlockedTrackIds(perf, data, catalog);
  assert.ok(ids.includes('t7'));
  assert.ok(!ids.includes('t8'));
  const full = withTop(category('restauracao'), perf);
  assert.deepEqual(unlockedTrackIds(full, data, catalog), data.tracks.tracks.map((t) => t.id));
});

test('novas desbloqueadas e marcação como vistas', () => {
  const p = withTop(['motor']);
  const fresh = newlyUnlockedTrackIds(p, data, catalog);
  assert.ok(fresh.length > 0 && !fresh.includes('t1'));
  const seen = markUnlocksSeen(p, fresh);
  assert.deepEqual(newlyUnlockedTrackIds(seen, data, catalog), []);
  assert.deepEqual(p.seenUnlocks, ['t1']);
});

test('isCustomUnlocked exige fer_1+fun_1+pin_1', () => {
  assert.equal(isCustomUnlocked(base(), data, catalog), false);
  assert.equal(isCustomUnlocked(withTop(['ferrugem', 'funilaria', 'pintura']), data, catalog), true);
});
