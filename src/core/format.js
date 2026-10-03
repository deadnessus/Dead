/**
 * Formats money with dot as thousands separator
 * @param {number} n
 * @returns {string}
 */
export function formatMoney(n) {
  const str = Math.round(n).toString();
  const parts = [];
  for (let i = str.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) parts.unshift('.');
    parts.unshift(str[i]);
  }
  return '$ ' + parts.join('');
}

/**
 * Formats time in milliseconds as "M:SS.ms"
 * @param {number} ms
 * @returns {string}
 */
export function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  return `${minutes}:${String(secs).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

/**
 * Ordinal number in Portuguese (masculine)
 * @param {number} n
 * @returns {string}
 */
export function ordinal(n) {
  return `${n}º`;
}

/**
 * Formats speed in km/h
 * @param {number} speed
 * @param {number} kmhPerUnit
 * @returns {string}
 */
export function formatKmh(speed, kmhPerUnit) {
  return String(Math.round(speed * kmhPerUnit));
}
