# 1. Decisões de design fechadas

Todas as decisões abaixo são **finais**. O implementador não escolhe alternativas.

## 1.1 Stack

| Item | Decisão |
|---|---|
| Linguagem | JavaScript ES2022, **módulos ES nativos** (`<script type="module">`), sem TypeScript, sem bundler, sem npm em runtime |
| Render | **Canvas 2D** (um `<canvas>` de tela cheia) para mundo/carro; **DOM + CSS** para menus, HUD e botões de toque |
| Engine | Nenhuma (sem Phaser). Justificativa: (1) o sistema de camadas do carro e o desenho procedural da pista são código próprio de qualquer forma; (2) Phaser traz ~1 MB e APIs de versões diferentes (2 vs 3) que confundem modelos simples; (3) módulos pequenos e puros são testáveis em Node sem DOM; (4) zero build = o arquivo editado é o arquivo servido. |
| Tipos | JSDoc (`@typedef`, `@param`, `@returns`) em todo arquivo público |
| Testes | `node --test tests/` (Node ≥ 20, só para desenvolvimento; nenhum pacote externo) |
| Servidor de dev | `python3 -m http.server 8080` na raiz do projeto |
| Áudio | Web Audio API; **todo som é um `AudioBuffer`** (placeholder = sintetizado em `OfflineAudioContext`; final = arquivo decodificado) |
| Save | `localStorage`, atrás da interface `StorageBackend` (trocável por Capacitor Preferences) |
| Offline | Service worker com precache versionado gerado por `tools/build-precache.mjs` |

## 1.2 Visão de câmera: top-down com câmera que gira junto com o carro

| Parâmetro | Valor |
|---|---|
| Projeção | Ortográfica vista de cima (top-down) na corrida; vista lateral (side) na garagem |
| Rotação da câmera | A câmera gira para que o carro do jogador **aponte sempre para cima da tela** (rotação suavizada) |
| Posição do carro na tela | Centro horizontal, 68% da altura (vê-se mais pista à frente) |
| Zoom | 0,85 parado → 0,65 na velocidade 760 u/s (linear) |
| Minimapa | Canto superior direito, 200×140 px lógicos, pista inteira norte-para-cima, pontos coloridos dos carros |

Justificativa: com câmera girando, o botão ◀ sempre vira para a esquerda **da tela**, eliminando a inversão de controle que crianças sofrem em top-down fixo quando o carro desce a tela. A vista lateral na garagem é onde o Mustang é reconhecível (perfil hardtop) e onde rodas, cromados e faixas aparecem.

## 1.3 Resolução lógica e escala

| Item | Valor |
|---|---|
| Altura lógica | **768** px lógicos fixos |
| Largura lógica | `round(768 × larguraCSS / alturaCSS)` (iPad 4:3 → 1024; iPad Air 1180×820 → 1105) |
| px lógico → px CSS | `uiScale = alturaCSS / 768`; a UI DOM usa `font-size: calc(16px * uiScale)` na raiz e medidas em `rem` (1 rem = 16 px lógicos) |
| Backing store do canvas | `larguraCSS × min(devicePixelRatio, 2)` |
| Escala mundo→tela | `zoomCamera × (alturaCSS / 768) × dpr` |
| Unidade de mundo | 1 u ≈ 5 cm (carro = 96 × 48 u ≈ 4,8 × 2,4 m) |
| km/h exibido | `velocidade_u_s × 0,3` (420 u/s → 126 km/h; 760 u/s → 228 km/h) |

## 1.4 Esquema de controle

```
┌──────────────────────────────────────────────────────────────┐
│ [⏸]                                         [minimapa]       │
│  Pos 3º/6   Volta 2/3                                       │
│                                                              │
│                         (pista)                              │
│                                                              │
│                                                  [ACELERAR]* │
│  [ ◀ ]  [ ▶ ]                       126 km/h      [ FREIO ]  │
└──────────────────────────────────────────────────────────────┘
* ACELERAR só aparece se "Acelerar sozinho" estiver DESLIGADO.
```

| Controle | Tamanho lógico | Posição (a partir da safe area) | Comportamento |
|---|---|---|---|
| ◀ | 150×150 | esquerda 24, base 24 | enquanto pressionado: `steer = -1` |
| ▶ | 150×150 | esquerda 198, base 24 | enquanto pressionado: `steer = +1` (◀+▶ juntos = 0) |
| FREIO | 150×150 | direita 24, base 24 | `brake = 1`; com velocidade > 250 e \|steer\| > 0,5 vira **drift** |
| ACELERAR | 150×190 | direita 24, base 198 | `throttle = 1` (apenas se aceleração automática desligada) |
| ⏸ | 72×72 | esquerda 16, topo 16 | abre Pausa |

