/** @typedef {{getItem(k:string):string|null, setItem(k:string,v:string):void, removeItem(k:string):void}} StorageBackend */

/**
 * Envolve window.localStorage com try/catch (modo privado). Se o storage não existir, age como vazio.
 * @returns {StorageBackend}
 */
export function createLocalStorageBackend() {
  /** @returns {Storage|null} */
  const ls = () => {
    try { return globalThis.localStorage ?? null; } catch { return null; }
  };
  return {
    getItem(k) { try { return ls()?.getItem(k) ?? null; } catch { return null; } },
    setItem(k, v) { ls()?.setItem(k, v); },
    removeItem(k) { try { ls()?.removeItem(k); } catch { /* ignora */ } },
  };
}

/**
 * Backend em memória (testes). `writes` conta chamadas a setItem; `writeLog` guarda as chaves gravadas.
 * @param {Record<string,string>} [initial]
 * @returns {StorageBackend & {writes:number, writeLog:string[], data:Map<string,string>}}
 */
export function createMemoryBackend(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    writes: 0,
    writeLog: [],
    getItem(k) { return data.has(k) ? data.get(k) : null; },
    setItem(k, v) { this.writes++; this.writeLog.push(k); data.set(k, String(v)); },
    removeItem(k) { data.delete(k); },
  };
}
