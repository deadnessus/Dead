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
- **Arquivos:** `src/data/dataLoader.js`, `src/data/validate.js`, `tools/validate-data.mjs`, `tests/validate.test.js`.
- **Regras de validação (cada uma gera mensagem com caminho):** ids de slot/peça/pista/oponente únicos; `part.slot` existe; restauração/desempenho têm tiers contíguos começando em 0 com preço 0 no tier 0; estética tier 1; `requires` aponta para peça existente; chaves de `stats` ∈ {acc,vel,ade,frn,dir}; `visual.layer` existe em `car.layers`; toda variante não nula de `visual` e todo `default` de camada existe como `car.top.<camada>.<variante>` **e** `car.side.<...>` no manifesto; `slot.icon` existe no manifesto; motor tem `engineProfile` com `eng.<perfil>.low` e `.high` no manifesto; `track.opponents` existem e são 5; `track.points.length >= 6`; `opp.<id>.top` existe; `balance.difficulty.default` existe; `positionPayout.length === race.carsPerRace`; `customUnlockRequires` existem.
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
- **Aceite:** com `assets/img` vazio, todas as 178 imagens carregam como placeholder sem nenhum erro no console (só `console.info` com a contagem); colocar manualmente um PNG qualquer em `assets/img/dec/cone.png` faz `getImageInfo('dec.cone').isPlaceholder === false`; `getImageURL('ico.motor')` funciona em um `<img>`.

### T11 — Camadas do carro · S
- **Arquivos:** `src/render/carLayers.js`, `src/render/carCompositor.js`, `tests/carLayers.test.js`.
- **Entradas:** 05 §5.2–5.3.
- **Aceite:** os 5 testes de propriedade de 05 §5.2; `layersKey` estável; no navegador, `?debug=layers` desenha perfil novo e perfil máximo nas duas vistas (igual à imagem de referência `img/placeholder-camadas.png`).

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

### T14 — Geometria da pista · S
- **Arquivos:** `src/race/track.js`, `tests/track.test.js`.
- **Aceite:** comprimentos (±1%): t1 8.568, t2 9.158, t3 11.417, t4 11.687, t5 12.413, t6 14.187, t7 16.707, t8 16.944; `N = floor(L/20)`; `nearest` de um ponto deslocado 50 u à direita da amostra 100 → índice 100 e `lateral ≈ +50`; `surfaceAt(0)` asfalto, `surfaceAt(halfWidth-5)` zebra, `surfaceAt(halfWidth+10)` grama; `sampleAt(L+10)` = `sampleAt(10)`; `max(curv)` de cada pista ≤ 1/250.

### T15 — Física do carro · S
- **Arquivos:** `src/race/statsToPhysics.js`, `src/race/carPhysics.js`, `tests/carPhysics.test.js`.
- **Aceite:** tabela de 07 §7.2 (valores ferrado/máximo) e tabela de testes de 07 §7.3.

### T16 — Colisão, voltas, grid · S
- **Arquivos:** `src/race/collision.js`, `src/race/lapTracker.js`, `src/race/grid.js`, `tests/collision.test.js`, `tests/lapTracker.test.js`.
- **Aceite:** carro com lateral 300 em t1 → volta a `wallDist-26` e perde velocidade; impacto de raspão (velDir paralela à pista) < 0,2; dois carros sobrepostos se separam para distância ≥ 52 e o de trás perde 8%; volta só conta com os 3 checkpoints; andar para trás pela linha desfaz; grid de 6 sem sobreposição e todos atrás da linha.

### T17 — IA, assistência, respawn · S
- **Arquivos:** `src/race/aiDriver.js`, `src/race/rubberBand.js`, `src/race/assist.js`, `src/race/respawn.js`, `tests/aiDriver.test.js`.
- **Aceite:** IA rating 10 sozinha completa 3 voltas na t1 em 60–75 s simulados sem nenhuma batida no muro e sem respawn; IA rating 90 na t8 em 75–90 s; `rubberBandMul(1500 à frente, 0.15)` = 0,85; jogador com entrada nula + assistência Forte + aceleração automática completa as 3 voltas da t1 e da t4 sem bater no muro, sem respawn, em tempo entre 1,05× e 1,30× o da IA de mesmo nível; respawn dispara após 2 s parado.

