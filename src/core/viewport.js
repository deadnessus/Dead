const LOGICAL_H = 768; // 01-decisoes §1.3
const SIDES = ['top', 'right', 'bottom', 'left'];

/**
 * Calcula as dimensões derivadas a partir do tamanho CSS (puro, testável).
 * @param {number} cssW
 * @param {number} cssH
 * @param {number} rawDpr
 * @param {number} maxDpr
 * @returns {{logicalW:number, logicalH:number, cssW:number, cssH:number, dpr:number, uiScale:number, isPortrait:boolean}}
 */
export function computeMetrics(cssW, cssH, rawDpr, maxDpr) {
  return {
    logicalW: Math.round(LOGICAL_H * cssW / cssH),
    logicalH: LOGICAL_H,
    cssW,
    cssH,
    dpr: Math.min(rawDpr || 1, maxDpr),
    uiScale: cssH / LOGICAL_H,
    isPortrait: cssH > cssW,
  };
}

/**
 * Cria o viewport: tamanho lógico (altura 768), DPR, safe areas e orientação.
 * Define --safe-top/right/bottom/left (px CSS, de env(safe-area-inset-*)) e --ui-scale em uiRootEl,
 * e font-size da raiz = 16px * uiScale.
 * @param {HTMLCanvasElement} canvasEl
 * @param {HTMLElement} uiRootEl
 * @param {number} [maxDpr=2] limite do DPR
 * @returns {{logicalW:number, logicalH:number, cssW:number, cssH:number, dpr:number, uiScale:number,
 *   safe:{top:number,right:number,bottom:number,left:number}, isPortrait:boolean, onChange:(fn:Function)=>void}}
 */
export function createViewport(canvasEl, uiRootEl, maxDpr = 2) {
  const root = document.documentElement;
  const vp = { safe: { top: 0, right: 0, bottom: 0, left: 0 }, onChange };
  const listeners = [];
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;left:0;top:0;width:0;height:0;' +
    'padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
  document.body.appendChild(probe);

  function onChange(fn) { listeners.push(fn); }

  function measure() {
    const w = window.innerWidth;
    const h = window.innerHeight; // innerHeight evita o bug do 100vh no iOS
    Object.assign(vp, computeMetrics(w, h, window.devicePixelRatio, maxDpr));
    const cs = getComputedStyle(probe);
    for (const s of SIDES) {
      const cssPx = parseFloat(cs['padding' + s[0].toUpperCase() + s.slice(1)]) || 0;
      vp.safe[s] = cssPx / vp.uiScale; // px lógicos
      root.style.setProperty('--safe-' + s, 'env(safe-area-inset-' + s + ', 0px)');
    }
    root.style.fontSize = (16 * vp.uiScale) + 'px';
    root.style.setProperty('--ui-scale', String(vp.uiScale));
    canvasEl.style.width = w + 'px';
    canvasEl.style.height = h + 'px';
    uiRootEl.style.width = w + 'px';
    uiRootEl.style.height = h + 'px';
  }

  function update() {
    measure();
    for (const fn of listeners) fn(vp);
  }

  measure();
  window.addEventListener('resize', update);
  window.addEventListener('orientationchange', () => { update(); setTimeout(update, 300); }); // iOS reporta tarde
  return vp;
}
