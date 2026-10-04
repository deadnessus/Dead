/**
 * Catálogo de peças: índices e regra de requisito.
 * @param {Object} partsJson conteúdo de data/parts.json
 */
export function createCatalog(partsJson) {
  const parts = new Map();
  const slots = new Map();
  const bySlot = new Map();
  for (const s of partsJson.slots) {
    slots.set(s.id, s);
    bySlot.set(s.id, []);
  }
  for (const p of partsJson.parts) {
    parts.set(p.id, p);
    bySlot.get(p.slot).push(p);
  }
  for (const list of bySlot.values()) list.sort((a, b) => a.tier - b.tier);

  /** @param {string} id */
  const partById = (id) => parts.get(id);
  /** @param {string} id */
  const slotById = (id) => slots.get(id);
  /** @param {string} slotId */
  const partsBySlot = (slotId) => bySlot.get(slotId) ?? [];
  /** @param {string} slotId */
  const stockPartId = (slotId) => partsBySlot(slotId)[0]?.id;
  /** @param {string} slotId */
  const maxTier = (slotId) => {
    const list = partsBySlot(slotId);
    return list.length ? list[list.length - 1].tier : 0;
  };
  /** @param {string} cat */
  const slotsByCategory = (cat) => partsJson.slots.filter((s) => s.category === cat);

  /**
   * Requisito satisfeito: desempenho/restauração → tier instalado >= tier; estética → possuída.
   * @param {Object} profile
   * @param {string} reqPartId
   */
  const isRequirementMet = (profile, reqPartId) => {
    const req = parts.get(reqPartId);
    if (!req) return false;
    if (slots.get(req.slot).category === 'estetica') return profile.owned.includes(reqPartId);
    const inst = parts.get(profile.installed[req.slot]);
    return !!inst && inst.tier >= req.tier;
  };

  return { partById, slotById, partsBySlot, stockPartId, maxTier, slotsByCategory, isRequirementMet };
}
