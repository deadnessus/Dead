/**
 * Nível do carro = média arredondada dos 5 stats.
 * @param {{acc:number, vel:number, ade:number, frn:number, dir:number}} stats
 * @returns {number}
 */
export function carLevel(stats) {
  return Math.round((stats.acc + stats.vel + stats.ade + stats.frn + stats.dir) / 5);
}

/**
 * Peças de restauração instaladas (soma dos tiers) e total possível.
 * @param {Object} profile
 * @param {ReturnType<import('./partsCatalog.js').createCatalog>} catalog
 * @returns {{done:number, total:number}}
 */
export function restorationProgress(profile, catalog) {
  let done = 0;
  let total = 0;
  for (const slot of catalog.slotsByCategory('restauracao')) {
    total += catalog.maxTier(slot.id);
    done += catalog.partById(profile.installed[slot.id])?.tier ?? 0;
  }
  return { done, total };
}

/**
 * @param {Object} profile
 * @param {ReturnType<import('./partsCatalog.js').createCatalog>} catalog
 * @returns {boolean}
 */
export function isFullyRestored(profile, catalog) {
  const { done, total } = restorationProgress(profile, catalog);
  return done >= total;
}
