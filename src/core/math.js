/**
 * @param {number} v
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Wraps angle to (-π, π]
 * @param {number} a
 * @returns {number}
 */
export function wrapAngle(a) {
  a = a % (2 * Math.PI);
  return a > Math.PI ? a - 2 * Math.PI : a <= -Math.PI ? a + 2 * Math.PI : a;
}

/**
 * Smallest signed difference in (-π, π]
 * @param {number} from
 * @param {number} to
 * @returns {number}
 */
export function angleDiff(from, to) {
  const diff = wrapAngle(to - from);
  return diff > Math.PI ? diff - 2 * Math.PI : diff <= -Math.PI ? diff + 2 * Math.PI : diff;
}

/**
 * @param {number} cur
 * @param {number} target
 * @param {number} maxDelta
 * @returns {number}
 */
export function approach(cur, target, maxDelta) {
  const diff = target - cur;
  if (Math.abs(diff) <= maxDelta) return target;
  return cur + (diff > 0 ? maxDelta : -maxDelta);
}

/**
 * cur + (target-cur)*(1-exp(-rate*dt))
 * @param {number} cur
 * @param {number} target
 * @param {number} rate
 * @param {number} dt
 * @returns {number}
 */
export function expSmooth(cur, target, rate, dt) {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}
