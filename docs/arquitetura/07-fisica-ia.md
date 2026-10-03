# 7. Física, IA e render pseudo-3D

Todas as constantes vêm de `data/balance.json` (nomes entre `[]`). Passo fixo `dt = 1/60 s`.
O modelo foi validado por simulação (Python, mesmas fórmulas) e o render por um protótipo no navegador ([referencia/prototipo-render.html](referencia/prototipo-render.html)):
- IA no nível de desbloqueio completa cada pista em 81–85 s (3 voltas), sem sair do asfalto.
- Mustang ferrado (IA dirigindo) completa a t1 em ~84 s; carro máximo completa a t8 em ~73 s.
- Assistência Forte sem tocar na tela: completa todas as pistas sem sair do asfalto, 12–16% mais lenta que a IA.

Convenções: `z` ao longo da pista (u), `x` lateral normalizado (±1 = borda do asfalto), `sp = speed / [physics.speedRef]` (12.000).

## 7.1 Construção da pista (`road.js → buildRoad`)

```
SEG = [physics.segmentLength] (200)
easeIn(a,b,p)    = a + (b-a)*p²
easeOut(a,b,p)   = a + (b-a)*(1-(1-p)²)
easeInOut(a,b,p) = a + (b-a)*(0.5 - cos(p*π)/2)

y = 0 ; segments = []
para cada seção {n:[e,h,l], curve:c, hill:hl} de trackJson.sections:
    tot = e+h+l ; y0 = y ; y1 = y + hl*SEG
    para k em 0..tot-1:
        curva = k < e      ? easeIn(0, c, k/e)
              : k < e+h    ? c
              :              easeOut(c, 0, (k-e-h)/l)
        i = segments.length
        segments.push({ index:i, curve:curva, z1:i*SEG,
                        y1: (i == 0 ? 0 : segments[i-1].y2),
                        y2: easeInOut(y0, y1, (k+1)/tot) })
    y = y1
length = segments.length * SEG
curveAbs[i] = |segments[i].curve|
```

Validação no carregamento: `segments.length === trackJson.segments`; `|y final| < 1` (soma dos morros = 0).
`segmentAt(z) = segments[floor(wrapZ(z)/SEG)]`; `heightAt(z)` = interpolação linear entre y1 e y2 do segmento.
`maxCurveAhead(z, d)` = máximo de `curveAbs` dos segmentos de `z` até `z+d` (com wrap).

## 7.2 Atributos → física (`statsToPhysics.js`)

| Atributo (0–100) | Parâmetro | Fórmula `[physics.statToPhysics]` | Ferrado | Máximo |
|---|---|---|---|---|
| `vel` | topSpeed (u/s) | 7.000 + 70·vel | 7.700 (127 km/h) | 13.650 (225 km/h) |
| `acc` | accel (u/s²) | 1.200 + 25·acc | 1.450 | 3.575 |
| `frn` | brake (u/s²) | 4.000 + 60·frn | 4.600 | 9.400 |
| `ade` | centrifugal | 0,6 − 0,005·ade | 0,54 | 0,15 |
| `dir` | steer | 2,2 + 0,015·dir | 2,43 | 3,48 |

Carro ferrado: `acc 10, vel 10, ade 12, frn 10, dir 15` (nível 11). Carro máximo: `acc 95, vel 95, ade 90, frn 90, dir 85` (nível 91).

Leitura para crianças: **aderência** = a curva empurra menos; **dirigibilidade** = vira mais rápido. Com o carro ferrado, numa curva 4 em velocidade máxima é preciso segurar o botão quase o tempo todo; com o carro máximo, sobra folga até na curva 6.

## 7.3 Passo do carro (`carPhysics.js → stepCar`)

