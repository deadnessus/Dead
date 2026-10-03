# 10. Plano de implementação

## 10.1 Regras para toda tarefa ("pronto" = tudo abaixo verdadeiro)

1. Só cria/edita os arquivos listados na tarefa (mais `tests/` correspondentes).
2. `node --test tests/` passa (todas as tarefas anteriores continuam verdes).
3. A partir da T05: `node tools/validate-data.mjs` imprime `OK`.
4. Abrir `http://localhost:8080/` (servidor `python3 -m http.server 8080`) sem erro no console.
5. Nenhum arquivo `.js` com mais de 250 linhas; nenhuma dependência nova; nenhum número de balanceamento no código (vem de `data/`).
6. Commit único: `T<nn>: <objetivo>`.

Legenda de modelo: **H** = Haiku basta (tarefa mecânica, contrato fechado, testes dados). **S** = Sonnet (lógica com várias regras, DOM/Canvas/Áudio, integração).

## 10.2 Marcos

| Marco | Tarefas | Resultado verificável |
|---|---|---|
| M1 Núcleo lógico | T01–T08 | Testes de save, peças, loja e economia passando em Node |
| M2 Casca e telas | T09–T13 | Abre no iPad, escolhe perfil, vê menu com o carro ferrado (placeholder) |
| M3 Corrida | T14–T21 | Corrida completa jogável com placeholders, resultado e prêmio salvos |
| M4 Garagem | T22–T23 | Comprar peça muda o carro na tela; pistas desbloqueiam |
| M5 Áudio | T24–T26 | Música, efeitos e motor que muda com a peça |
| M6 PWA e acabamento | T27–T31 | Instalado na tela de início, offline, save exportável |

## 10.3 Tarefas

### T01 — Esqueleto do projeto · H
- **Objetivo:** estrutura mínima que abre no navegador.
- **Arquivos:** `index.html`, `src/main.js`, `src/config.js`, `src/ui/styles.css` (apenas reset + `#world`, `#ui`, `#rotate-hint`, `#fade`), `package.json` (só `"type":"module"` e `"scripts":{"test":"node --test tests/"}`), `.gitignore`, `README.md` (acrescentar seção "Como rodar").
- **Entradas:** 01-decisoes §1.3, 02-estrutura.
- **Saídas:** `index.html` com `<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">`, metas `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=black-translucent`, `<canvas id="world">`, `<div id="ui">`, `<div id="rotate-hint">Gire o iPad 🔄</div>`, `<div id="fade">`, `<script type="module" src="src/main.js">`. `main.js` só faz `console.log('ok')`.
- **Aceite:** página preta sem erros; `npm test` roda (0 testes ok); CSS com `touch-action:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; overscroll-behavior:none` em `html, body`.

### T02 — Dados · H
- **Objetivo:** colocar os dados de referência no lugar.
- **Arquivos:** `data/car.json`, `data/parts.json`, `data/tracks.json`, `data/opponents.json`, `data/balance.json`, `assets/manifest.json`.
- **Entradas:** `docs/arquitetura/dados/*` (copiar **sem alterar**: `assets.manifest.json` → `assets/manifest.json`).
- **Aceite:** `diff -r` entre origem e destino sem diferenças (exceto o nome do manifesto).

### T03 — Utilidades core · H
- **Arquivos:** `src/core/math.js`, `src/core/rng.js`, `src/core/format.js`, `tests/math.test.js`, `tests/rng.test.js`.
- **Entradas:** contratos 03 §3.2.
- **Aceite (testes):** `angleDiff(3.1, -3.1)` ≈ 0,0832; `wrapAngle(4π)` ≈ 0; `createRng(42)` gera a mesma sequência em duas instâncias e `next()` ∈ [0,1); `formatMoney(1250) === "$ 1.250"`, `formatMoney(0) === "$ 0"`, `formatMoney(1234567) === "$ 1.234.567"`; `formatTime(65320) === "1:05.32"`; `ordinal(3) === "3º"`.

