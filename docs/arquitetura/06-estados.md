# 6. Máquina de estados do jogo

## 6.1 Diagrama

```
            ┌────────┐ toque  ┌─────────┐ escolhe  ┌──────┐
 (início) ─►│  BOOT  ├───────►│ PERFIL  ├─────────►│ MENU │◄─────────────────────┐
            └────────┘        └─────────┘◄─trocar──┴──┬───┘                      │
                                                      │                          │
                         ┌──────────────┬─────────────┼──────────────┐           │
                         ▼              ▼             ▼              │           │
                    ┌─────────┐   ┌──────────┐   ┌─────────┐         │           │
                    │ GARAGEM │◄─►│  PISTAS  │   │ AJUSTES │─voltar──┘           │
                    │ (+loja) │   └────┬─────┘   └─────────┘                     │
                    └────┬────┘        │ correr                                  │
                         ▲             ▼                                         │
                         │       ┌──────────┐  ⏸   ┌───────────────┐            │
                         │       │ CORRIDA  │◄────►│ PAUSA (overlay)│─sair───────┘
                         │       └────┬─────┘      └───────┬───────┘
                         │            │ terminou            │ reiniciar → CORRIDA (mesma config)
                         │            ▼
                         │       ┌───────────┐
                         └───────┤ RESULTADO ├──correr de novo──► CORRIDA
                                 └───────────┘
```

PAUSA não é estado da máquina: é um overlay dentro de CORRIDA (`raceState.paused = true`).
LOJA não é estado: é o painel de abas dentro de GARAGEM.

## 6.2 Tabela de estados

| Estado (`name`) | Arquivo | `enter(params)` | O que acontece | Saídas |
|---|---|---|---|---|
| `boot` | bootState.js | — | Mostra logo + barra de carregamento enquanto `main.js` carrega dados e imagens. Ao terminar, mostra "Toque para começar". No `pointerup`: `audio.unlock()`, renderiza buffers de áudio (barra continua), emite `audio:unlocked`. | → `profile` |
| `profile` | profileState.js | — | Dois cartões grandes (capacete, nome, nível do carro, mini sprite lateral, dinheiro). Toque no cartão → seleciona. Botão lápis → modal editar nome (input texto, máx. 12) e capacete (4 opções). | toque cartão → `menu {profileId}` |
| `menu` | menuState.js | `{profileId}` | Fundo: garagem com o carro lateral. Botões: **Correr** (grande), **Garagem**, **Ajustes**, **Trocar piloto**. Mostra dinheiro e nível. Se houver nova versão do SW: faixa "Atualização pronta – tocar para atualizar". | → `trackSelect`, `garage`, `settings`, `profile` |
| `garage` | garageState.js | `{profileId, from}` | Carro lateral grande (60% da tela), barras de stats, dinheiro, % restauração, abas **Restauração / Desempenho / Visual** (Visual com cadeado até restauração básica, texto: "Restaure ferrugem, lataria e pintura"). Lista de cartões. Toque no cartão → painel detalhe com prévia das barras e botão "Comprar $ X". Estética possuída: "Usar"/"Tirar". Após compra: `saveStore.flush()`, animação 5.5, verifica `newlyUnlockedTrackIds` → modal "Nova pista liberada!" e `markUnlocksSeen`. | voltar → `menu`; botão **Correr** → `trackSelect` |
| `trackSelect` | trackSelectState.js | `{profileId}` | Abas por liga; cartões de pista (nome, miniatura do traçado desenhada da geometria, prêmio de 1º lugar, melhor posição/tempo). Bloqueada: cadeado + "Nível do carro X" (e "Restauração completa" para t8). Seletor de dificuldade (3 botões) salvo no perfil. | voltar → `menu`; pista → `race {profileId, trackId}` |
| `race` | raceState.js | `{profileId, trackId}` | Monta RaceConfig (seed = `Date.now() & 0xffffffff`), sprites, áudio de motor, HUD, controles. Fases: countdown → running → finished. Ao `race:finished`: espera 2,0 s (carro segue com IA assumindo o controle do jogador, sem pontuar), calcula prêmio, aplica ao perfil, `flush()`. | → `results {profileId, trackId, result, prize}` |
| (overlay) pausa | pauseOverlay.js | — | Congela `session.step`, `audio.engine` silencia, música baixa para 30%. Botões: **Continuar**, **Recomeçar**, **Sair** (sem prêmio; confirma "Sair sem prêmio?"). | continuar; recomeçar → `race` (mesmos params); sair → `menu` |
| `results` | resultsState.js | `{profileId, trackId, result, prize}` | Pódio (posição grande, "1º!" com troféu), tabela de 6 posições, linhas do prêmio aparecendo uma a uma a cada 400 ms com contagem do dinheiro (som `moeda` a cada 50 ms, máx. 1,5 s por linha). Dica: "Faltam $ X para <peça mais barata não comprada>" ou "Você pode comprar <peça>!". | **Garagem** (primário) → `garage`; **Correr de novo** → `race` |
| `settings` | settingsState.js | `{profileId}` | Som ligado/mudo; volume música/efeitos (3 níveis: baixo 0,3 / médio 0,6 / alto 0,9); Assistência (Desligada/Média/Forte); Acelerar sozinho (sim/não); **Exportar save**; **Importar save** (confirma "Substituir os 2 perfis?"); **Zerar este perfil** (botão segurar 3 s + confirmação). Rodapé: versão. | voltar → `menu` |

## 6.3 Regras transversais

| Regra | Implementação |
|---|---|
| Música por estado | `audioDirector` ouve `state:changed`: boot/profile/menu/settings → `mus.menu`; garage/trackSelect → `mus.garagem`; race → `mus.corrida` (começa no `race:go`); results → `mus.vitoria` se posição 1, senão `mus.resultado`, depois `mus.garagem` ao terminar o stinger |
| Botão voltar | Sempre no canto superior esquerdo (72×72), ícone `ico.voltar`; não existe gesto de voltar |
| Orientação retrato | `#rotate-hint` cobre a tela ("Gire o iPad 🔄"); se em `race`, abre a pausa automaticamente |
| Perda de foco | `visibilitychange` hidden / `pagehide`: em `race` → pausa; sempre → `saveStore.flush()` e `audio.suspend()`; ao voltar: `audio.resume()` (no próximo toque, se o iOS exigir) |
| Tutorial | 1ª corrida do perfil (`tutorialDone=false`): durante o countdown, setas animadas sobre ◀ ▶ e FREIO com texto "Segure para virar" / "Freio e derrapagem"; some no `race:go` + 3 s; marca `tutorialDone=true` ao fim da corrida |
| Transições | fade preto 200 ms entre estados (div `#fade` com `opacity` transition) |
| DOM | Cada estado cria sua UI em `enter` dentro de `#ui` e remove em `exit` (`clear(#ui)`); nada de UI persiste entre estados |
