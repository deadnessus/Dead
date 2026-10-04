// Validação cruzada dos dados do jogo (docs/arquitetura/10-plano.md T05). Módulo puro.

const STAT_KEYS = ['acc', 'vel', 'ade', 'frn', 'dir'];
const TIERED = ['restauracao', 'desempenho'];

function dupes(list, path, errs) {
  const seen = new Set();
  list.forEach((x, i) => {
    if (seen.has(x.id)) errs.push(`${path}[${i}].id: '${x.id}' duplicado`);
    seen.add(x.id);
  });
  return seen;
}

function validateSlotsAndParts(data, has, errs) {
  const { parts, car } = data;
  const slotIds = dupes(parts.slots, 'parts.slots', errs);
  const partIds = dupes(parts.parts, 'parts.parts', errs);
  const layers = new Set(car.layers.map((l) => l.id));
  const catOf = {};
  parts.slots.forEach((s, i) => {
    catOf[s.id] = s.category;
    if (!has(s.icon)) errs.push(`parts.slots[${i}].icon: '${s.icon}' não existe no manifesto`);
  });
  const tiers = {};
  parts.parts.forEach((p, i) => {
    const at = `parts.parts[${i}]`;
    if (!slotIds.has(p.slot)) errs.push(`${at}.slot: '${p.slot}' não existe`);
    (tiers[p.slot] ||= []).push(p);
    (p.requires || []).forEach((r, j) => {
      if (!partIds.has(r)) errs.push(`${at}.requires[${j}]: '${r}' não existe`);
    });
    Object.keys(p.stats || {}).forEach((k) => {
      if (!STAT_KEYS.includes(k)) errs.push(`${at}.stats.${k}: chave inválida`);
    });
    (p.visual || []).forEach((v, j) => {
      const vp = `${at}.visual[${j}]`;
      if (!layers.has(v.layer)) errs.push(`${vp}.layer: '${v.layer}' não existe em car.layers`);
      else checkVariant(v.layer, v.variant, vp + '.variant', has, errs);
    });
    if (p.slot === 'motor') {
      for (const s of ['low', 'high']) {
        const id = `eng.${p.engineProfile}.${s}`;
        if (!p.engineProfile) { errs.push(`${at}.engineProfile: ausente no motor`); break; }
        if (!has(id)) errs.push(`${at}.engineProfile: '${id}' não existe no manifesto`);
      }
    }
  });
  validateTiers(tiers, catOf, errs);
}

function checkVariant(layer, variant, path, has, errs) {
  if (variant === null || variant === undefined) return;
  for (const view of ['rear', 'side']) {
    const id = `car.${view}.${layer}.${variant}`;
    if (!has(id)) errs.push(`${path}: '${id}' não existe no manifesto`);
  }
}

function validateTiers(tiers, catOf, errs) {
  for (const [slot, list] of Object.entries(tiers)) {
    const cat = catOf[slot];
    const at = `parts[slot=${slot}]`;
    if (TIERED.includes(cat)) {
      const ts = list.map((p) => p.tier).sort((a, b) => a - b);
      if (!ts.every((t, i) => t === i)) errs.push(`${at}.tier: tiers não contíguos a partir de 0 (${ts.join(',')})`);
      const t0 = list.find((p) => p.tier === 0);
      if (!t0) errs.push(`${at}.tier: falta o tier 0`);
      else if (t0.price !== 0) errs.push(`${at}.${t0.id}.price: tier 0 deve custar 0`);
    } else if (cat === 'estetica') {
      list.forEach((p) => {
        if (p.tier !== 1) errs.push(`${at}.${p.id}.tier: estética deve ser tier 1`);
      });
    }
  }
}

function validateCar(data, has, errs) {
  const { car, parts } = data;
  const partIds = new Set(parts.parts.map((p) => p.id));
  car.layers.forEach((l, i) => {
    checkVariant(l.id, l.default, `car.layers[${i}].default`, has, errs);
  });
  (car.customUnlockRequires || []).forEach((r, i) => {
    if (!partIds.has(r)) errs.push(`car.customUnlockRequires[${i}]: '${r}' não existe`);
  });
}