### T04 — Eventos e máquina de estados · H
- **Arquivos:** `src/core/eventBus.js`, `src/core/stateMachine.js`, `tests/eventBus.test.js`, `tests/stateMachine.test.js`.
- **Aceite:** `on` devolve função que remove o ouvinte; `emit` sem ouvintes não falha; ordem enter/exit correta; `change()` dentro de `update()` só aplica depois do update; `state:changed` emitido com `{from,to}`.

### T05 — Carga e validação de dados · S
- **Arquivos:** `src/data/dataLoader.js` (carrega os 6 JSON de `/data`), `src/data/validate.js`, `tools/validate-data.mjs`, `tests/validate.test.js`.
- **Regras de validação (cada uma gera mensagem com caminho):** ids de slot/peça/pista/oponente únicos; `part.slot` existe; restauração/desempenho têm tiers contíguos começando em 0 com preço 0 no tier 0; estética tier 1; `requires` aponta para peça existente; chaves de `stats` ∈ {acc,vel,ade,frn,dir}; `visual.layer` existe em `car.layers`; toda variante não nula de `visual` e todo `default` de camada existe como `car.rear.<camada>.<variante>` **e** `car.side.<...>` no manifesto; `slot.icon` existe no manifesto; motor tem `engineProfile` com `eng.<perfil>.low` e `.high` no manifesto; `track.opponents` existem e são 5; `track.theme` existe em `themes.json`; soma dos `n` das seções = `track.segments`; soma dos `hill` = 0; soma de `curve × (n[0]/3 + n[1] + n[2]/3)` > 0 (giro total para a direita, usado no minimapa); todo `bg.*` e `decor` dos temas existem no manifesto e todo `decor` é `kind: billboard` com `worldW` e `solid`; `opp.<id>.rear` existe; `balance.difficulty.default` existe; `positionPayout.length === race.carsPerRace`; `customUnlockRequires` existem.
- **Aceite:** dados reais → 0 erros; teste com cópia dos dados alterada (slot inexistente, variante sem asset) → mensagem específica; `tools/validate-data.mjs` lê arquivos com `fs` e imprime `OK` ou a lista e sai com código 1.

### T06 — Save · S
- **Arquivos:** `src/save/saveSchema.js`, `src/save/migrations.js`, `src/save/storageBackend.js`, `src/save/saveStore.js`, `tests/saveSchema.test.js`, `tests/migrations.test.js`, `tests/saveStore.test.js`.
- **Entradas:** 04 §4.6, 03 §3.4. `createDefaultProfile` lê os slots de `parts.json` recebido por parâmetro (`createDefaultProfile(slotId, now, partsJson)`) — não hardcode.
- **Aceite:** default tem 2 perfis com 16 slots tier 0; save corrompido (`"{"`) → carrega `.bak`; ambos corrompidos → default; `flush()` grava `.bak` com o conteúdo anterior; migração fictícia v1→v2 (definida só no teste) é aplicada; `schemaVersion: 99` → erro `schema_futuro` e nada é sobrescrito; `importJSON` rejeita `app` diferente; normalização devolve dinheiro de peça inexistente; debounce: 3 `updateProfile` seguidos = 1 escrita (MemoryBackend conta escritas).

### T07 — Catálogo e build do carro · S
- **Arquivos:** `src/game/partsCatalog.js`, `src/game/carBuild.js`, `src/game/carLevel.js`, `tests/partsCatalog.test.js`, `tests/carBuild.test.js`.
- **Aceite:** perfil novo → stats `{acc:10,vel:10,ade:12,frn:10,dir:15}`, nível 11, flags `{fumaca:true,falhando:true}`, `engineProfile 'i6_200'`, `gears 3`; perfil com todos os slots no tier máximo → `{95,95,90,90,85}`, nível 91, `v8_428`, 5 marchas, `compressor`, flags false; `mot_2` instalado soma tiers 1+2 (acc +18); restauração 0/9 → 9/9.