```
entrada: car, input{steer, throttle, brake}, road, B = balance.physics, dt
seg = segmentAt(road, car.z) ; car.curve = seg.curve
sp  = car.speed / B.speedRef
car.offRoad = |car.x| > B.offRoad.limit
vm  = car.params.topSpeed * (car.offRoad ? B.offRoad.topSpeedMul : 1) * car.speedMul
car.drifting = input.brake == 1 && |input.steer| > B.drift.minSteer && car.speed > B.drift.minSpeedRatio * car.params.topSpeed
cf  = car.params.centrifugal * (car.drifting ? B.drift.centrifugalMul : 1)

// 1. direção suavizada
car.steer += (input.steer - car.steer) * min(1, B.steerResponse * dt)

// 2. lateral: o jogador vira, a curva empurra para fora
car.x += car.steer * car.params.steer * sp * dt
car.x -= seg.curve * cf * sp * sp * B.centrifugalScale * dt
car.x  = clamp(car.x, -B.xLimit, B.xLimit)

// 3. velocidade (throttle = velocidade-alvo proporcional)
vCap = vm * input.throttle
if input.throttle > 0 and car.speed < vCap: a = car.params.accel * (1 - (car.speed / vm)²)
else:                                       a = -B.rollingDecel
a -= input.brake * car.params.brake * (car.drifting ? B.drift.brakeMul : 1)
car.speed += a * dt
if car.speed > vm: car.speed -= (car.speed - vm) * B.overSpeedDecay * dt
car.speed = max(0, car.speed)

// 4. avanço
car.z = wrapZ(road, car.z + car.speed * dt)
car.braking  = input.brake == 1
car.skidding = car.drifting || (!car.offRoad && |seg.curve| * sp > B.skidCurveSpeed)
```

Testes obrigatórios (`carPhysics.test.js`, valores da simulação de referência, pista reta salvo indicado):

| Cenário | Esperado |
|---|---|
| Ferrado, throttle 1, 600 passos | `speed` ∈ [7.300, 7.400]; atinge 6.000 entre 5,4 e 5,7 s |
| Máximo, throttle 1 | atinge 6.000 entre 1,7 e 1,9 s; 12.000 entre 5,1 e 5,4 s |
| Ferrado a 7.700, curva 3, steer 0, 60 passos | `x` ∈ [−1,36; −1,30] |
| Ferrado a 7.700, curva 3, steer 1, 60 passos | `x` ∈ [0,03; 0,09] (vence a curva) |
| Ferrado a 7.700, throttle 0, 60 passos | `speed` ∈ [6.150, 6.250] |
| Ferrado a 7.700, brake 1, 60 passos | `speed` ∈ [1.550, 1.650] |
| Ferrado, throttle 0,5, 600 passos | `speed` ∈ [3.800, 3.900] |
| Qualquer | `|x| ≤ 2,0` sempre; `speed ≥ 0` sempre |

## 7.4 IA dos adversários (`aiDriver.js`) e rubber band

Atributos: `R = clamp(opponent.rating * difficulty.aiRatingMul, 0, 100)` nos 5 stats → `statsToPhysics`.
`skill = clamp(opponent.skill + difficulty.aiSkillAdd, 0.6, 1.0)`.

```
// 1. faixa-alvo e desvio
alvoX = opponent.laneOffset + desvio
  desvio: se existe carro (inclusive o jogador) à frente com 0 < Δz < ai.avoid.aheadDist e |Δx| < ai.avoid.lateral,
          desvio = ±ai.avoid.shift para o lado com mais espaço (o lado cujo |alvoX ± shift| ≤ 0,8), por ai.avoid.seconds
alvoX = clamp(alvoX, -0.8, 0.8)

// 2. direção: compensa a curva (feed-forward) + corrige para a faixa
sp = speed / speedRef
ff = physics.centrifugalScale * seg.curve * params.centrifugal * sp / params.steer
steer = clamp(ff + ai.laneGain * (alvoX - x), -1, 1)
erro: a cada passo, com probabilidade opponent.mistakeRate * dt, inicia erro de ai.mistake.seconds;
      durante o erro: steer += ai.mistake.steerNoise * (sinal sorteado no início do erro)

// 3. velocidade de curva
cm = maxCurveAhead(road, z, speed * ai.lookaheadSeconds + 3*SEG)
vCurva = skill * ai.cornerSafety * params.steer / (physics.centrifugalScale * max(cm, 1e-6) * params.centrifugal) * speedRef
if speed > vCurva + ai.brakeMargin: throttle 0, brake 1
elif speed > vCurva:                throttle 0, brake 0
else:                               throttle 1, brake 0
```

**Rubber band** (`rubberBand.js`): `gap = progressoIA − progressoJogador` (u).
```
if gap > 0: mul = 1 - clamp(gap / ai.rubberBandRange, 0, 1) * strength          // IA na frente segura
else:       mul = 1 + clamp(-gap / ai.rubberBandRange, 0, 1) * strength * 0.5   // IA atrás acelera um pouco
car.speedMul = mul        (strength = difficulty.rubberBand: 0,15 / 0,10 / 0,05; range 8.000 u)
```

