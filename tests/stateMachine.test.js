import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createEventBus } from '../src/core/eventBus.js';
import { createStateMachine } from '../src/core/stateMachine.js';

test('ordem enter/exit é correta', () => {
  const bus = createEventBus();
  const machine = createStateMachine(bus);
  const calls = [];

  const state1 = {
    name: 'state1',
    enter: (params) => calls.push(`enter1:${params?.value || ''}`),
    exit: () => calls.push('exit1'),
    update: () => {},
    render: () => {}
  };

  const state2 = {
    name: 'state2',
    enter: (params) => calls.push(`enter2:${params?.value || ''}`),
    exit: () => calls.push('exit2'),
    update: () => {},
    render: () => {}
  };

  machine.register(state1);
  machine.register(state2);

  machine.change('state1', { value: 'a' });
  assert.deepEqual(calls, ['enter1:a']);

  calls.length = 0;
  machine.change('state2', { value: 'b' });
  assert.deepEqual(calls, ['exit1', 'enter2:b']);

  calls.length = 0;
  machine.change('state1');
  assert.deepEqual(calls, ['exit2', 'enter1:']);
});

test('state:changed emitido com {from,to}', () => {
  const bus = createEventBus();
  const machine = createStateMachine(bus);
  const events = [];

  bus.on('state:changed', (e) => {
    events.push({ from: e.from, to: e.to });
  });

  const state1 = {
    name: 'state1',
    enter: () => {},
    exit: () => {},
    update: () => {},
    render: () => {}
  };

  const state2 = {
    name: 'state2',
    enter: () => {},
    exit: () => {},
    update: () => {},
    render: () => {}
  };

  machine.register(state1);
  machine.register(state2);

  machine.change('state1');
  assert.deepEqual(events, [{ from: null, to: 'state1' }]);

  machine.change('state2');
  assert.deepEqual(events[1], { from: 'state1', to: 'state2' });
});

test('change() dentro de update() é adiado para o fim', () => {
  const bus = createEventBus();
  const machine = createStateMachine(bus);
  const calls = [];

  const state1 = {
    name: 'state1',
    enter: () => calls.push('enter1'),
    exit: () => calls.push('exit1'),
    update: () => {
      calls.push('update1-start');
      machine.change('state2');
      calls.push('update1-end');
    },
    render: () => {}
  };

  const state2 = {
    name: 'state2',
    enter: () => calls.push('enter2'),
    exit: () => calls.push('exit2'),
    update: () => calls.push('update2'),
    render: () => {}
  };

  machine.register(state1);
  machine.register(state2);

  machine.change('state1');
  calls.length = 0;

  machine.update(0.016);

  assert.deepEqual(calls, [
    'update1-start',
    'update1-end',
    'exit1',
    'enter2'
  ]);
});

test('current getter retorna null inicialmente', () => {
  const bus = createEventBus();
  const machine = createStateMachine(bus);

  assert.strictEqual(machine.current, null);
});

test('current getter retorna o estado atual', () => {
  const bus = createEventBus();
  const machine = createStateMachine(bus);

  const state1 = {
    name: 'state1',
    enter: () => {},
    exit: () => {},
    update: () => {},
    render: () => {}
  };

  machine.register(state1);
  machine.change('state1');

  assert.strictEqual(machine.current, state1);
});

test('update chama update() do estado atual', () => {
  const bus = createEventBus();
  const machine = createStateMachine(bus);
  let updateCalled = false;
  let dtValue = 0;

  const state = {
    name: 'test',
    enter: () => {},
    exit: () => {},
    update: (dt) => {
      updateCalled = true;
      dtValue = dt;
    },
    render: () => {}
  };

  machine.register(state);
  machine.change('test');

  machine.update(0.016);

  assert.strictEqual(updateCalled, true);
  assert.strictEqual(dtValue, 0.016);
});

test('render chama render() do estado atual', () => {
  const bus = createEventBus();
  const machine = createStateMachine(bus);
  let renderCalled = false;
  let alphaValue = 0;

  const state = {
    name: 'test',
    enter: () => {},
    exit: () => {},
    update: () => {},
    render: (alpha) => {
      renderCalled = true;
      alphaValue = alpha;
    }
  };

  machine.register(state);
  machine.change('test');

  machine.render(0.5);

  assert.strictEqual(renderCalled, true);
  assert.strictEqual(alphaValue, 0.5);
});

test('múltiplos change() aninhados são processados na ordem', () => {
  const bus = createEventBus();
  const machine = createStateMachine(bus);
  const calls = [];

  const state1 = {
    name: 'state1',
    enter: () => calls.push('enter1'),
    exit: () => calls.push('exit1'),
    update: () => {
      machine.change('state2');
      machine.change('state3');
    },
    render: () => {}
  };

  const state2 = {
    name: 'state2',
    enter: () => calls.push('enter2'),
    exit: () => calls.push('exit2'),
    update: () => {},
    render: () => {}
  };

  const state3 = {
    name: 'state3',
    enter: () => calls.push('enter3'),
    exit: () => calls.push('exit3'),
    update: () => {},
    render: () => {}
  };

  machine.register(state1);
  machine.register(state2);
  machine.register(state3);

  machine.change('state1');
  calls.length = 0;

  machine.update(0.016);

  assert.deepEqual(calls, [
    'exit1',
    'enter2',
    'exit2',
    'enter3'
  ]);
});
