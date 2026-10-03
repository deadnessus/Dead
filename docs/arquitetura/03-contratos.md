# 3. Contratos entre módulos

Convenções:
- Assinaturas em JSDoc. Quem implementa **não muda nomes, parâmetros nem formato de retorno**.
- Funções de `game/` são **imutáveis**: recebem `profile` e devolvem um **novo** `profile` (use `structuredClone`). Nunca mutam o argumento.
- Funções de `race/` **mutam** estados de simulação recebidos (por desempenho), e isso está indicado com `(muta)`.
- Ângulos em radianos; 0 = +x (direita), crescendo no sentido horário porque y cresce para baixo.
- Tempo de simulação em segundos (`dt`); tempos exibidos/salvos em milissegundos inteiros.

## 3.1 Tipos compartilhados

```js
/** @typedef {'acc'|'vel'|'ade'|'frn'|'dir'} StatKey */
/** @typedef {{acc:number, vel:number, ade:number, frn:number, dir:number}} Stats  // 0–100 cada */

/** @typedef {Object} GameData       // retorno de dataLoader.loadGameData(); Object.freeze profundo
 *  @property {Object} car           // data/car.json
 *  @property {Object} parts         // data/parts.json
 *  @property {Object} tracks        // data/tracks.json
 *  @property {Object} opponents     // data/opponents.json
 *  @property {Object} balance       // data/balance.json
 */

/** @typedef {Object} CarBuild       // derivado do perfil por carBuild.js; nunca salvo
 *  @property {Stats}  stats
 *  @property {number} level         // nível do carro = round(média dos 5 stats)
 *  @property {{fumaca:boolean, falhando:boolean}} flags
 *  @property {string} engineProfile // 'i6_200'|'v8_289'|'v8_302'|'v8_390'|'v8_428'
 *  @property {number} gears         // 3|4|5
 *  @property {number} exhaust       // 0..3
 *  @property {'none'|'turbo'|'compressor'} induction
 *  @property {number} restorationDone   // peças de restauração compradas (0..9)
 *  @property {number} restorationTotal  // 9
 */

/** @typedef {Object} CarPhysicsParams
 *  @property {number} topSpeed  // u/s
 *  @property {number} accel     // u/s²
 *  @property {number} brake     // u/s²
 *  @property {number} grip      // 1/s
 *  @property {number} turnRate  // rad/s
 */

/** @typedef {Object} InputState   // objeto reutilizado (não alocar por quadro)
 *  @property {number} steer       // -1..1 (negativo = esquerda)
 *  @property {number} throttle    // 0..1
 *  @property {number} brake       // 0|1
 */

/** @typedef {Object} CarState     // criado por carPhysics.createCarState
 *  @property {string} id          // 'player' | id do oponente ('o01'...)
 *  @property {number} x  @property {number} y
 *  @property {number} heading     // para onde o carro aponta
 *  @property {number} velDir      // para onde o carro se move (difere no drift)
 *  @property {number} speed       // u/s, >= 0
 *  @property {number} steer       // direção suavizada -1..1
 *  @property {number} slip        // |angleDiff(velDir, heading)|
 *  @property {boolean} skidding
 *  @property {'asfalto'|'zebra'|'grama'} surface
 *  @property {number} trackIndex  // amostra mais próxima
 *  @property {number} lateral     // distância lateral assinada ao eixo (+ = direita do sentido da pista)
 *  @property {number} prevX  @property {number} prevY  @property {number} prevHeading  // para interpolação
 *  @property {CarPhysicsParams} params
 *  @property {number} speedMul    // multiplicador externo (rubber band), padrão 1
 */
```

## 3.2 core