### T08 — Loja, economia, progressão · S
- **Arquivos:** `src/game/shop.js`, `src/game/economy.js`, `src/game/progression.js`, `tests/shop.test.js`, `tests/economy.test.js`, `tests/progression.test.js`.
- **Aceite:** comprar `vid_1` com $120 → money 0, installed vidros `vid_1`, perfil original intacto; `pin_1` sem `fun_1` → `requisito` com `missing:['fun_1']`; `mot_2` com `mot_0` → `fora_de_ordem`; `ind_1` com `mot_2` → `requisito`; estética antes de `fer_1+fun_1+pin_1` → `estetica_bloqueada`; comprar estética equipa; `computePrize` t1 Tranquilo 6º, 5 batidas, sem melhor volta → total 60; t1 Normal 1º, 0 batidas, melhor volta, 1ª vitória → linhas 200/30/20/100 + bônus r(350×0,15)=50 → total 400; segunda vitória não paga 1ª vitória; `unlockedTrackIds` com nível 11 → `['t1']`; nível 70 sem restauração completa → não inclui t8.

### T09 — Viewport, loop e canvas · S
- **Arquivos:** `src/core/viewport.js`, `src/core/loop.js`, `src/render/canvas.js`, `src/main.js` (integra).
- **Aceite:** canvas ocupa a tela toda com nitidez (DPR ≤ 2); em retrato aparece `#rotate-hint`; `?debug=1` mostra no canto fps e ms de update/render; redimensionar a janela no desktop recalcula `logicalW`; `--safe-top/right/bottom/left` definidos como variáveis CSS a partir de `env(safe-area-inset-*)`.

### T10 — Assets de imagem com placeholder · S
- **Arquivos:** `src/render/shapePainter.js`, `src/assets/assetLoader.js` (parte de imagens), `src/main.js` (carrega manifesto e imagens com barra de progresso simples).
- **Aceite:** com `assets/img` vazio, as 172 imagens que não são `background` carregam como placeholder; `loadBackgrounds('serra')` carrega as 3 do tema e `releaseBackgrounds()` as descarta; sem nenhum erro no console (só `console.info` com a contagem); colocar manualmente um PNG qualquer em `assets/img/dec/cone.png` faz `getImageInfo('dec.cone').isPlaceholder === false`; `getImageURL('ico.motor')` funciona em um `<img>`.

### T11 — Camadas do carro · S
- **Arquivos:** `src/render/carLayers.js`, `src/render/carCompositor.js`, `tests/carLayers.test.js`.
- **Entradas:** 05 §5.2–5.3.
- **Aceite:** os 5 testes de propriedade de 05 §5.2; `layersKey` estável; no navegador, `?debug=layers` desenha perfil novo, restaurado e máximo nas vistas `rear` e `side` (igual à imagem de referência `img/placeholder-camadas.png`).

### T12a — Textos e DOM · H
- **Arquivos:** `src/ui/strings.js`, `src/ui/dom.js`.
- **Saídas:** `strings.js` exporta objeto `S` agrupado por tela (`S.menu`, `S.garagem`, `S.corrida`, `S.resultado`, `S.ajustes`, `S.perfil`, `S.pecas`) e **todos os rótulos de botão em `S.botoes`** (`S.botoes.correr = 'Correr'`, etc.), cobrindo todos os textos citados em 06 e 08 (lista mínima em 06 §6.2); `dom.h` cria elementos com `class`, `text`, `onClick`, `style`, `data-*`.
- **Aceite:** `tests/strings.test.js` confere que nenhuma string de `S` é vazia e que nenhum valor de `S.botoes` passa de 6 palavras; `dom.js` é verificado no navegador junto com a T12b.

### T12b — Componentes e estilo · S
- **Arquivos:** `src/ui/components.js`, `src/ui/styles.css`.
- **Aceite:** página `?debug=ui` mostra todos os componentes; botões ≥ 72 px lógicos de altura; texto mínimo 20 px lógicos; contraste branco sobre cinza-escuro; feedback de toque (`:active` escala 0,96); `button` emite `ui:tap`.