- Entrada via **Pointer Events** em cada botão (multitoque nativo: cada botão rastreia seu próprio `pointerId`). `setPointerCapture` não é usado; `pointerleave`/`pointercancel` soltam o botão.
- Aceleração automática **ligada por padrão** (`throttle = 1` sempre, exceto quando FREIO pressionado → 0).
- Assistência de direção 3 níveis (Desligada 0 / Média 0,35 / **Forte 0,7 = padrão**). A assistência alinha o carro com a pista e protege as bordas, mas não pilota: sem tocar, o carro termina ~15% mais lento que a IA. Fórmula em [07-fisica-ia.md §7.5](07-fisica-ia.md).
- Nada de acelerômetro (exige permissão no iOS e cansa o braço).

Justificativa: dois polegares, cada um com função fixa; o polegar esquerdo só vira, o direito só freia. Botões grandes (≥ 150 px lógicos ≈ 2,9 cm no iPad 10,2") toleram imprecisão de crianças. Com aceleração automática + assistência forte, a criança só precisa "corrigir" a direção.

## 1.5 Formato das pistas

| Item | Decisão |
|---|---|
| Geometria | Circuito fechado definido por **pontos de controle** de spline **Catmull-Rom uniforme**, sentido horário |
| Amostragem | 20 subamostras por segmento → reamostragem por comprimento de arco a cada **20 u** (`N = floor(L/20)` amostras uniformes) |
| Superfícies (do centro para fora) | asfalto (`roadHalfWidth` 110–130) → zebra (14 u, só visual + gripMul 0,95) → grama (90 u) → muro |
| Muro | Invisível como colisão (distância lateral), desenhado como faixa de 10 u |
| Largada | Linha de largada no ponto de amostra 0; grid atrás dela |
| Voltas | 3 por corrida |
| Checkpoints | 25%, 50%, 75% do comprimento; volta só conta se os 3 forem cruzados |
| Desenho | Procedural a cada quadro (traços grossos com padrões), apenas segmentos visíveis; decoração espalhada por semente fixa |
| Validação | Raio mínimo de curva ≥ 250 u; separação entre trechos ≥ 2×(meia-largura+grama)+40 (já garantidos nos 8 traçados de `dados/tracks.json`) |

## 1.6 Corrida

| Item | Valor |
|---|---|
| Carros | 6 (jogador + 5 IA) |
| Posição de largada do jogador | slot 4 = 2ª fila, coluna direita (grid de 2 colunas: slots 1-2 fila 1, 3-4 fila 2, 5-6 fila 3; ímpar = coluna esquerda) |
| Ordem das IAs no grid | rating decrescente nos slots livres (mais fortes na frente) |
| Contagem | 3-2-1-VAI! (3 s) |
| Fim | Quando o **jogador** completa a última volta, a classificação final = ordem atual por progresso total (IAs que já terminaram mantêm a ordem de chegada). Não se espera os outros. |
| Sem game over | Qualquer posição paga prêmio |
| Reboque automático | Parado (< 30 u/s) por 2 s, fora do asfalto por 4 s ou na contramão por 2 s → fade 0,4 s e reaparece no centro da pista, no ponto mais próximo, alinhado, velocidade 0. Sem penalidade além do tempo. |
| Batidas | Sem dano. Contam para o bônus "corrida limpa" (≤ 2 batidas). |
| Pausa | Botão ⏸ e automática em `visibilitychange`/`pagehide`/`blur` |

## 1.7 Perfis, dificuldade e textos

| Item | Decisão |
|---|---|
| Perfis | Exatamente 2 slots fixos (`p1`, `p2`), nome editável (máx. 12 caracteres) e capacete de cor (4 opções) |
| Dificuldade | Por perfil: Tranquilo (padrão), Normal, Desafio; trocável na tela de seleção de pista |
| Idioma | pt-BR, todos os textos em `src/ui/strings.js`; frases ≤ 6 palavras em botões |
| Moeda | Símbolo `$`, formato `$ 1.250` (ponto como milhar), sem centavos |
| Nível do carro | "Nível do carro" = média arredondada dos 5 atributos (0–100). Desbloqueia pistas. |

## 1.8 Fora de escopo (não implementar)

Multiplayer, rede, contas, analytics, anúncios, compras reais, conquistas/loot box, timers de energia, recompensas diárias, notificações, marcha à ré, dano mecânico, clima, noite.
