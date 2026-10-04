/** @typedef {{label:string, amount:number}} PrizeLine */
/** @typedef {{lines:PrizeLine[], total:number, firstWin:boolean}} PrizeBreakdown */

// Rótulos pt-BR das linhas do prêmio (src/ui/strings.js ainda não existe; migrar na T12a).
const LABEL = {
  chegada: (pos) => `Chegada ${pos}º`,
  melhorVolta: 'Melhor volta',
  limpa: 'Corrida limpa',
  primeiraVitoria: 'Primeira vitória!',
  bonus: (dif) => `Bônus ${dif}`,
};

/**
 * Calcula o prêmio da corrida (08 §8.1).
 * @param {Object} result RaceResult
 * @param {Object} track entrada de tracks.json
 * @param {string} difficultyId chave de balance.difficulty.levels
 * @param {Object} profile
 * @param {Object} balance conteúdo de data/balance.json
 * @returns {PrizeBreakdown}
 */
export function computePrize(result, track, difficultyId, profile, balance) {
  const eco = balance.economy;
  const level = balance.difficulty.levels[difficultyId];
  const P = track.prize;
  const r = (x) => Math.round(x / eco.roundTo) * eco.roundTo;
  const pos = result.position;
  const firstWin = pos === 1 && !profile.tracks[track.id]?.firstWinPaid;
  const lines = [];
  const add = (label, amount) => { if (amount > 0) lines.push({ label, amount }); };
  add(LABEL.chegada(pos), r(P * eco.positionPayout[pos - 1]));
  if (result.playerBestLapOfRace) add(LABEL.melhorVolta, r(P * eco.bestLapBonus));
  if (result.hits <= eco.cleanRaceMaxHits) add(LABEL.limpa, r(P * eco.cleanRaceBonus));
  if (firstWin) add(LABEL.primeiraVitoria, r(P * eco.firstWinBonus));
  const sum = lines.reduce((s, l) => s + l.amount, 0);
  add(LABEL.bonus(level.label), r(sum * (level.prizeMul - 1)));
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0), firstWin };
}

/**
 * Aplica o resultado da corrida ao perfil (dinheiro, recordes, totais). Não altera o original.
 * @param {Object} profile
 * @param {Object} result RaceResult
 * @param {PrizeBreakdown} prize
 * @param {number} nowMs (reservado; o schema não guarda data)
 * @returns {Object} novo perfil
 */
export function applyRaceResult(profile, result, prize, nowMs) {
  const old = profile.tracks[result.trackId] ?? {
    races: 0, wins: 0, bestPos: null, bestLapMs: null, bestTimeMs: null, firstWinPaid: false,
  };
  const best = (a, b) => (a == null || b < a ? b : a);
  const won = result.position === 1;
  const track = {
    ...old,
    races: old.races + 1,
    wins: old.wins + (won ? 1 : 0),
    bestPos: best(old.bestPos, result.position),
    bestLapMs: best(old.bestLapMs, result.bestLapMs),
    bestTimeMs: best(old.bestTimeMs, result.totalTimeMs),
    firstWinPaid: old.firstWinPaid || won,
  };
  return {
    ...profile,
    money: profile.money + prize.total,
    tracks: { ...profile.tracks, [result.trackId]: track },
    totals: {
      ...profile.totals,
      races: profile.totals.races + 1,
      wins: profile.totals.wins + (won ? 1 : 0),
      moneyEarned: profile.totals.moneyEarned + prize.total,
    },
  };
}
