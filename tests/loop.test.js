import test from 'node:test';
import assert from 'node:assert/strict';
import { startLoop } from '../src/core/loop.js';
import { computeMetrics } from '../src/core/viewport.js';

function harness(opts) {
  let t = 0, cb = null, cancelled = 0;
  const calls = { u: 0, r: [] };
  const loop = startLoop({
    fixedDt: 0.01, maxSteps: 5,
    update: () => calls.u++, render: (a) => calls.r.push(a),
    now: () => t, request: (f) => { cb = f; return 1; }, cancel: () => { cancelled++; cb = null; },
  });
  return { loop, calls, tick(ms) { t += ms; const f = cb; cb = null; f && f(t); }, get cancelled() { return cancelled; } };
}

test('passo fixo e alpha', () => {
  const h = harness();
  h.tick(25);
  assert.equal(h.calls.u, 2);
  assert.ok(Math.abs(h.calls.r[0] - 0.5) < 1e-9);
});

test('maxSteps limita e descarta atraso', () => {
  const h = harness();
  h.tick(1000);
  assert.equal(h.calls.u, 5);
  assert.equal(h.calls.r[0], 0);
});

test('pause/resume/stop', () => {
  const h = harness();
  h.loop.pause();
  h.tick(100);
  assert.equal(h.calls.u, 0);
  h.loop.resume();
  h.tick(10);
  assert.equal(h.calls.u, 1);
  h.loop.stop();
  h.tick(10);
  assert.equal(h.calls.u, 1);
});

test('viewport: logicalW, DPR ≤ 2, retrato', () => {
  const a = computeMetrics(1024, 768, 3, 2);
  assert.equal(a.logicalW, 1024); assert.equal(a.dpr, 2); assert.equal(a.uiScale, 1); assert.equal(a.isPortrait, false);
  assert.equal(computeMetrics(1180, 820, 2, 2).logicalW, 1105);
  assert.equal(computeMetrics(1500, 768, 1, 2).logicalW, 1500);
  assert.equal(computeMetrics(768, 1024, 2, 2).isPortrait, true);
});
