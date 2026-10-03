/**
 * @typedef {{on(name:string, fn:Function):Function, emit(name:string, payload?:any):void, clear():void}} EventBus
 */

/**
 * Cria um barramento de eventos para desacoplamento entre módulos.
 * @returns {EventBus}
 */
export function createEventBus() {
  const listeners = new Map();

  function on(name, fn) {
    if (!listeners.has(name)) {
      listeners.set(name, []);
    }
    listeners.get(name).push(fn);

    return () => {
      const list = listeners.get(name);
      const index = list.indexOf(fn);
      if (index >= 0) {
        list.splice(index, 1);
      }
    };
  }

  function emit(name, payload) {
    const list = listeners.get(name);
    if (list) {
      for (let i = 0; i < list.length; i++) {
        list[i](payload);
      }
    }
  }

  function clear() {
    listeners.clear();
  }

  return { on, emit, clear };
}
