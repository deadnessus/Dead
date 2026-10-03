import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { formatMoney, formatTime, ordinal, formatKmh } from '../src/core/format.js';

test('formatMoney', () => {
  assert.strictEqual(formatMoney(1250), '$ 1.250');
  assert.strictEqual(formatMoney(0), '$ 0');
  assert.strictEqual(formatMoney(1234567), '$ 1.234.567');
  assert.strictEqual(formatMoney(100), '$ 100');
  assert.strictEqual(formatMoney(1000), '$ 1.000');
});

test('formatTime', () => {
  assert.strictEqual(formatTime(65320), '1:05.32');
  assert.strictEqual(formatTime(1000), '0:01.00');
  assert.strictEqual(formatTime(60000), '1:00.00');
  assert.strictEqual(formatTime(125999), '2:05.99');
});

test('ordinal', () => {
  assert.strictEqual(ordinal(1), '1º');
  assert.strictEqual(ordinal(2), '2º');
  assert.strictEqual(ordinal(3), '3º');
  assert.strictEqual(ordinal(10), '10º');
  assert.strictEqual(ordinal(100), '100º');
});

test('formatKmh', () => {
  assert.strictEqual(formatKmh(100, 0.5), '50');
  assert.strictEqual(formatKmh(126, 1), '126');
  assert.strictEqual(formatKmh(99.5, 1), '100');
});
