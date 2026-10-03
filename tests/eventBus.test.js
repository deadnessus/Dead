import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createEventBus } from '../src/core/eventBus.js';

test('on devolve função que remove o ouvinte', () => {
  const bus = createEventBus();
  const calls = [];

  const off = bus.on('test', (payload) => {
    calls.push(payload);
  });

  bus.emit('test', 1);
  assert.deepEqual(calls, [1]);

  off();

  bus.emit('test', 2);
  assert.deepEqual(calls, [1]);
});

test('emit sem ouvintes não falha', () => {
  const bus = createEventBus();
  assert.doesNotThrow(() => {
    bus.emit('inexistente');
    bus.emit('inexistente', { data: 'test' });
  });
});

test('múltiplos listeners são executados em ordem', () => {
  const bus = createEventBus();
  const calls = [];

  bus.on('test', () => calls.push(1));
  bus.on('test', () => calls.push(2));
  bus.on('test', () => calls.push(3));

  bus.emit('test');
  assert.deepEqual(calls, [1, 2, 3]);
});

test('clear remove todos os listeners', () => {
  const bus = createEventBus();
  const calls = [];

  bus.on('test', () => calls.push(1));
  bus.on('test', () => calls.push(2));

  bus.emit('test');
  assert.deepEqual(calls, [1, 2]);

  bus.clear();

  calls.length = 0;
  bus.emit('test');
  assert.deepEqual(calls, []);
});

test('remove listener específico não afeta outros', () => {
  const bus = createEventBus();
  const calls = [];

  const off1 = bus.on('test', () => calls.push(1));
  bus.on('test', () => calls.push(2));
  const off3 = bus.on('test', () => calls.push(3));

  bus.emit('test');
  assert.deepEqual(calls, [1, 2, 3]);

  calls.length = 0;
  off1();
  bus.emit('test');
  assert.deepEqual(calls, [2, 3]);

  calls.length = 0;
  off3();
  bus.emit('test');
  assert.deepEqual(calls, [2]);
});

test('payload é passado corretamente', () => {
  const bus = createEventBus();
  let received = null;

  bus.on('test', (payload) => {
    received = payload;
  });

  const obj = { x: 42 };
  bus.emit('test', obj);

  assert.strictEqual(received, obj);
});