```js
// core/math.js
export function clamp(v, min, max) {}
export function lerp(a, b, t) {}
export function wrapAngle(a) {}            // → (-π, π]
export function angleDiff(from, to) {}     // → menor diferença assinada (-π, π]
export function approach(cur, target, maxDelta) {}
export function expSmooth(cur, target, rate, dt) {} // cur + (target-cur)*(1-exp(-rate*dt))

// core/rng.js
/** @returns {{next():number, range(a:number,b:number):number, int(a:number,b:number):number, pick<T>(arr:T[]):T}} */
export function createRng(seed) {}        // mulberry32; next() em [0,1)

// core/eventBus.js
export function createEventBus() {}       // → { on(name, fn) → off(), emit(name, payload), clear() }

// core/stateMachine.js
/** @typedef {{name:string, enter(params?:object):void, exit():void, update(dt:number):void, render(alpha:number):void}} GameState */
export function createStateMachine(bus) {}
// → { register(state), change(name, params), get current(): GameState|null, update(dt), render(alpha) }
// change(): chama exit() do atual, depois enter(params) do novo, emite 'state:changed' {from, to}.
// change() chamado durante update é ADIADO para o fim do update (evita reentrância).

// core/loop.js
export function startLoop({ fixedDt, maxSteps, update, render }) {} // → { stop(), pause(), resume() }
// acumulador; update(fixedDt) até maxSteps por quadro; render(alpha = acumulador/fixedDt)

// core/viewport.js
export function createViewport(canvasEl, uiRootEl) {}
// → { logicalW, logicalH(768), cssW, cssH, dpr, uiScale, safe:{top,right,bottom,left} (px lógicos),
//     isPortrait, onChange(fn) }
// Atualiza em 'resize' e 'orientationchange' (com nova leitura após 300 ms; iOS reporta tarde).

// core/format.js
export function formatMoney(n) {}   // 1250 → "$ 1.250"
export function formatTime(ms) {}   // 65320 → "1:05.32"
export function ordinal(n) {}       // 1 → "1º"
export function formatKmh(speed, kmhPerUnit) {} // → "126"
```

## 3.3 data / assets

```js
// data/dataLoader.js
/** @returns {Promise<GameData>} lança Error se algum JSON falhar ou validate() falhar */
export async function loadGameData(baseUrl = './data/') {}

// data/validate.js
/** @returns {string[]} lista de erros legíveis ("parts.parts[12].slot: 'xyz' não existe"); vazio = ok */
export function validateGameData(data, assetManifest) {}

// assets/assetLoader.js
export function createAssetLoader({ dpr }) {}
// → {
//   async loadManifest(url),                 // lê assets/manifest.json
//   async loadAllImages(onProgress(p0a1)),   // para cada imagem: tenta src; se 404/erro → renderiza ph
//   getImage(id) → HTMLCanvasElement|HTMLImageElement   // lança Error se id não existe
//   getImageInfo(id) → { size:[w,h], anchor:[ax,ay], kind, isPlaceholder }
//   getImageURL(id) → string                // para <img> no DOM (dataURL do placeholder ou src)
//   has(id) → boolean
//   async loadAudio(ctx, ids?, onProgress)   // tenta src → decodeAudioData; se falhar → synth.render(receita)
//   getAudioBuffer(id) → AudioBuffer|null
//   getAudioInfo(id) → { kind, loop, refRpm? }
// }
// Regras: placeholder renderizado em canvas de (w*artScale*dpr) para nitidez, com artScale=2.
// Imagem final (src) é usada como está; tamanho do arquivo DEVE ser size*2.
```

## 3.4 save

