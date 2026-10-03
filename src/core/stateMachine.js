/**
 * @typedef {{name:string, enter(params?:object):void, exit():void, update(dt:number):void, render(alpha:number):void}} GameState
 * @typedef {{register(state:GameState):void, change(name:string, params?:object):void, get current():GameState|null, update(dt:number):void, render(alpha:number):void}} StateMachine
 */

/**
 * Cria uma máquina de estados com suporte a eventos e adiamento de transições.
 * @param {any} bus - barramento de eventos
 * @returns {StateMachine}
 */
export function createStateMachine(bus) {
  const states = new Map();
  let current = null;
  let updating = false;
  const pendingChanges = [];

  function register(state) {
    states.set(state.name, state);
  }

  function change(name, params) {
    if (updating) {
      pendingChanges.push({ name, params });
      return;
    }

    applyChange(name, params);
  }

  function applyChange(name, params) {
    const nextState = states.get(name);
    if (!nextState) {
      throw new Error(`Estado '${name}' não registrado`);
    }

    const fromName = current ? current.name : null;

    if (current) {
      current.exit();
    }

    current = nextState;
    current.enter(params);

    bus.emit('state:changed', { from: fromName, to: name });
  }

  function update(dt) {
    updating = true;
    if (current) {
      current.update(dt);
    }
    updating = false;

    while (pendingChanges.length > 0) {
      const { name, params } = pendingChanges.shift();
      applyChange(name, params);
    }
  }

  function render(alpha) {
    if (current) {
      current.render(alpha);
    }
  }

  return {
    register,
    change,
    get current() {
      return current;
    },
    update,
    render
  };
}
