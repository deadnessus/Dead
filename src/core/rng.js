/**
 * mulberry32-based RNG
 * @param {number} seed
 * @returns {{next():number, range(a:number,b:number):number, int(a:number,b:number):number, pick<T>(arr:T[]):T}}
 */
export function createRng(seed) {
  let a = seed;

  function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function range(a, b) {
    return a + Math.floor(next() * (b - a));
  }

  function int(a, b) {
    return range(a, b);
  }

  function pick(arr) {
    return arr[int(0, arr.length)];
  }

  return { next, range, int, pick };
}