Determinismo: aleatoriedade só via `createRng(config.seed + índiceDoOponente)`. Mesma seed + mesmas entradas → mesmo `RaceResult`.

## 7.5 Assistência do jogador (`assist.js`)

`A = balance.assist.levels[profile.assist]` (Desligada 0 / Média 0,35 / **Forte 0,7**).

Princípio: a assistência **não pilota pela criança**. Ela compensa parte da força da curva e segura o carro na borda; quando é ela que está trabalhando, o carro alivia para 85% da velocidade. Simulado: sem tocar em nada, termina todas as pistas no asfalto, 12–16% mais lento que a IA.

```
sp   = car.speed / speedRef ; seg = segmentAt(road, car.z)
auto = clamp(physics.centrifugalScale * seg.curve * car.params.centrifugal * sp / car.params.steer, -1, 1)
steer = clamp(raw.steer + A * (1 - |raw.steer|) * auto, -1, 1)

// proteção de borda (vale também com o dedo no botão)
mv = car.steer * car.params.steer * sp - seg.curve * car.params.centrifugal * sp² * physics.centrifugalScale   // velocidade lateral atual
sg = sign(car.x)
bordaAtiva = |car.x| > 1 - assist.edgeMargin  e  mv * sg > assist.edgeReturnThreshold
if bordaAtiva:
    k = A * assist.edgeCorrection * (|car.x| > 1 ? assist.edgeOffRoadMul : 1)
    steer = clamp(steer - sg * k, -1, 1)

// acelerador
throttle = autoAccel ? 1 : raw.throttle
if raw.brake: throttle = 0
if A > 0 and raw.steer == 0 and (|auto| > assist.handsOffMinAuto or bordaAtiva):
    throttle = min(throttle, assist.handsOffThrottle)                 // é a assistência que está virando
if A >= assist.autoThrottleEase.minAssist:
    vCurva = fórmula de 7.4 com skill = 1 e os params do jogador
    if car.speed > vCurva * assist.autoThrottleEase.overSpeedRatio: throttle = min(throttle, assist.autoThrottleEase.throttle)
brake = raw.brake
```

Níveis na prática: **Forte** = o carro "segue a pista" sozinho, mais devagar (padrão para começar); **Média** = a criança precisa virar nas curvas, o jogo só segura na borda e alivia o acelerador; **Desligada** = controle total.

## 7.6 Beira de pista e colisões

**Objetos** (`roadside.js → placeRoadside`), gerados uma vez por corrida com `createRng(scatter.seed)`, nesta ordem exata de sorteios:
```
para i em 0..N-1:
    if rng.next() < scatter.per100/100:
        lado = rng.next() < 0.5 ? -1 : 1
        x = lado * (scatter.minOffset + rng.next() * (scatter.maxOffset - scatter.minOffset))
        asset = theme.decor[floor(rng.next() * theme.decor.length)]
        objetos[i].push({assetId: asset, segment: i, x, halfW: worldW/(2*roadHalfWidth), solid})
placas: para cada seção com |curve| >= 3 que começa no segmento s:
    asset = curve > 0 ? 'dec.placa_dir' : 'dec.placa_esq' ; x = curve > 0 ? -1.4 : +1.4  (lado de fora)
    adicionar em s-10 e em s (wrap)
pórtico: 'dec.largada' em segmento 0, x = 0 (não sólido)
```

**Carro × objeto** (`resolveRoadside`, só o jogador): para cada objeto sólido do segmento atual, se `|car.x − obj.x| < car.width/2 + obj.halfW`: `speed *= physics.roadside.speedKeep` (0,5); `x` move `physics.roadside.nudgeToRoad` (0,15) em direção a 0; conta batida (no máximo 1 por segmento). Como objetos ficam a `|x| ≥ 1,8` e `xLimit = 2`, só bate quem já saiu bem da pista.

**Carro × carro** (`resolveCarPair(behind, ahead, gapZ)`), chamado quando `0 < gapZ < physics.car.length` (300 u) e `|Δx| < physics.carCar.lateral` (0,4):
```
if behind.speed > ahead.speed:
    rel = behind.speed - ahead.speed
    behind.speed = ahead.speed * physics.carCar.speedKeep          // 0,95
    behind.x += sign(behind.x - ahead.x || 1) * physics.carCar.nudge   // 0,05 para o lado
    bateu = rel > physics.carCar.hitRelSpeed                       // conta para o jogador se ele for 'behind' ou 'ahead'
```
Ordenação: a cada passo, ordenar índices dos 6 carros por `z` (insertion sort num array reutilizado); checar só pares consecutivos (e o par último→primeiro com wrap).