```js
// save/storageBackend.js
/** @typedef {{getItem(k:string):string|null, setItem(k:string,v:string):void, removeItem(k:string):void}} StorageBackend */
export function createLocalStorageBackend() {} // envolve window.localStorage com try/catch (modo privado)
export function createMemoryBackend(initial = {}) {}

// save/saveSchema.js
export const SCHEMA_VERSION = 1;
export function createDefaultSave(now) {}            // → SaveData (ver 04-schemas)
export function createDefaultProfile(slotId, now) {} // slotId 'p1'|'p2'

// save/migrations.js
/** @type {{from:number, to:number, migrate(raw:object):object}[]} */
export const MIGRATIONS = [];                        // vazia na v1
/** @returns {{save:SaveData, migrated:boolean}} lança Error('schema_futuro') se version > SCHEMA_VERSION */
export function migrate(raw, migrations = MIGRATIONS) {}

// save/saveStore.js
export function createSaveStore(backend, { key = 'mustang68.save', now = Date.now, debounceMs = 300 } = {}) {}
// → {
//   load() → SaveData            // lê key; se inválido tenta key+'.bak'; se ambos falham → default (e emite aviso)
//   get() → SaveData             // cópia somente leitura (Object.freeze raso)
//   getProfile(id) → Profile
//   updateProfile(id, fn(profile) → profile)   // aplica, agenda gravação
//   updateSettings(fn(settings) → settings)
//   flush()                      // grava já: copia valor atual de key para key+'.bak', depois escreve key
//   resetProfile(id)             // substitui por createDefaultProfile(id), mantém o nome
//   exportJSON() → string        // JSON com {app:'mustang68', exportedAt, save}
//   importJSON(text) → {ok:true}|{ok:false, error:'json'|'app'|'schema_futuro'|'invalido'}
// }
// flush() é chamado: ao fim de cada corrida, após cada compra, em 'pagehide' e 'visibilitychange' (hidden).

// save/saveTransfer.js  (DOM)
export async function exportSave(jsonText, fileName) {}  // navigator.share({files}) → fallback <a download> → fallback modal com texto
export function pickImportFile() {}                      // Promise<string|null> via <input type=file accept=".json,application/json">
```

## 3.5 game

```js
// game/partsCatalog.js
export function createCatalog(partsJson) {}
// → { partById(id), slotById(id), partsBySlot(slotId) (ordenado por tier), stockPartId(slotId) (tier 0),
//     maxTier(slotId), slotsByCategory(cat), isRequirementMet(profile, reqPartId) }
// Requisito 'X' satisfeito se: (X é desempenho/restauração) installed[slot(X)] tem tier >= tier(X);
//                              (X é estética) X ∈ owned.

// game/carBuild.js
/** @returns {CarBuild} */
export function computeCarBuild(profile, data, catalog) {}
// stats = car.baseStats + Σ stats de TODAS as peças de tier 1..tierInstalado em cada slot (tiers são cumulativos)
// flags = car.flagsDefault sobrescrito por flags das peças instaladas (todos os tiers <= instalado)
// engineProfile/gears/exhaust/induction = do tier instalado do slot motor/cambio/escapamento/inducao
// stats limitados a [0,100]

// game/carLevel.js
export function carLevel(stats) {}                  // round((acc+vel+ade+frn+dir)/5)
export function restorationProgress(profile, catalog) {} // {done, total}
export function isFullyRestored(profile, catalog) {}

// game/shop.js
/** @typedef {'ok'|'sem_dinheiro'|'requisito'|'ja_tem'|'fora_de_ordem'|'estetica_bloqueada'} BuyCheck */
export function canBuy(profile, partId, data, catalog) {}  // → { result: BuyCheck, missing?: string[] }
export function buy(profile, partId, data, catalog) {}     // → { profile, part } ; lança se canBuy != 'ok'
export function equip(profile, partId, catalog) {}         // estética possuída → equipped[slot] = partId
export function unequip(profile, slotId) {}                // equipped[slot] = null
// Regras:
//  - restauração/desempenho: só compra tier = instalado+1 ('fora_de_ordem' caso contrário); comprar = instalar.
//  - estética: exige car.customUnlockRequires (senão 'estetica_bloqueada'); comprar = owned.push + equip automático.
//  - preço 0 (c_cor_preta) ainda passa por buy() para registrar posse.

// game/economy.js
/** @typedef {{label:string, amount:number}} PrizeLine */
/** @typedef {{lines:PrizeLine[], total:number, firstWin:boolean}} PrizeBreakdown */
export function computePrize(result, track, difficultyId, profile, balance) {} // → PrizeBreakdown (fórmula seção 8)
export function applyRaceResult(profile, result, prize, nowMs) {}              // → novo profile (dinheiro, recordes, stats)

// game/progression.js
export function unlockedTrackIds(profile, data, catalog) {}   // → string[] na ordem de tracks.json
export function newlyUnlockedTrackIds(profile, data, catalog) {} // desbloqueadas ∖ profile.seenUnlocks
export function markUnlocksSeen(profile, ids) {}              // → novo profile
export function isCustomUnlocked(profile, data, catalog) {}
```

