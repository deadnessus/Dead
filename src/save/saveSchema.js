export const SCHEMA_VERSION = 1;

/** Valores válidos dos campos enumerados (04 §4.6). */
export const ASSISTS = ['desligada', 'media', 'forte'];
export const HELMETS = ['capacete_azul', 'capacete_vermelho', 'capacete_verde', 'capacete_amarelo'];
const PROFILE_DEFAULTS = {
  p1: { name: 'Piloto 1', helmet: 'capacete_azul' },
  p2: { name: 'Piloto 2', helmet: 'capacete_vermelho' },
};
const DEFAULT_DIFFICULTY = 'tranquilo';

/** @param {any} partsJson @param {string} category */
const slotsOf = (partsJson, category) => partsJson.slots.filter((s) => s.category === category).map((s) => s.id);

/**
 * @param {any} partsJson
 * @param {string} slotId
 * @returns {string} id da peça tier 0 do slot
 */
function stockId(partsJson, slotId) {
  return partsJson.parts.find((p) => p.slot === slotId && p.tier === 0)?.id;
}

/**
 * Perfil novo: 16 slots de restauração/desempenho no tier 0.
 * @param {'p1'|'p2'} slotId
 * @param {number} now
 * @param {any} partsJson conteúdo de data/parts.json
 * @returns {any} Profile
 */
export function createDefaultProfile(slotId, now, partsJson) {
  const installed = {};
  for (const s of partsJson.slots) if (s.category !== 'estetica') installed[s.id] = stockId(partsJson, s.id);
  const equipped = {};
  for (const id of slotsOf(partsJson, 'estetica')) equipped[id] = null;
  const d = PROFILE_DEFAULTS[slotId];
  return {
    id: slotId, name: d.name, helmet: d.helmet, createdAt: now, money: 0,
    difficulty: DEFAULT_DIFFICULTY, assist: 'forte', autoAccel: true,
    installed, owned: [], equipped, tracks: {}, seenUnlocks: ['t1'],
    totals: { races: 0, wins: 0, moneyEarned: 0, moneySpent: 0 }, tutorialDone: false,
  };
}

/**
 * Save novo com 2 perfis.
 * @param {number} now
 * @param {any} partsJson
 * @returns {any} SaveData
 */
export function createDefaultSave(now, partsJson) {
  return {
    schemaVersion: SCHEMA_VERSION, createdAt: now, updatedAt: now,
    settings: { muted: false, musicVolume: 0.6, sfxVolume: 0.9, lastProfileId: 'p1' },
    profiles: { p1: createDefaultProfile('p1', now, partsJson), p2: createDefaultProfile('p2', now, partsJson) },
  };
}

/**
 * Checagem estrutural mínima.
 * @param {any} s
 * @returns {boolean}
 */
export function isValidSave(s) {
  const o = (x) => x && typeof x === 'object' && !Array.isArray(x);
  return o(s) && Number.isInteger(s.schemaVersion) && o(s.settings) && o(s.profiles) && o(s.profiles.p1) && o(s.profiles.p2);
}

/** @param {any} v @param {number} dflt */
const num = (v, dflt) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : dflt);

/** Dinheiro devolvido por uma peça instalada que não existe mais no catálogo. */
function refundFor(partsJson, slotId, id) {
  const other = partsJson.parts.find((p) => p.id === id);
  if (other) return other.price; // existe, mas em outro slot
  const n = /_(\d+)$/.exec(String(id));
  if (!n) return 0;
  return partsJson.parts.filter((p) => p.slot === slotId && p.tier >= 1 && p.tier <= Number(n[1]))
    .reduce((sum, p) => sum + p.price, 0);
}

/**
 * Completa/corrige um perfil: slots ausentes → tier 0; peça inexistente → tier 0 + devolve dinheiro;
 * equipped não possuído → null.
 * @param {any} raw
 * @param {'p1'|'p2'} slotId
 * @param {any} partsJson
 * @param {string[]} [difficultyIds] chaves válidas de balance.difficulty.levels (sem lista, não valida)
 * @returns {any} Profile
 */
export function normalizeProfile(raw, slotId, partsJson, difficultyIds) {
  const p = { ...createDefaultProfile(slotId, raw?.createdAt ?? 0, partsJson), ...raw, id: slotId };
  const base = createDefaultProfile(slotId, p.createdAt, partsJson);
  p.money = num(p.money, 0);
  if (!HELMETS.includes(p.helmet)) p.helmet = base.helmet;
  if (!ASSISTS.includes(p.assist)) p.assist = base.assist;
  if (difficultyIds && !difficultyIds.includes(p.difficulty)) p.difficulty = base.difficulty;
  if (typeof p.name !== 'string' || !p.name) p.name = base.name;
  if (typeof p.autoAccel !== 'boolean') p.autoAccel = base.autoAccel;
  if (typeof p.tutorialDone !== 'boolean') p.tutorialDone = false;
  p.totals = { ...base.totals, ...(raw?.totals ?? {}) };
  p.tracks = raw?.tracks && typeof raw.tracks === 'object' ? raw.tracks : {};
  p.seenUnlocks = Array.isArray(raw?.seenUnlocks) ? raw.seenUnlocks : base.seenUnlocks;
  const inst = raw?.installed && typeof raw.installed === 'object' ? raw.installed : {};
  p.installed = {};
  for (const [slot, stock] of Object.entries(base.installed)) {
    const id = inst[slot];
    const part = partsJson.parts.find((x) => x.id === id);
    if (part && part.slot === slot) p.installed[slot] = id;
    else {
      p.installed[slot] = stock;
      if (id != null) p.money += refundFor(partsJson, slot, id);
    }
  }
  const known = new Set(partsJson.parts.map((x) => x.id));
  p.owned = (Array.isArray(raw?.owned) ? raw.owned : []).filter((id) => known.has(id));
  p.equipped = {};
  for (const slot of Object.keys(base.equipped)) {
    const id = raw?.equipped?.[slot];
    const part = partsJson.parts.find((x) => x.id === id);
    p.equipped[slot] = id != null && part?.slot === slot && p.owned.includes(id) ? id : null;
  }
  return p;
}

/**
 * Normaliza o save inteiro (depois da migração).
 * @param {any} save
 * @param {any} partsJson
 * @param {string[]} [difficultyIds]
 * @returns {any} SaveData
 */
export function normalizeSave(save, partsJson, difficultyIds) {
  const d = createDefaultSave(save.createdAt ?? 0, partsJson);
  return {
    ...save,
    createdAt: num(save.createdAt, 0), updatedAt: num(save.updatedAt, 0),
    settings: { ...d.settings, ...save.settings },
    profiles: {
      p1: normalizeProfile(save.profiles.p1, 'p1', partsJson, difficultyIds),
      p2: normalizeProfile(save.profiles.p2, 'p2', partsJson, difficultyIds),
    },
  };
}
