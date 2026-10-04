import { createViewport } from './core/viewport.js';
import { startLoop } from './core/loop.js';
import { createCanvasRenderer } from './render/canvas.js';

async function boot() {
  // Suposição: sem dataLoader (T05) ainda, lê só o necessário de data/balance.json.
  const balance = await (await fetch('data/balance.json')).json();
  const canvasEl = document.getElementById('world');
  const uiEl = document.getElementById('ui');
  const hintEl = document.getElementById('rotate-hint');
  const viewport = createViewport(canvasEl, uiEl, balance.render.maxDpr);
  const view = createCanvasRenderer(canvasEl, viewport, balance.render.maxDpr);

  const syncHint = () => { hintEl.style.display = viewport.isPortrait ? 'flex' : 'none'; };
  viewport.onChange(syncHint);
  syncHint();
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  let hud = null;
  if (new URLSearchParams(location.search).get('debug') === '1') {
    hud = document.createElement('div');
    hud.style.cssText = 'position:fixed;right:calc(var(--safe-right,0px) + 6px);top:calc(var(--safe-top,0px) + 6px);' +
      'z-index:10;font:12px monospace;color:#0f0;background:#0008;padding:2px 6px;pointer-events:none;white-space:pre';
    document.body.appendChild(hud);
  }
  let msUpdate = 0, msRender = 0, frames = 0, fps = 0, lastT = performance.now();

  startLoop({
    fixedDt: balance.physics.fixedDt,
    maxSteps: balance.physics.maxStepsPerFrame,
    update() {
      const t0 = performance.now();
      msUpdate = performance.now() - t0;
    },
    render() {
      const t0 = performance.now();
      view.beginFrame();
      view.ctx.fillStyle = '#223';
      view.ctx.fillRect(0, 0, view.W, view.H);
      msRender = performance.now() - t0;
      frames++;
      if (hud && t0 - lastT >= 500) {
        fps = Math.round(frames * 1000 / (t0 - lastT));
        frames = 0; lastT = t0;
        hud.textContent = `fps ${fps}\nupd ${msUpdate.toFixed(2)} ms\nren ${msRender.toFixed(2)} ms`;
      }
    },
  });
}

boot();