## 3.6 race

```js
// race/track.js
/** @typedef {Object} TrackGeometry
 *  @property {string} id  @property {number} n  @property {number} length
 *  @property {Float32Array} px  @property {Float32Array} py      // amostras do eixo
 *  @property {Float32Array} tx  @property {Float32Array} ty      // tangente unitária
 *  @property {Float32Array} ang                                  // atan2(ty,tx)
 *  @property {Float32Array} curv                                 // curvatura suavizada (1/u), >= 0
 *  @property {Float32Array} dist                                 // distância acumulada até a amostra i
 *  @property {number} halfWidth  @property {number} kerbWidth  @property {number} grassWidth
 *  @property {number} wallDist                                   // halfWidth + grassWidth
 *  @property {{minX:number,minY:number,maxX:number,maxY:number}} bounds
 */
export function buildTrack(trackJson, physicsBalance) {}  // → TrackGeometry (algoritmo em 07 §7.1)
export function nearest(track, x, y, hintIndex) {}        // → {index, lateral, s} ; busca janela ±30 amostras
export function nearestGlobal(track, x, y) {}             // busca completa (usar só no spawn/respawn)
export function sampleAt(track, s, lateral = 0) {}        // → {x, y, ang} em distância s (wrap)
export function maxCurvatureAhead(track, index, fromDist, toDist) {}
export function surfaceAt(track, lateral) {}              // → 'asfalto'|'zebra'|'grama'

// race/statsToPhysics.js
/** @returns {CarPhysicsParams} */
export function statsToPhysics(stats, physicsBalance) {}

// race/carPhysics.js
export function createCarState(id, x, y, heading, params) {}
export function stepCar(car, input, physicsBalance, dt) {}        // (muta) usa car.surface já atualizado

// race/collision.js
export function resolveWall(car, track, physicsBalance) {}         // (muta) → impacto 0..1 (0 = sem batida)
export function resolveCarPair(a, b, progressA, progressB, physicsBalance, radius) {} // (muta) → bateu:boolean

// race/lapTracker.js
export function createLapTracker(track, checkpoints, laps) {}
// → { register(carId, s0), update(carId, s, timeMs) → {lapCompleted:boolean, lap:number, lapTimeMs?:number, finished:boolean},
//     totalProgress(carId) → number (voltasCompletas*length + s), lapsDone(carId), bestLap(carId), lapTimes(carId) }

// race/assist.js
export function applyAssist(rawInput, car, track, assistLevel, autoAccel, balance, out) {} // (muta out: InputState)

// race/aiDriver.js
export function createAiDriver(opponentJson, difficulty, balance, rng) {}
// → { decide(car, track, others:CarState[], progressOf(id), out:InputState, dt) }  (muta out)

// race/rubberBand.js
export function rubberBandMul(aiProgress, playerProgress, strength, range) {} // → 1 - ... (fórmula 07 §7.6)

// race/grid.js
export function gridPositions(track, count, balanceRace) {} // → [{x,y,heading,slot}] slot 1..6

// race/respawn.js
export function createRespawnWatcher(balance) {}
// → { update(car, track, dt, raceRunning) → 'none'|'start_fade'|'teleport', reset() }

// race/raceSession.js
/** @typedef {Object} RaceConfig
 *  @property {Object} trackJson  @property {CarBuild} playerBuild
 *  @property {Object[]} opponents       // 5 objetos de opponents.json
 *  @property {'tranquilo'|'normal'|'desafio'} difficulty
 *  @property {number} assistLevel       // 0 | 0.35 | 0.7
 *  @property {boolean} autoAccel
 *  @property {number} seed
 */
/** @typedef {Object} RaceResult
 *  @property {string} trackId  @property {number} position (1..6)
 *  @property {number} totalTimeMs  @property {number} bestLapMs
 *  @property {boolean} playerBestLapOfRace   // melhor volta entre TODOS os carros
 *  @property {number} hits                   // batidas do jogador (muro + carro)
 *  @property {{id:string, name:string, isPlayer:boolean}[]} ranking
 */
export function createRaceSession(config, data, bus) {}
// → {
//   phase: 'countdown'|'running'|'finished',
//   cars: CarState[]                       // [0] é sempre o jogador
//   step(dt, playerRawInput)               // um passo fixo
//   ranking() → string[]                   // ids por posição
//   hud() → {position, laps, lap, speedKmh, finalLap:boolean, wrongWay:boolean, countdown:number|null}
//   result() → RaceResult|null             // != null quando phase === 'finished'
//   track: TrackGeometry
// }
```

