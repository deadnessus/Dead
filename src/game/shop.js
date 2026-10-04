/** @typedef {'ok'|'sem_dinheiro'|'requisito'|'ja_tem'|'fora_de_ordem'|'estetica_bloqueada'} BuyCheck */

/** @param {Object} catalog @param {Object} part */
const categoryOf = (catalog, part) => catalog.slotById(part.slot).category;

/**
 * Verifica se a peça pode ser comprada agora.
 * @param {Object} profile
 * @param {string} partId
 * @param {Object} data GameData (usa car.customUnlockRequires)
 * @param {ReturnType<import('./partsCatalog.js').createCatalog>} catalog
 * @returns {{result: BuyCheck, missing?: string[]}}
 */
export function canBuy(profile, partId, data, catalog) {
  const part = catalog.partById(partId);
  if (!part) throw new Error(`peca_desconhecida:${partId}`);
  const estetica = categoryOf(catalog, part) === 'estetica';
  if (estetica) {
    if (profile.owned.includes(partId)) return { result: 'ja_tem' };
    if (!data.car.customUnlockRequires.every((r) => catalog.isRequirementMet(profile, r))) {
      return { result: 'estetica_bloqueada' };
    }
  } else {
    const installedTier = catalog.partById(profile.installed[part.slot])?.tier ?? 0;
    if (part.tier <= installedTier) return { result: 'ja_tem' };
    if (part.tier !== installedTier + 1) return { result: 'fora_de_ordem' };
  }
  const missing = part.requires.filter((r) => !catalog.isRequirementMet(profile, r));
  if (missing.length) return { result: 'requisito', missing };
  if (profile.money < part.price) return { result: 'sem_dinheiro' };
  return { result: 'ok' };
}

/**
 * Compra a peça (instala ou adquire+equipa). Não altera o perfil recebido.
 * @param {Object} profile
 * @param {string} partId
 * @param {Object} data
 * @param {ReturnType<import('./partsCatalog.js').createCatalog>} catalog
 * @returns {{profile: Object, part: Object}}
 * @throws {Error} se canBuy != 'ok'
 */
export function buy(profile, partId, data, catalog) {
  const check = canBuy(profile, partId, data, catalog);
  if (check.result !== 'ok') throw new Error(`compra_invalida:${check.result}`);
  const part = catalog.partById(partId);
  const next = {
    ...profile,
    money: profile.money - part.price,
    totals: { ...profile.totals, moneySpent: profile.totals.moneySpent + part.price },
  };
  if (categoryOf(catalog, part) === 'estetica') {
    next.owned = [...profile.owned, partId];
    next.equipped = { ...profile.equipped, [part.slot]: partId };
  } else {
    next.installed = { ...profile.installed, [part.slot]: partId };
  }
  return { profile: next, part };
}

/**
 * Equipa uma peça estética já possuída.
 * @param {Object} profile
 * @param {string} partId
 * @param {ReturnType<import('./partsCatalog.js').createCatalog>} catalog
 * @returns {Object} novo perfil
 * @throws {Error} se a peça não for estética possuída
 */
export function equip(profile, partId, catalog) {
  const part = catalog.partById(partId);
  if (!part || categoryOf(catalog, part) !== 'estetica' || !profile.owned.includes(partId)) {
    throw new Error(`equipar_invalido:${partId}`);
  }
  return { ...profile, equipped: { ...profile.equipped, [part.slot]: partId } };
}

/**
 * Remove o item estético equipado no slot.
 * @param {Object} profile
 * @param {string} slotId
 * @returns {Object} novo perfil
 */
export function unequip(profile, slotId) {
  return { ...profile, equipped: { ...profile.equipped, [slotId]: null } };
}
