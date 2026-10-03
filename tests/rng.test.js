import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createRng } from '../src/core/rng.js';

test('createRng same seed produces same sequence', () => {
  const rng1 = createRng(42);
  const rng2 = createRng(42);

  for (let i = 0; i < 100; i++) {
    assert.strictEqual(rng1.next(), rng2.next());
  }
});

test('next returns value in [0,1)', () => {
  const rng = createRng(123);
  for (let i = 0; i < 1000; i++) {
    const val = rng.next();
    assert(val >= 0 && val < 1, `Value ${val} not in [0,1)`);
  }
});

test('range returns value in [a,b)', () => {
  const rng = createRng(456);
  for (let i = 0; i < 100; i++) {
    const val = rng.range(10, 20);
    assert(val >= 10 && val < 20);
  }
});

test('int returns integer in [a,b)', () => {
  const rng = createRng(789);
  for (let i = 0; i < 100; i++) {
    const val = rng.int(5, 15);
    assert(Number.isInteger(val));
    assert(val >= 5 && val < 15);
  }
});

test('pick returns element from array', () => {
  const rng = createRng(999);
  const arr = [1, 2, 3, 4, 5];
  for (let i = 0; i < 100; i++) {
    const val = rng.pick(arr);
    assert(arr.includes(val));
  }
});