## 3.7 render

```js
// render/camera.js (puro)
export function createCamera(balanceCamera) {}  // → {x, y, rot, zoom, update(target:CarState, dt), snap(target)}
// render/canvas.js
export function createCanvasRenderer(canvasEl, viewport) {} // → {ctx, beginFrame(), applyCamera(cam), resetTransform(), worldViewRect(cam)}
// render/shapePainter.js
export function paintShapes(ctx, shapes) {}     // desenha a receita 'ph' em coordenadas lógicas do sprite
// render/carLayers.js (puro)
/** @returns {{layerId:string, variant:string, assetId:string, z:number}[]} ordenado por z */
export function resolveCarLayers(profile, data, catalog, view) {}  // view 'top'|'side'
export function layersKey(layers) {}            // string estável p/ cache: "pneus=novo|rodas=original|..."
// render/carCompositor.js
export function createCarCompositor(assets, dpr) {}
// → { getSprite(layers, view) → {canvas, w, h, ax, ay}, clear() }   // cache LRU de 8 chaves
// render/trackRenderer.js
export function createTrackRenderer(track, trackJson, assets) {}   // pré-calcula Path2D por bloco de 40 amostras
// → { draw(ctx, viewRect) }
// render/carRenderer.js
export function drawCar(ctx, sprite, x, y, heading, worldLen) {}   // escala sprite para 96 u de comprimento
// render/effects.js
export function createEffects(assets, maxSkid = 400, maxParticles = 64) {}
// → { emitSmoke(x,y), emitSpark(x,y), addSkid(car), update(dt), drawGround(ctx), drawAir(ctx), reset() }
// render/minimap.js
export function createMinimap(track, w = 200, h = 140) {}  // → { draw(ctx, cars, x, y) } em px lógicos de tela
// render/garageScene.js
export function createGarageScene(assets, compositor) {}
// → { setLayers(layers), playUpgrade(layerIds:string[]), update(dt), draw(ctx, viewport) }
```

## 3.8 audio

```js
// audio/audioEngine.js
export function createAudioEngine() {}
// → { ctx (AudioContext|null), unlock() (chamar dentro de pointerup), isUnlocked(),
//     buses:{music:GainNode, sfx:GainNode, engine:GainNode}, setMuted(b), isMuted(), suspend(), resume() }
// audio/synth.js
export async function renderSynth(recipe, sampleRate = 22050) {} // → AudioBuffer (OfflineAudioContext)
// audio/music.js
export function createMusic(engine, assets) {}   // → { play(id), stop(fadeSec = 1) }  crossfade 1 s
// audio/sfx.js
export function createSfx(engine, assets) {}     // → { play(id, {volume=1, rate=1}={}), loop(id) → {setVolume(v), stop()} }
// audio/rpmModel.js (puro)
export function computeRpm(speed, topSpeed, gears, engineProfileData) {} // → {rpm, gear}
// audio/engineSound.js
export function createEngineSound(engine, assets) {}
// → { start(build:CarBuild), update(speed, topSpeed, throttle, dt), stop() }
// audio/audioDirector.js
export function createAudioDirector(bus, music, sfx) {}  // liga eventos → sons (tabela 09)
```