### T13 — Telas iniciais · S
- **Arquivos:** `src/states/bootState.js`, `src/states/profileState.js`, `src/states/menuState.js`, `src/main.js`.
- **Aceite:** fluxo boot → toque → perfis → menu; editar nome persiste após recarregar; o menu mostra o carro **ferrado** lateral, dinheiro "$ 0" e nível 11; "Trocar piloto" volta; `settings.lastProfileId` destaca o último perfil usado.

### T14 — Pista em segmentos · S
- **Arquivos:** `src/race/road.js`, `tests/road.test.js`.
- **Entradas:** 07 §7.1, 03 §3.6.
- **Aceite:** nº de segmentos: t1 1.025, t2 1.035, t3 1.150, t4 1.220, t5 1.280, t6 1.410, t7 1.440, t8 1.610; `length = segmentos × 200`; na t1: `segments[85].curve ≈ 0,222`, `segments[105].curve === 2`, `segments[244].y2 === 2000` (±0,01), `segments[245].y1 === segments[244].y2`, `|último.y2| < 1`; `segmentAt(length + 10) === segments[0]`; `maxCurveAhead(t1, 0, 30000) === 2`; `heightAt` contínuo (diferença entre z e z+1 < 5 u em toda a t5).

### T15 — Física do carro · S
- **Arquivos:** `src/race/statsToPhysics.js`, `src/race/carPhysics.js`, `tests/carPhysics.test.js`.
- **Aceite:** tabela de 07 §7.2 (valores ferrado/máximo) e tabela de testes de 07 §7.3.

### T16 — Beira de pista, colisão, voltas, grid · S
- **Arquivos:** `src/race/roadside.js`, `src/race/collision.js`, `src/race/lapTracker.js`, `src/race/grid.js`, `tests/roadside.test.js`, `tests/collision.test.js`, `tests/lapTracker.test.js`.
- **Entradas:** 07 §7.6 e §7.9.
- **Aceite:** `placeRoadside` é determinístico (mesma seed → mesma lista) e todo objeto sorteado tem `1,8 ≤ |x| ≤ 4,0`; há placa antes de toda curva com `|curve| ≥ 3` do lado de fora; pórtico no segmento 0; jogador em `x = 1,9` com árvore sólida em `x = 2,2` no mesmo segmento → bate, velocidade cai à metade, `x` vai para 1,75; placa (não sólida) não bate; carro de trás mais rápido a 200 u do da frente com `|Δx| = 0,2` → velocidade = 95% da do da frente; com `|Δx| = 0,5` → nada; volta conta ao passar de `z` próximo de `length` para próximo de 0; grid: 6 posições distintas, todas com `z > length − 2.000`, jogador no slot 4 com `x = +0,45`.

### T17 — IA, assistência, rubber band · S
- **Arquivos:** `src/race/aiDriver.js`, `src/race/rubberBand.js`, `src/race/assist.js`, `tests/aiDriver.test.js`.
- **Entradas:** 07 §7.4–7.5.
- **Aceite (simulação headless, 1 carro sozinho, `laneOffset 0`, `skill 0,95`, `mistakeRate 0`, `speedMul 1`):** IA com stats 11 na t1 completa 3 voltas em 80–88 s; IA com stats 70 na t8 em 80–88 s; em ambas `|x| ≤ 1` o tempo todo. Jogador com entrada nula + assistência Forte + aceleração automática, stats 11 na t1 e stats 40 na t5: completa 3 voltas, nunca fica mais de 1 s seguido com `|x| > 1`, tempo entre 1,08× e 1,22× o da IA de mesmos stats. `rubberBandMul(8000 à frente, 0.15)` = 0,85; `rubberBandMul(8000 atrás, 0.15)` = 1,075.

### T18 — Sessão de corrida · S
- **Arquivos:** `src/race/raceSession.js`, `tests/raceSession.test.js`.
- **Aceite:** testes de 07 §7.9; após `finished`, `step` continua sem erro (piloto automático por 2 s).