## 7.7 Render pseudo-3D (`projection.js`, `roadRenderer.js`, `spriteRenderer.js`, `background.js`)

Tela em px lógicos `W × H` (H = 768). Parâmetros `[render]`.

```
depth   = 1 / tan(fieldOfView/2 em radianos)            // 100° → 0,839
playerZ = cameraHeight * depth                           // distância câmera→carro (839 u)
rw      = roadHalfWidth (1000)

project(p, wx, wy, wz, camX, camY, camZ):
    cx = wx - camX ; cy = wy - camY ; cz = wz - camZ
    p.scale = depth / cz
    p.x = round(W/2 + p.scale * cx * W/2)
    p.y = round(H/2 - p.scale * cy * H/2)
    p.w = round(p.scale * rw * W/2)                      // meia-largura do asfalto na tela
```

**Quadro** (posição interpolada do jogador: `pz`, `px`):
```
camZ    = pz - playerZ                                    (wrap)
base    = segmentAt(camZ) ; basePct = (camZ mod SEG)/SEG
playerY = heightAt(pz)
camY    = playerY + cameraHeight
background.draw()                                         (ver abaixo)
maxy = H ; x = 0 ; dx = -(base.curve * basePct)
para n em 0..drawDistance-1:
    seg = segments[(base.index + n) mod N] ; looped = seg.index < base.index ; oz = looped ? length : 0
    seg.fog  = 1 / e^((n/drawDistance)² * fogDensity)
    seg.clip = maxy
    project(p1, 0, seg.y1, seg.z1,       px*rw - x,      camY, camZ - oz)
    project(p2, 0, seg.y2, seg.z1 + SEG, px*rw - x - dx, camY, camZ - oz)
    x += dx ; dx += seg.curve
    guardar p1, p2 do segmento n (Float32Arrays pré-alocadas de tamanho drawDistance)
    if p1.cz <= depth  ou  p2.y >= p1.y  ou  p2.y >= maxy: continue
    escuro = floor(seg.index / rumbleLength) % 2
    grama:  fillRect(0, p2.y, W, p1.y - p2.y) cor grassDark/Light
    zebra:  trapézios de largura r = w / max(6, 2*lanes) além de cada borda, cor rumbleDark/Light
    asfalto: trapézio (p1.x ± p1.w, p1.y) → (p2.x ± p2.w, p2.y), cor roadDark/Light
    faixas (só segmentos claros): lanes-1 trapézios de largura w/32 em f = -1 + 2k/lanes
    neblina: se seg.fog < 1: fillRect com cor fog e alpha (1 - seg.fog)
    maxy = p1.y
```
Cada trapézio = `beginPath/moveTo/lineTo×3/closePath/fill`.

**Sprites** (de trás para frente, `n` de drawDistance−1 até 1), com recorte vertical `clipY = seg.clip`:
```
desenhar(sprite, scale, sx, sy, worldW):          // âncora base-centro
    w = scale * worldW * W/2 ; h = w * size[1]/size[0]
    destX = sx - w/2 ; destY = sy - h
    cortar = max(0, destY + h - clipY)             // parte abaixo do morro à frente
    se cortar < h: drawImage(img, 0, 0, imgW, imgH * (1 - cortar/h), destX, destY, w, h - cortar)
objeto de beira:  scale = p1.scale do segmento ; sx = p1.x + scale * obj.x * rw * W/2 ; sy = p1.y ; worldW do manifesto
adversário:       pct = (z mod SEG)/SEG ; scale/sx/sy interpolados entre p1 e p2 ; sx += scale * car.x * rw * W/2 ;
                  worldW = physics.car.width * rw (500)
jogador (no segmento do jogador): scale = depth / playerZ ; w = scale * 500 * W/2 (≈ 23% de W) ;
                  base em (W/2, H - 12 + tremor) ; rotação = car.steer * render.steerTilt em torno da base ;
                  tremor = offRoad ? ±render.offRoadShake (alternando a cada 2 quadros) : 0
luz de freio:     car.braking → círculos vermelhos alpha 0,6 de raio 14 (px do sprite × escala) nos pontos lanternaEsq/Dir
```

