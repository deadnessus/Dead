import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDefaultProfile } from '../src/save/saveSchema.js';
import { computePrize, applyRaceResult } from '../src/game/economy.js';

const load = (f) => JSON.parse(readFileSync(new URL(`../data/${f}.json`, import.meta.url)));
const parts = load('parts');
const balance = load('balance');
const t1 = load('tracks').tracks.find((t) => t.id === 't1');
const profile = () => createDefaultProfile('p1', 0, parts);
const res = (o) => ({ trackId: 't1', position: 1, totalTimeMs: 90000, bestLapMs: 30000,
  playerBestLapOfRace: false, hits: 0, ranking: [], ...o });

test('t1 Tranquilo 6º, 5 batidas → 60', () => {
  const p = computePrize(res({ position: 6, hits: 5 }), t1, 'tranquilo', profile(), balance);
  assert.equal(p.total, 60);
  assert.equal(p.lines.length, 1);
  assert.equal(p.firstWin, false);
});

test('t1 Normal 1º, melhor volta, 1ª vitória → 200/30/20/100 + 50 = 400', () => {
  const p = computePrize(res({ playerBestLapOfRace: true }), t1, 'normal', profile(), balance);
  assert.deepEqual(p.lines.map((l) => l.amount), [200, 30, 20, 100, 50]);
  assert.equal(p.total, 400);
  assert.equal(p.firstWin, true);
});

test('segunda vitória não paga 1ª vitória', () => {
  const r = res();
  let pr = profile();
  const first = computePrize(r, t1, 'tranquilo', pr, balance);
  pr = applyRaceResult(pr, r, first, 1);
  const second = computePrize(r, t1, 'tranquilo', pr, balance);
  assert.equal(first.total, 320);
  assert.equal(second.total, 220);
  assert.equal(second.firstWin, false);
});

test('applyRaceResult atualiza dinheiro, recordes e totais sem mutar', () => {
  const p0 = profile();
  const r1 = res({ position: 3, bestLapMs: 31000, totalTimeMs: 95000 });
  const p1 = applyRaceResult(p0, r1, { lines: [], total: 110, firstWin: false }, 1);
  assert.equal(p0.money, 0);
  assert.equal(p1.money, 110);
  assert.equal(p1.totals.races, 1);
  assert.equal(p1.totals.moneyEarned, 110);
  assert.deepEqual(p1.tracks.t1, { races: 1, wins: 0, bestPos: 3, bestLapMs: 31000, bestTimeMs: 95000, firstWinPaid: false });
  const p2 = applyRaceResult(p1, res({ bestLapMs: 32000, totalTimeMs: 90000 }), { lines: [], total: 0, firstWin: true }, 2);
  assert.equal(p2.tracks.t1.bestPos, 1);
  assert.equal(p2.tracks.t1.bestLapMs, 31000);
  assert.equal(p2.tracks.t1.bestTimeMs, 90000);
  assert.equal(p2.tracks.t1.firstWinPaid, true);
  assert.equal(p2.totals.wins, 1);
});