### T18 — Sessão de corrida · S
- **Arquivos:** `src/race/raceSession.js`, `tests/raceSession.test.js`.
- **Aceite:** corrida headless (jogador = entrada nula com assistência forte) termina, `result()` tem 6 posições únicas e `position` do jogador; mesma seed → mesmo resultado; eventos `race:countdown` ×3, `race:go`, `race:lap` ×3 do jogador, `race:finished` exatamente 1 vez; após `finished`, `step` continua sem erro.

### T19 — Render da corrida · S
- **Arquivos:** `src/render/camera.js`, `src/render/trackRenderer.js`, `src/render/decorScatter.js`, `src/render/carRenderer.js`, `src/render/minimap.js`.
- **Ordem de desenho da pista:** fundo cor da grama → padrão grama em toda a vista → muro (traço largura `2*(wallDist+10)` padrão `trk.muro`) → grama (traço `2*wallDist`) → zebra (traço `2*halfWidth`, padrão `trk.zebra`) → asfalto (traço `2*(halfWidth-kerbWidth)`, padrão `trk.asfalto`) → faixa central tracejada branca (largura 4, traço `[40,40]`, alpha 0,5) → linha de largada (retângulo `2*halfWidth × 40` com `trk.largada`) → decoração.
- **Aceite:** `?debug=track&t=t3` mostra a pista inteira com zoom para caber e um carro andando sozinho (IA) com câmera girando; 60 fps no desktop com `?debug=1`.

### T20 — Corrida jogável · S
- **Arquivos:** `src/input/touchControls.js`, `src/input/keyboard.js`, `src/states/raceState.js`, `src/states/raceHud.js`, `src/states/pauseOverlay.js`.
- **Aceite:** do menu (botão temporário "Correr t1") corre-se com toque no iPad e teclado no desktop; ◀+▶ simultâneos funcionam com 2 dedos + FREIO com o 3º; HUD mostra posição, volta, km/h; ⏸ pausa e trocar de app pausa; "Sair" volta ao menu sem prêmio; terminar a corrida emite `race:finished`.

### T21 — Resultado e seleção de pista · S
- **Arquivos:** `src/states/resultsState.js`, `src/states/trackSelectState.js`.
- **Aceite:** depois da corrida o dinheiro aumenta pelo total mostrado e persiste após recarregar; linhas do prêmio animam; dica "Faltam $ X para …" correta; pistas bloqueadas mostram cadeado e nível exigido; dificuldade trocada é salva no perfil.

### T22 — Efeitos · S
- **Arquivos:** `src/render/effects.js` (+ integração em `raceState.js`).
- **Aceite:** marcas de pneu aparecem em derrapagem; fumaça sai do escapamento do Mustang enquanto `flags.fumaca`; faíscas em batida no muro; nenhuma queda de fps (pool fixo).

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
- **Arquivos:** `src/states/raceHud.js` (contramão, "Última volta!", tutorial), `src/states/*` (fade de transição), `src/ui/styles.css`.
- **Aceite:** itens "Tutorial", "Transições", "Contramão" de 06 §6.3 e 07 §7.7 funcionando; nenhuma tela com texto cortado em 1024×768 e 1180×820.

### T31 — Teste no iPad · humano
- Executar o checklist de [12-testes-ipad.md](12-testes-ipad.md) e abrir uma tarefa de correção por item reprovado.

## 10.4 Grafo de dependências

```
T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08
                         T05 → T09 → T10 → T11 → T12a → T12b → T13
T03 → T14 → T15 → T16 → T17 → T18 → T19 → T20 → T21 → T22 → T23
T13 ─────────────────────────────────────┘ (T20 precisa de T13)
T13 → T24 → T25 → T26a → T26b
T21 → T27 → T28 → T29 → T30 → T31
```

Fase 2 (arte/áudio final) não tem tarefa de código: só arquivos nos caminhos `src` do manifesto, conferidos com `tools/layer-preview.html` e `node tools/validate-data.mjs`.