function validateThemes(data, has, errs) {
  const imgs = data.assets;
  for (const [tid, th] of Object.entries(data.themes.themes)) {
    Object.entries(th.bg || {}).forEach(([k, id]) => {
      if (!has(id)) errs.push(`themes.themes.${tid}.bg.${k}: '${id}' não existe no manifesto`);
    });
    (th.decor || []).forEach((id, i) => {
      const at = `themes.themes.${tid}.decor[${i}]`;
      const a = imgs[id];
      if (!a) return errs.push(`${at}: '${id}' não existe no manifesto`);
      if (a.kind !== 'billboard') errs.push(`${at}: '${id}' deve ser kind 'billboard'`);
      if (a.worldW === undefined) errs.push(`${at}: '${id}' sem worldW`);
      if (a.solid === undefined) errs.push(`${at}: '${id}' sem solid`);
    });
  }
}

function validateTracks(data, has, errs) {
  const { tracks, opponents, themes } = data;
  const oppIds = dupes(opponents.opponents, 'opponents.opponents', errs);
  opponents.opponents.forEach((o, i) => {
    if (!has(`opp.${o.id}.rear`)) errs.push(`opponents.opponents[${i}]: 'opp.${o.id}.rear' não existe no manifesto`);
  });
  dupes(tracks.tracks, 'tracks.tracks', errs);
  tracks.tracks.forEach((t, i) => {
    const at = `tracks.tracks[${i}]`;
    if (!themes.themes[t.theme]) errs.push(`${at}.theme: '${t.theme}' não existe em themes.json`);
    if (!Array.isArray(t.opponents) || t.opponents.length !== 5) errs.push(`${at}.opponents: deve ter 5 oponentes`);
    (t.opponents || []).forEach((o, j) => {
      if (!oppIds.has(o)) errs.push(`${at}.opponents[${j}]: '${o}' não existe`);
    });
    let n = 0, hill = 0, turn = 0;
    for (const s of t.sections) {
      const sum = s.n[0] + s.n[1] + s.n[2];
      n += sum;
      hill += s.hill;
      turn += s.curve * (s.n[0] / 3 + s.n[1] + s.n[2] / 3);
    }
    if (n !== t.segments) errs.push(`${at}.segments: soma das seções (${n}) difere de ${t.segments}`);
    if (hill !== 0) errs.push(`${at}.sections: soma dos hill deve ser 0 (é ${hill})`);
    if (!(turn > 0)) errs.push(`${at}.sections: giro total deve ser para a direita (> 0; é ${turn})`);
  });
}

function validateBalance(data, errs) {
  const { difficulty, race, economy } = data.balance;
  if (!difficulty || !difficulty.levels || !difficulty.levels[difficulty.default]) {
    errs.push(`balance.difficulty.default: '${difficulty && difficulty.default}' não existe em difficulty.levels`);
  }
  if (!Array.isArray(economy.positionPayout) || economy.positionPayout.length !== race.carsPerRace) {
    errs.push(`balance.economy.positionPayout: tamanho deve ser race.carsPerRace (${race.carsPerRace})`);
  }
}

/**
 * Valida referências cruzadas e invariantes dos dados.
 * @param {Object} data GameData (car, parts, tracks, opponents, themes, balance)
 * @param {Object} assetManifest conteúdo de assets/manifest.json
 * @returns {string[]} erros legíveis; vazio = ok
 */
export function validateGameData(data, assetManifest) {
  const errs = [];
  const images = assetManifest.images || {};
  const audio = assetManifest.audio || {};
  const has = (id) => id in images || id in audio;
  const d = { ...data, assets: images };
  validateSlotsAndParts(d, has, errs);
  validateCar(d, has, errs);
  validateThemes(d, has, errs);
  validateTracks(d, has, errs);
  validateBalance(d, errs);
  return errs;
}
