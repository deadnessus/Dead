/**
 * Inicia o loop principal com passo fixo e acumulador.
 * @param {{fixedDt:number, maxSteps:number, update:(dt:number)=>void, render:(alpha:number)=>void,
 *   now?:()=>number, request?:(cb:(t:number)=>void)=>any, cancel?:(id:any)=>void}} opts
 *   `now`, `request` e `cancel` são opcionais (injetáveis em testes); por padrão usam performance/rAF.
 * @returns {{stop():void, pause():void, resume():void}}
 */
export function startLoop({ fixedDt, maxSteps, update, render, now, request, cancel }) {
  const clock = now || (() => performance.now());
  const req = request || ((cb) => requestAnimationFrame(cb));
  const cnl = cancel || ((id) => cancelAnimationFrame(id));
  let acc = 0;
  let last = 0;
  let id = null;
  let running = true;
  let paused = false;

  function frame() {
    if (!running || paused) return;
    const t = clock();
    acc += (t - last) / 1000;
    last = t;
    let steps = 0;
    while (acc >= fixedDt && steps < maxSteps) {
      update(fixedDt);
      acc -= fixedDt;
      steps++;
    }
    if (steps === maxSteps && acc >= fixedDt) acc = 0; // descarta atraso acumulado
    render(acc / fixedDt);
    id = req(frame);
  }

  function schedule() {
    last = clock();
    id = req(frame);
  }

  schedule();
  return {
    stop() { running = false; if (id !== null) cnl(id); id = null; },
    pause() { if (!running || paused) return; paused = true; if (id !== null) cnl(id); id = null; },
    resume() { if (!running || !paused) return; paused = false; acc = 0; schedule(); },
  };
}
