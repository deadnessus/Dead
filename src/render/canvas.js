/**
 * Renderer 2D em tela cheia: backing store = tamanho CSS × min(dpr, maxDpr);
 * o desenho usa px lógicos via setTransform.
 * @param {HTMLCanvasElement} canvasEl
 * @param {{logicalW:number, logicalH:number, cssW:number, cssH:number, dpr:number, onChange:(fn:Function)=>void}} viewport
 * @param {number} maxDpr
 * @returns {{ctx:CanvasRenderingContext2D, beginFrame:()=>void, W:number, H:number}}
 */
export function createCanvasRenderer(canvasEl, viewport, maxDpr) {
  const ctx = canvasEl.getContext('2d', { alpha: false });
  const r = { ctx, beginFrame, W: 0, H: 0 };
  let scale = 1;

  function resize() {
    scale = Math.min(viewport.dpr, maxDpr);
    canvasEl.width = Math.round(viewport.cssW * scale);
    canvasEl.height = Math.round(viewport.cssH * scale);
    r.W = viewport.logicalW;
    r.H = viewport.logicalH;
  }

  /** Aplica a transformação para px lógicos e limpa o quadro. */
  function beginFrame() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    ctx.setTransform(canvasEl.width / r.W, 0, 0, canvasEl.height / r.H, 0, 0);
  }

  resize();
  viewport.onChange(resize);
  return r;
}