**Fundo** (`background.js`): 3 camadas (`bg.<tema>.ceu/morros/arvores`, 1024×384) desenhadas em `y ∈ [0, H/2]`, largura W, com deslocamento horizontal `offset ∈ [0,1)` e repetição (duas fatias de `drawImage`). A cada passo: `offset += velocidadeCamada * seg.curve * sp` com velocidades `[render.skySpeed, hillSpeed, treeSpeed]`. Antes delas: `fillRect` céu (cor `sky`) em `[0, H/2]` e neblina (cor `fog`) em `[H/2, H]`.

Teste de projeção (`projection.test.js`): `W=1024, H=768`, depth 0,839, câmera em (0, 1000, 0): ponto (0, 0, 839) → `y = 768` (base da tela), `w ≈ 512`; ponto (0, 0, 8390) → `y ≈ 422`, `w ≈ 51`.

## 7.8 Minimapa (`minimap.js`)

```
ang = 0 ; px = 0 ; py = 0
k = 2π / Σ curve_i   (todas as pistas têm Σ curve > 0: giram no total 360° para a direita)
para cada segmento i: ang += curve_i * k ; px += cos(ang) ; py += sin(ang) ; guarda (px, py)
erro = (px_N, py_N)  (deveria ser 0)  → corrige: ponto_i -= erro * i/N   (fecha o circuito)
normaliza para caber em w×h com margem 8 px ; desenha polilinha (branca, 3 px) uma vez em canvas próprio
por quadro: ponto de cada carro no índice floor(z/SEG) (jogador maior, branco; IAs na cor do oponente)
```
O mesmo traçado vira a miniatura do cartão da pista em `trackSelect`.

## 7.9 Regras da corrida (`raceSession.js`, `grid.js`, `lapTracker.js`)

| Item | Regra |
|---|---|
| Grid | slot k (1..6): fila `r = ceil(k/2)`; `z = length − race.gridBehindLine − (r−1)*race.gridRowSpacing`; `x = (k ímpar ? −1 : +1) * race.gridLateral`; jogador no slot `race.playerGridSlot` (4) |
| Countdown | `race.countdownSeconds` (3); `race:countdown` em 3, 2, 1 e `race:go`; carros parados, motor em ponto morto |
| Voltas | todos começam com `lapsDone = −1` (estão atrás da linha); quando `z < prevZ − length/2` (deu a volta) ⇒ `lapsDone++` |
| Progresso total | `lapsDone * length + z` (ranking) |
| Fim | jogador com `lapsDone == laps` ⇒ `phase = 'finished'`, calcula `RaceResult`, emite `race:finished`; o jogador passa a ser dirigido por um `aiDriver` (skill 0,9, laneOffset 0) por `race.finishAutopilotSeconds` |
| Melhor volta | `playerBestLapOfRace` = melhor volta do jogador < melhor volta de todas as IAs (IAs sem volta completa são ignoradas) |
| Eventos | `race:skid`/`race:offroad` só na mudança de estado do jogador; `race:hit` a cada batida do jogador |

Testes (`raceSession.test.js`): corrida headless na t1 com jogador = entrada nula, assistência Forte e aceleração automática termina; `result()` tem 6 posições únicas; mesma seed → mesmo resultado; eventos `race:countdown` ×3, `race:go`, `race:lap` ×3 do jogador, `race:finished` 1 vez.

## 7.10 Desempenho (60 fps no iPad intermediário)

| Regra | Valor |
|---|---|
| Alocação no loop | zero `new`/literais de objeto por quadro em `race/` e `render/`; projeções em `Float32Array` pré-alocadas |
| Distância de desenho | 150 segmentos (`render.drawDistance`); se `?debug=1` mostrar < 55 fps no iPad, baixar para 100 em `balance.json` |
| Polígonos por quadro | ≤ 150 × (1 grama + 2 zebras + 1 asfalto + 2 faixas + neblina) ≈ 1.000 fills simples |
| Sprites | só os segmentos visíveis; imagens pré-renderizadas (placeholder → canvas) |
| Fundo | 3 imagens 1024×384 renderizadas em escala 1 só para o tema da corrida; liberadas ao sair |
| Canvas | `getContext('2d', { alpha: false })`; `imageSmoothingEnabled = true`; DPR ≤ 2; sem `shadowBlur`/`filter` |
| DOM do HUD | atualiza texto só quando o valor muda |
| Orçamento | update ≤ 2 ms, render ≤ 10 ms (medir com `?debug=1`) |