## 3.9 input / ui

```js
// input/touchControls.js
export function mountTouchControls(parentEl, { autoAccel }) {}
// → { input: InputState (rawInput, reutilizado), setVisible(b), destroy() }
// input/keyboard.js
export function attachKeyboard(input) {} // ←/→ steer, ↑ throttle, espaço brake; → detach()

// ui/dom.js
export function h(tag, attrs = {}, ...children) {} // attrs: class, text, onClick, style, data-*
export function clear(el) {}
// ui/components.js
export function button({ label, icon, variant: 'primario'|'secundario'|'perigo', onClick, disabled }) {}
export function moneyLabel(amount) {}
export function statBars(stats, previewStats?) {}     // 5 barras; preview mostra ganho em verde
export function partCard({ part, state: 'comprar'|'caro'|'bloqueado'|'instalado'|'possuido'|'equipado', onClick }) {}
export function modal({ title, body, actions }) {}    // → { close() }
export function toast(text, ms = 2000) {}
```

## 3.10 Eventos (eventBus)

Nomes exatos. Payloads são objetos simples. Emissor único por evento.

| Evento | Emissor | Payload | Ouvintes |
|---|---|---|---|
| `state:changed` | stateMachine | `{from, to}` | audioDirector (música por estado) |
| `audio:unlocked` | bootState | `{}` | audioDirector |
| `ui:tap` | components.button | `{kind:'normal'|'voltar'}` | audioDirector |
| `ui:denied` | garageState | `{reason}` | audioDirector |
| `race:countdown` | raceSession | `{n}` (3,2,1) | audioDirector, raceHud |
| `race:go` | raceSession | `{}` | audioDirector, raceHud |
| `race:lap` | raceSession | `{carId, lap, lapTimeMs, isFinalLapNext}` | audioDirector (só player), raceHud |
| `race:hit` | raceSession | `{carId, kind:'muro'|'carro', intensity:0..1, x, y}` | audioDirector, effects (faíscas) |
| `race:skid` | raceSession | `{carId, on:boolean}` (só player; emite na mudança) | audioDirector |
| `race:respawn` | raceSession | `{carId}` | audioDirector, raceHud |
| `race:finished` | raceSession | `{result}` | raceState |
| `shop:bought` | garageState | `{partId, category}` | audioDirector, garageScene |
| `shop:equipped` | garageState | `{partId}` | audioDirector |
| `money:counted` | resultsState | `{}` (a cada tick de contagem) | audioDirector |
| `progress:unlocked` | garageState | `{trackIds}` | audioDirector |
| `save:error` | saveStore (via main) | `{message}` | ui toast |

## 3.11 Fluxo por quadro (corrida)

```
loop.update(dt=1/60):
  raceState.update(dt)
    raw = touchControls.input (ou teclado)
    session.step(dt, raw):
      para cada carro: guarda prevX/prevY/prevHeading
      jogador: applyAssist(raw → playerInput)
      IA: driver.decide(...) → aiInput; car.speedMul = rubberBandMul(...)
      para cada carro: nearest() → trackIndex, lateral; surface = surfaceAt(); stepCar()
      resolveWall() por carro; resolveCarPair() por par (15 pares)
      lapTracker.update(); respawn.update()
      emite eventos
    engineSound.update(player.speed, ...)
    effects.update(dt)
loop.render(alpha):
  camera.update(player interpolado, dtRender)
  trackRenderer.draw → effects.drawGround (marcas) → carros → effects.drawAir (fumaça/faíscas)
  minimap.draw ; raceHud.update(session.hud())  (DOM só altera texto quando o valor muda)
```