### T19a — Render da estrada · S
- **Arquivos:** `src/render/projection.js`, `src/render/background.js`, `src/render/roadRenderer.js`, `tests/projection.test.js`.
- **Entradas:** 07 §7.7 (pode portar as funções `project`, `buildRoad`-render e o laço de segmentos do protótipo `docs/arquitetura/referencia/prototipo-render.html`, adaptando aos contratos e sem alocar por quadro).
- **Aceite:** teste de projeção de 07 §7.7; `?debug=road&t=t3` mostra a câmera andando sozinha pela pista a 8.000 u/s (curvas, morros, faixas alternando, neblina, fundo com paralaxe nas curvas); comparar com `img/corrida-t1.png` / `corrida-t5.png` (mesmas cores e proporções, sem sprites); ≥ 58 fps no desktop com `?debug=1`.

### T19b — Sprites e minimapa · S
- **Arquivos:** `src/render/spriteRenderer.js`, `src/render/minimap.js`.
- **Aceite:** `?debug=race&t=t5` roda uma corrida inteira com 6 IAs (uma delas no lugar do Mustang, usando o sprite composto do perfil) vista de trás; objetos e carros somem corretamente atrás de morros (recorte); Mustang no centro inferior inclinando nas curvas e luz de freio acendendo; minimapa fecha o circuito sem salto e mostra os 6 pontos; ≥ 58 fps no desktop.

### T20 — Corrida jogável · S
- **Arquivos:** `src/input/touchControls.js`, `src/input/keyboard.js`, `src/states/raceState.js`, `src/states/raceHud.js`, `src/states/pauseOverlay.js`.
- **Aceite:** do menu (botão temporário "Correr t1") corre-se com toque no iPad e teclado no desktop; ◀+▶ simultâneos funcionam com 2 dedos + FREIO com o 3º; HUD mostra posição, volta, km/h; ⏸ pausa e trocar de app pausa; "Sair" volta ao menu sem prêmio; terminar a corrida emite `race:finished`.

### T21 — Resultado e seleção de pista · S
- **Arquivos:** `src/states/resultsState.js`, `src/states/trackSelectState.js`.
- **Aceite:** depois da corrida o dinheiro aumenta pelo total mostrado e persiste após recarregar; linhas do prêmio animam; dica "Faltam $ X para …" correta; pistas bloqueadas mostram cadeado e nível exigido; dificuldade trocada é salva no perfil.

### T22 — Efeitos · S
- **Arquivos:** `src/render/effects.js` (+ integração em `raceState.js`).
- **Aceite:** fumaça sai dos escapamentos do Mustang enquanto `flags.fumaca` (some após a Revisão do motor); fumaça branca dos pneus em `skidding`; poeira e tremor fora do asfalto; faíscas em `race:hit`; nenhuma queda de fps (pool fixo de 64 partículas).

### T23 — Garagem e loja · S
- **Arquivos:** `src/states/garageState.js`, `src/render/garageScene.js`.
- **Aceite:** abas e estados de cartão de 06 §6.2; comprar "Vidros novos" troca o vidro do carro com brilho e crossfade (05 §5.5); barras animam; sem dinheiro → cartão "caro" e `ui:denied`; aba Visual bloqueada até restauração básica; ao atingir nível 15 aparece "Nova pista liberada!" uma única vez.

### T24 — Áudio base e efeitos sonoros · S
- **Arquivos:** `src/audio/audioEngine.js`, `src/audio/synth.js` (geradores exceto `rock`), `src/audio/sfx.js`, `src/audio/audioDirector.js`, `src/assets/assetLoader.js` (parte de áudio).
- **Aceite:** nenhum som antes do primeiro toque e nenhum erro; depois do toque, todos os `sfx.*` tocam (página `?debug=audio` com um botão por id); mudo silencia tudo e persiste; voltar de outro app restaura o som no próximo toque.

