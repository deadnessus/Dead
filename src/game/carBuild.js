import { carLevel, restorationProgress } from './carLevel.js';

const STAT_KEYS = ['acc', 'vel', 'ade', 'frn', 'dir'];

/**
 * Deriva o CarBuild do perfil (nunca salvo).
 * @param {Object} profile
 * @param {Object} data GameData (usa car)
 * @param {ReturnType<import('./partsCatalog.js').createCatalog>} catalog
 * @returns {import('../../docs/arquitetura/03-contratos.md').CarBuild}
 */
export function computeCarBuild(profile, data, catalog) {
  const stats = { ...data.car.baseStats };
  const flags = { ...data.car.flagsDefault };
  const out = {};
  for (const slot of [...catalog.slotsByCategory('restauracao'), ...catalog.slotsByCategory('desempenho')]) {
    const tier = catalog.partById(profile.installed[slot.id])?.tier ?? 0;
    for (const p of catalog.partsBySlot(slot.id)) {
      if (p.tier > tier) break;
      for (const k of STAT_KEYS) stats[k] += p.stats[k] ?? 0;
      Object.assign(flags, p.flags);
      for (const f of ['engineProfile', 'gears', 'exhaust', 'induction']) {
        if (p[f] !== undefined) out[f] = p[f];
      }
    }
  }
  for (const k of STAT_KEYS) stats[k] = Math.min(100, Math.max(0, stats[k]));
  const { done, total } = restorationProgress(profile, catalog);
  return {
    stats,
    level: carLevel(stats),
    flags,
    engineProfile: out.engineProfile,
    gears: out.gears,
    exhaust: out.exhaust,
    induction: out.induction,
    restorationDone: done,
    restorationTotal: total,
  };
}
