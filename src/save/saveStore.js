import { createDefaultSave, createDefaultProfile, isValidSave, normalizeSave } from './saveSchema.js';
import { migrate } from './migrations.js';

const APP = 'mustang68';

/**
 * Cria o store de save. `partsJson` (data/parts.json) é obrigatório; `balanceJson` (opcional) valida a dificuldade.
 * @param {import('./storageBackend.js').StorageBackend} backend
 * @param {{key?:string, now?:()=>number, debounceMs?:number, partsJson:any, balanceJson?:any, onWarn?:(msg:string)=>void}} opts
 */
export function createSaveStore(backend, { key = 'mustang68.save', now = Date.now, debounceMs = 300, partsJson, balanceJson, onWarn = (m) => console.warn(m) } = {}) {
  const difficultyIds = balanceJson ? Object.keys(balanceJson.difficulty.levels) : undefined;
  let state = createDefaultSave(now(), partsJson);
  let locked = false; // save de versão futura: nunca sobrescrever
  let timer = null;

  /** @returns {{save:any, migrated:boolean}|null} null se ausente/inválido; lança 'schema_futuro' */
  function read(k) {
    const text = backend.getItem(k);
    if (text == null) return null;
    let raw;
    try { raw = JSON.parse(text); } catch { return null; }
    let res;
    try { res = migrate(raw); } catch (e) {
      if (e.message === 'schema_futuro') throw e;
      return null;
    }
    if (!isValidSave(res.save)) return null;
    return { save: normalizeSave(res.save, partsJson, difficultyIds), migrated: res.migrated };
  }

  function flush() {
    if (timer != null) { clearTimeout(timer); timer = null; }
    if (locked) return false;
    try {
      const prev = backend.getItem(key);
      if (prev != null) {
        let ok = true;
        try { JSON.parse(prev); } catch { ok = false; } // não troca um .bak bom por lixo
        if (ok) backend.setItem(key + '.bak', prev);
      }
      backend.setItem(key, JSON.stringify(state));
      return true;
    } catch (e) {
      onWarn('save_falhou');
      return false;
    }
  }

  function schedule() {
    if (timer != null) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  }

  function touch(next) {
    state = { ...next, updatedAt: now() };
    schedule();
  }

  return {
    /** @returns {any} SaveData (lança Error('schema_futuro') sem sobrescrever nada) */
    load() {
      locked = false;
      let r;
      try {
        r = read(key);
        if (!r) {
          if (backend.getItem(key) != null) onWarn('save_corrompido');
          r = read(key + '.bak');
        }
      } catch (e) {
        locked = true;
        state = createDefaultSave(now(), partsJson);
        throw e;
      }
      if (r) {
        state = r.save;
        if (r.migrated) flush();
      } else {
        if (backend.getItem(key) != null) onWarn('save_descartado');
        state = createDefaultSave(now(), partsJson);
      }
      return state;
    },
    /** @returns {any} cópia rasa congelada */
    get() { return Object.freeze({ ...state }); },
    /** @param {'p1'|'p2'} id */
    getProfile(id) { return state.profiles[id]; },
    /** @param {'p1'|'p2'} id @param {(p:any)=>any} fn */
    updateProfile(id, fn) {
      const next = fn(structuredClone(state.profiles[id]));
      touch({ ...state, profiles: { ...state.profiles, [id]: next } });
    },
    /** @param {(s:any)=>any} fn */
    updateSettings(fn) { touch({ ...state, settings: fn(structuredClone(state.settings)) }); },
    flush,
    /** @param {'p1'|'p2'} id */
    resetProfile(id) {
      const fresh = createDefaultProfile(id, now(), partsJson);
      fresh.name = state.profiles[id].name;
      touch({ ...state, profiles: { ...state.profiles, [id]: fresh } });
    },
    /** @returns {string} */
    exportJSON() { return JSON.stringify({ app: APP, exportedAt: now(), save: state }); },
    /** @param {string} text @returns {{ok:true}|{ok:false, error:'json'|'app'|'schema_futuro'|'invalido'}} */
    importJSON(text) {
      let obj;
      try { obj = JSON.parse(text); } catch { return { ok: false, error: 'json' }; }
      if (!obj || typeof obj !== 'object' || obj.app !== APP) return { ok: false, error: 'app' };
      let res;
      try { res = migrate(obj.save); } catch (e) {
        return { ok: false, error: e.message === 'schema_futuro' ? 'schema_futuro' : 'invalido' };
      }
      if (!isValidSave(res.save)) return { ok: false, error: 'invalido' };
      state = normalizeSave(res.save, partsJson, difficultyIds);
      locked = false;
      flush();
      return { ok: true };
    },
  };
}