### T25 — Música · S
- **Arquivos:** `src/audio/musicPatterns.js`, `src/audio/synth.js` (gerador `rock`), `src/audio/music.js`.
- **Aceite:** cada estado toca o loop de 06 §6.3 com crossfade de 1 s; loop sem estalo audível; renderização dos 5 padrões ≤ 1,5 s no iPad (medir com `?debug=1`).

### T26a — Modelo de rpm · H
- **Arquivos:** `src/audio/rpmModel.js`, `tests/rpmModel.test.js`.
- **Aceite:** testes de 09 §9.3.

### T26b — Som do motor · S
- **Arquivos:** `src/audio/engineSound.js` (+ chamadas em `raceState.js` e `garageState.js`).
- **Aceite:** 6 cilindros falhando audivelmente com motor de fábrica; após "Revisão do motor" para de falhar; V8 soa mais grave e cheio; troca de marcha audível; turbo assobia acelerando; pausa silencia o motor.

### T27 — Ajustes e transferência de save · S
- **Arquivos:** `src/states/settingsState.js`, `src/save/saveTransfer.js`.
- **Aceite:** exportar no iPad abre a planilha de compartilhar com o arquivo `.json` (ou baixa); importar esse arquivo restaura os 2 perfis; arquivo inválido mostra "Arquivo não reconhecido" sem alterar nada; "Zerar perfil" exige segurar 3 s e confirmar.

### T28 — PWA e offline · S
- **Arquivos:** `manifest.webmanifest`, `sw.js`, `tools/build-precache.mjs`, `precache.js`, `tools/make-icons.mjs`, `icons/*`, `tests/precache.test.js`, `index.html` (links), `src/main.js` (registro do SW e faixa de atualização).
- **Detalhes:** `build-precache.mjs` lista todos os arquivos de `index.html`, `manifest.webmanifest`, `src/**`, `data/**`, `assets/**`, `icons/**`; `version` = 12 primeiros hex do SHA-256 da concatenação dos conteúdos. `sw.js`: `importScripts('precache.js')`; install → `cache.addAll` em `mustang68-<version>`; activate → apaga caches antigos; fetch → cache-first, fallback rede; **não** chama `skipWaiting` sozinho: só quando a página envia `{type:'SKIP_WAITING'}` (botão "Atualizar" no menu). `make-icons.mjs` gera PNG (zlib do Node, encoder próprio) com fundo preto, faixa branca e "68".
- **Aceite:** `precache.test.js` falha se algum arquivo servido não estiver na lista; Lighthouse/DevTools: instalável; modo avião após 1ª visita: jogo abre e corre.

### T29 — Ferramentas de conferência · H
- **Arquivos:** `tools/layer-preview.html`, `tools/sim-economy.mjs`.
- **Aceite:** `layer-preview.html` (aberto pelo servidor) mostra 3 perfis × 2 vistas usando `assetLoader` real; `sim-economy.mjs` reproduz a tabela 08 §8.4 (Normal h=6) com diferença ≤ 2 corridas em cada marco.

### T30 — Acabamento · S
- **Arquivos:** `src/states/raceHud.js` ("Última volta!", tutorial), `src/states/*` (fade de transição), `src/ui/styles.css`.
- **Aceite:** itens "Tutorial" e "Transições" de 06 §6.3 funcionando; nenhuma tela com texto cortado em 1024×768 e 1180×820.

### T31 — Teste no iPad · humano
- Executar o checklist de [12-testes-ipad.md](12-testes-ipad.md) e abrir uma tarefa de correção por item reprovado.

## 10.4 Grafo de dependências

```
T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08
                         T05 → T09 → T10 → T11 → T12a → T12b → T13
T03 → T14 → T15 → T16 → T17 → T18 → T19a → T19b → T20 → T21 → T22 → T23
T13 ─────────────────────────────────────┘ (T20 precisa de T13)
T13 → T24 → T25 → T26a → T26b
T21 → T27 → T28 → T29 → T30 → T31
```

Fase 2 (arte/áudio final) não tem tarefa de código: só arquivos nos caminhos `src` do manifesto, conferidos com `tools/layer-preview.html` e `node tools/validate-data.mjs`.
