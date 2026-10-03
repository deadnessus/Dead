import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { clamp, lerp, wrapAngle, angleDiff, approach, expSmooth } from '../src/core/math.js';

test('clamp', () => {
  assert.strictEqual(clamp(5, 0, 10), 5);
  assert.strictEqual(clamp(-5, 0, 10), 0);
  assert.strictEqual(clamp(15, 0, 10), 10);
});

test('lerp', () => {
  assert.strictEqual(lerp(0, 10, 0.5), 5);
  assert.strictEqual(lerp(0, 10, 0), 0);
  assert.strictEqual(lerp(0, 10, 1), 10);
});

test('wrapAngle', () => {
  assert.strictEqual(wrapAngle(0), 0);
  assert.strictEqual(wrapAngle(Math.PI), Math.PI);
  const wrapped = wrapAngle(4 * Math.PI);
  assert(Math.abs(wrapped) < 0.0001);
});

test('angleDiff', () => {
  const diff = angleDiff(3.1, -3.1);
  assert(Math.abs(diff - 0.0832) < 0.001);
});

test('approach', () => {
  assert.strictEqual(approach(0, 10, 5), 5);
  assert.strictEqual(approach(0, 10, 20), 10);
  assert.strictEqual(approach(10, 0, 5), 5);
});

test('expSmooth', () => {
  const result = expSmooth(0, 10, 1, 0.5);
  assert(result > 0 && result < 10);
});
