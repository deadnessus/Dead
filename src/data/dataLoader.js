// Carrega e valida os 6 JSON de /data (docs/arquitetura/03-contratos.md).
import { validateGameData } from './validate.js';

const FILES = ['car', 'parts', 'tracks', 'opponents', 'themes', 'balance'];

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar ${url}: HTTP ${res.status}`);
  return res.json();
}

/**
 * Carrega os JSON de dados e o manifesto, valida e devolve tudo congelado.
 * @param {string} [baseUrl='./data/'] pasta dos JSON; o manifesto fica em baseUrl + '../assets/manifest.json'
 * @returns {Promise<Object>} GameData (car, parts, tracks, opponents, themes, balance)
 * @throws {Error} se algum JSON falhar ou validateGameData devolver erros
 */
export async function loadGameData(baseUrl = './data/') {
  const [manifest, ...loaded] = await Promise.all([
    fetchJSON(`${baseUrl}../assets/manifest.json`),
    ...FILES.map((f) => fetchJSON(`${baseUrl}${f}.json`)),
  ]);
  const data = {};
  FILES.forEach((f, i) => { data[f] = loaded[i]; });
  const errors = validateGameData(data, manifest);
  if (errors.length) throw new Error('Dados inválidos:\n' + errors.join('\n'));
  return deepFreeze(data);
}
