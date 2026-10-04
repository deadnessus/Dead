import { computeCarBuild } from './carBuild.js';
import { isFullyRestored } from './carLevel.js';

/**
 * Ids das pistas desbloqueadas, na ordem de tracks.json.
 * @param {Object} profile
 * @param {Object} data GameData
 * @param {ReturnType<import('./partsCatalog.js').createCatalog>} catalog
 * @returns {string[]}
 */
export function unlockedTrackIds(profile, data, catalog) {
  const level = computeCarBuild(profile, data, catalog).level;
  const restored = isFullyRestored(profile, catalog);
  return data.tracks.tracks
    .filter((t) => level >= t.unlock.minCarLevel && (!t.unlock.requiresFullRestoration || restored))
    .map((t) => t.id);
}

/**
 * Pistas desbloqueadas que o jogador ainda não viu.
 * @returns {string[]}
 */
export function newlyUnlockedTrackIds(profile, data, catalog) {
  return unlockedTrackIds(profile, data, catalog).filter((id) => !profile.seenUnlocks.includes(id));
}

/**
 * Marca pistas como vistas.
 * @param {Object} profile
 * @param {string[]} ids
 * @returns {Object} novo perfil
 */
export function markUnlocksSeen(profile, ids) {
  return { ...profile, seenUnlocks: [...new Set([...profile.seenUnlocks, ...ids])] };
}

/**
 * A aba Estética está liberada?
 * @returns {boolean}
 */
export function isCustomUnlocked(profile, data, catalog) {
  return data.car.customUnlockRequires.every((r) => catalog.isRequirementMet(profile, r));
}
