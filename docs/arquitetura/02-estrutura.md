# 2. Estrutura de pastas e arquivos

Regras globais:
- Cada arquivo tem **uma** responsabilidade e no máximo **250 linhas** (exceto JSON de dados).
- Módulos em `src/core`, `src/game`, `src/race` (exceto onde indicado) e `src/save` são **puros**: não tocam `window`, `document`, `localStorage`, `AudioContext` nem `Image`. Assim rodam em `node --test`.
- Importações relativas com extensão `.js` explícita (`import { clamp } from '../core/math.js'`).
- Nenhuma dependência externa. Nenhum `fetch` fora de `src/data/dataLoader.js` e `src/assets/assetLoader.js`.

```
/
├── index.html                    # shell: <canvas id="world">, <div id="ui">, <div id="rotate-hint">; carrega src/main.js
├── manifest.webmanifest          # PWA (nome, ícones, display fullscreen, orientation landscape)
├── sw.js                         # service worker: precache + cache-first + limpeza de versões
├── precache.js                   # GERADO por tools/build-precache.mjs: self.PRECACHE = {version, files[]}
├── icons/                        # icon-180.png, icon-192.png, icon-512.png, icon-512-maskable.png
├── data/
│   ├── car.json                  # Mustang: camadas, z-order, defaults, pontos de âncora, stats base
│   ├── parts.json                # slots + todas as peças (restauração, desempenho, estética)
│   ├── tracks.json               # ligas + 8 pistas (pontos de controle, prêmio, desbloqueio, oponentes)
│   ├── opponents.json            # 18 pilotos IA
│   └── balance.json              # física, assistência, IA, dificuldade, economia, câmera, corrida
├── assets/
│   ├── manifest.json             # todos os assets: imagens (src + receita ph) e áudios (src + receita synth)
│   ├── img/...                   # FASE 2: PNGs finais (caminhos já definidos no manifesto)
│   └── audio/...                 # FASE 2: .m4a finais
├── src/
│   ├── main.js                   # boot: viewport, dados, assets, áudio, save, registra estados, inicia loop
│   ├── config.js                 # constantes que não são balanceamento (chaves de storage, versão, alturas)
│   ├── core/
│   │   ├── math.js               # clamp, lerp, angleDiff, wrapAngle, dist2, approach, smoothstep
│   │   ├── rng.js                # mulberry32(seed) → { next(), range(a,b), pick(arr) }
│   │   ├── eventBus.js           # on/off/emit síncrono
│   │   ├── stateMachine.js       # registro de estados, transição com enter/exit/update/render
│   │   ├── loop.js               # requestAnimationFrame + passo fixo + alpha de interpolação  [usa window]
│   │   ├── viewport.js           # tamanho lógico, DPR, safe areas, orientação, resize       [usa window]
│   │   └── format.js             # formatMoney(1250) → "$ 1.250", formatTime(ms) → "1:05.32", ordinal(3) → "3º"
│   ├── data/
│   │   ├── dataLoader.js         # fetch dos 5 JSON de /data → objeto GameData congelado     [usa fetch]
│   │   └── validate.js           # validações estruturais de GameData (lança Error com caminho do campo)
│   ├── save/
│   │   ├── saveSchema.js         # SCHEMA_VERSION, createDefaultSave(), createDefaultProfile(slotId)
│   │   ├── migrations.js         # lista ordenada de migrações + migrate(raw) → SaveData
│   │   ├── storageBackend.js     # LocalStorageBackend e MemoryBackend (mesma interface)    [LocalStorage usa window]
│   │   ├── saveStore.js          # load/save/backup/reset de perfil, com debounce de escrita
│   │   └── saveTransfer.js       # exportar (share/download) e importar (arquivo) o save    [usa DOM]
│   ├── game/
│   │   ├── partsCatalog.js       # índices: partById, partsBySlot, tierOf; regras de requisito
│   │   ├── carBuild.js           # perfil → CarBuild (stats, flags, engineProfile, gears, exhaust, induction)
│   │   ├── carLevel.js           # nível do carro (média dos 5 stats) e % de restauração
│   │   ├── shop.js               # canBuy/buy/equip/unequip: valida e devolve novo perfil (imutável)
│   │   ├── economy.js            # computePrize(resultado, pista, dificuldade, perfil) → PrizeBreakdown
│   │   └── progression.js        # pistas desbloqueadas, novos desbloqueios, estética liberada
│   ├── race/
│   │   ├── track.js              # buildTrack(json) → TrackGeometry; nearest(), sampleAt(), curvatureAhead()
│   │   ├── carPhysics.js         # createCarState(), stepCar(state, input, params, surface, dt)
│   │   ├── statsToPhysics.js     # stats 0–100 → CarPhysicsParams (fórmulas de balance.json)
│   │   ├── collision.js          # resolveWall(), resolveCarPair()
│   │   ├── lapTracker.js         # progresso, checkpoints, voltas, melhor volta por carro
│   │   ├── assist.js             # assistência de direção/aceleração do jogador
│   │   ├── aiDriver.js           # IA: estado por oponente + decide(input) a cada passo
│   │   ├── rubberBand.js         # multiplicador de velocidade da IA pela distância ao jogador
│   │   ├── grid.js               # posições de largada
│   │   ├── respawn.js            # detector de travado/fora/contramão + reposicionamento
│   │   └── raceSession.js        # orquestra corrida: countdown, passos, ranking, eventos, RaceResult
│   ├── render/
│   │   ├── canvas.js             # contexto 2D, limpar, aplicar câmera                      [usa DOM]
│   │   ├── camera.js             # estado da câmera (pos, rot, zoom) e update suavizado      [puro]
│   │   ├── shapePainter.js       # desenha receitas "ph" (rect, rrect, circle, ellipse, poly, line, text)
│   │   ├── carLayers.js          # perfil+dados → lista ordenada de assetIds de camadas       [puro]
│   │   ├── carCompositor.js      # compõe camadas em canvas offscreen com cache por chave     [usa DOM]
│   │   ├── trackRenderer.js      # grama, muro, zebra, asfalto, linha de largada, decoração
│   │   ├── decorScatter.js       # gera posições de decoração com rng por semente            [puro]
│   │   ├── carRenderer.js        # desenha carros (sprite composto) interpolados
│   │   ├── effects.js            # fumaça, marcas de pneu (ring buffer), faíscas, brilho de compra
│   │   ├── minimap.js            # minimapa
│   │   └── garageScene.js        # cena da garagem: piso, carro lateral grande, animação de upgrade
│   ├── assets/
│   │   └── assetLoader.js        # carrega manifesto; getImage(id), getImageURL(id), getAudioBuffer(id)
│   ├── audio/
│   │   ├── audioEngine.js        # AudioContext, unlock iOS, barramentos, mudo, volumes     [usa window]
│   │   ├── synth.js              # receitas de placeholder → AudioBuffer via OfflineAudioContext
│   │   ├── musicPatterns.js      # notas/ritmos dos 5 loops placeholder (dados puros)
│   │   ├── music.js              # tocar/trocar loop por contexto com crossfade
│   │   ├── sfx.js                # play(id), loops (derrapagem), limitação de vozes
│   │   ├── engineSound.js        # motor: rpm → playbackRate/ganho/filtro, crossfade low/high, falha
│   │   ├── rpmModel.js           # velocidade + marchas → rpm e marcha atual                   [puro]
│   │   └── audioDirector.js      # assina eventos do eventBus e chama music/sfx/engine
│   ├── input/
│   │   ├── touchControls.js      # cria botões DOM da corrida e mantém InputState             [usa DOM]
│   │   └── keyboard.js           # setas/espaço para testar no computador                     [usa DOM]
│   ├── ui/
│   │   ├── strings.js            # todos os textos pt-BR
│   │   ├── dom.js                # h(tag, attrs, ...children), clear(el), on(el, ev, fn)
│   │   ├── components.js         # button(), moneyLabel(), statBars(), partCard(), modal(), toast()
│   │   └── styles.css            # tema visual da UI
│   └── states/
│       ├── bootState.js          # "Toque para começar" (desbloqueia áudio)
│       ├── profileState.js       # escolha/edição dos 2 perfis
│       ├── menuState.js          # menu principal do perfil
│       ├── garageState.js        # garagem + loja (abas por categoria)
│       ├── trackSelectState.js   # seleção de pista e dificuldade
│       ├── raceState.js          # corrida (usa raceSession + renderers + HUD)
│       ├── raceHud.js            # HUD DOM: posição, volta, km/h, avisos, contagem
│       ├── pauseOverlay.js       # pausa: continuar, reiniciar, sair
│       ├── resultsState.js       # resultado e prêmio
│       └── settingsState.js      # som, assistências, exportar/importar, zerar perfil
├── tools/
│   ├── build-precache.mjs        # lista arquivos servidos + hash → precache.js
│   ├── validate-data.mjs         # roda validate.js sobre /data e confere ids do manifesto
│   └── sim-economy.mjs           # simulação de economia (porta do modelo da seção 8)
└── tests/
    ├── math.test.js  rng.test.js  eventBus.test.js  stateMachine.test.js
    ├── validate.test.js  saveSchema.test.js  migrations.test.js  saveStore.test.js
    ├── partsCatalog.test.js  carBuild.test.js  shop.test.js  economy.test.js  progression.test.js
    ├── track.test.js  carPhysics.test.js  collision.test.js  lapTracker.test.js
    ├── aiDriver.test.js  raceSession.test.js  carLayers.test.js  rpmModel.test.js  strings.test.js
    └── precache.test.js
```

## Dependências permitidas (quem pode importar quem)

| Pasta | Pode importar |
|---|---|
| `core` | só `core` |
| `data`, `save` | `core` |
| `game` | `core` |
| `race` | `core` |
| `render` | `core`, `race/track.js` (consultas de geometria), `assets`, `game` (somente funções puras de consulta) |
| `audio` | `core`, `assets` |
| `input`, `ui` | `core` |
| `states` | tudo |
| `main.js` | tudo |

`game` e `race` **nunca** importam `render`, `audio`, `ui`, `states`. A comunicação para cima é por **retorno de função** ou **eventBus**.

## Origem dos dados

Os arquivos de referência desta especificação estão em `docs/arquitetura/dados/`. A tarefa T02 os **copia sem alteração** para `/data/` e `/assets/manifest.json`. Depois disso, `/data` é a fonte da verdade e os ajustes de balanceamento são feitos lá.
