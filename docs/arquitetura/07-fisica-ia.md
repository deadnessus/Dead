# 7. Física e IA

Todas as constantes vêm de `data/balance.json` (nomes entre `[]`). Passo fixo `dt = 1/60 s`.
O modelo foi validado por simulação (Python, mesmas fórmulas): IA com o carro ferrado completa t1 em ~66 s; com o carro máximo, t8 em ~81 s.

## 7.1 Geometria da pista (`track.js → buildTrack`)

```
P = trackJson.points (n pontos), fechado
1. Polilinha densa: para i em 0..n-1, para k em 0..19:
     t = k/20; p = catmullRom(P[i-1], P[i], P[i+1], P[i+2], t)   (índices mod n)
     catmullRom(p0,p1,p2,p3,t) = 0.5*( 2p1 + (-p0+p2)t + (2p0-5p1+4p2-p3)t² + (-p0+3p1-3p2+p3)t³ )
   fecha repetindo o primeiro ponto.
2. Comprimento acumulado da polilinha → L.
3. N = floor(L / 20); amostra i fica na distância d_i = i*L/N (interpolação linear na polilinha).
4. Tangente t_i = normalize(p_{i+1} - p_i) (wrap); ang_i = atan2(ty, tx).
5. Curvatura bruta k_i = |angleDiff(ang_{i-1}, ang_{i+1})| / (2*L/N); curv_i = média de k_{i-2..i+2} (wrap).
6. halfWidth = roadHalfWidth; wallDist = halfWidth + grassWidth; kerbWidth = [physics.kerbWidth].
```

`nearest(track, x, y, hint)`: varre índices `hint-30 .. hint+30` (wrap), pega o de menor distância²; `lateral = -sin(ang)*dx + cos(ang)*dy` (dx,dy = posição − amostra); `s = dist[index]`.
`surfaceAt(lateral)`: `|lateral| ≤ halfWidth` → asfalto (`|lateral| > halfWidth - kerbWidth` → zebra); senão grama.
`maxCurvatureAhead(index, from, to)`: máximo de `curv` nas amostras de `index + floor(from/ds)` até `index + ceil(to/ds)`.

## 7.2 Atributos → física (`statsToPhysics.js`)

| Atributo (0–100) | Parâmetro | Fórmula `[physics.statToPhysics]` | Ferrado | Máximo |
|---|---|---|---|---|
| `vel` | topSpeed (u/s) | 380 + 4,0·vel | 420 (126 km/h) | 760 (228 km/h) |
| `acc` | accel (u/s²) | 120 + 3,0·acc | 150 | 405 |
| `frn` | brake (u/s²) | 300 + 6,0·frn | 360 | 840 |
| `ade` | grip (1/s) | 4,0 + 0,08·ade | 4,96 | 11,20 |
| `dir` | turnRate (rad/s) | 1,6 + 0,012·dir | 1,78 | 2,62 |

Carro ferrado: `acc 10, vel 10, ade 12, frn 10, dir 15` (nível 11). Carro máximo: `acc 95, vel 95, ade 90, frn 90, dir 85` (nível 91).

## 7.3 Passo do carro (`carPhysics.js → stepCar`)

```
entrada: car, input{steer, throttle, brake}, B = balance.physics, dt
S   = B.surfaces[car.surface]
vm  = car.params.topSpeed * S.topSpeedMul * car.speedMul
g   = car.params.grip * S.gripMul
drifting = input.brake && car.speed > B.drift.minSpeed && |input.steer| > B.drift.minSteer
if drifting: g *= B.drift.gripMul

// 1. direção suavizada
car.steer += (input.steer - car.steer) * min(1, B.steerResponse * dt)

// 2. giro (não gira parado; perde um pouco em alta)
fv = clamp(car.speed / B.turnSpeedFull, 0, 1) * (1 - B.turnHighSpeedLoss * min(car.speed, 1000) / 1000)
car.heading = wrapAngle(car.heading + car.steer * car.params.turnRate * fv * dt)

// 3. deriva: direção do movimento persegue a direção do carro
car.velDir = wrapAngle(car.velDir + angleDiff(car.velDir, car.heading) * min(1, g * dt))
car.slip = |angleDiff(car.velDir, car.heading)|
car.skidding = car.slip > B.skidSlipThreshold && car.speed > 120

// 4. velocidade
a = 0
if car.speed < vm: a += input.throttle * car.params.accel * (1 - (car.speed / vm)²)
brakeForce = car.params.brake * (drifting ? B.drift.brakeMul : 1)
a -= input.brake * brakeForce
if input.throttle == 0: a -= B.rollingDecel
car.speed += a * dt
car.speed -= B.slipSpeedLoss * car.slip * car.speed * dt
if car.speed > vm: car.speed -= (car.speed - vm) * B.overSpeedDecay * dt
car.speed = max(0, car.speed)

// 5. posição
car.x += cos(car.velDir) * car.speed * dt
car.y += sin(car.velDir) * car.speed * dt
```

Testes obrigatórios (`carPhysics.test.js`, valores conferidos por simulação de referência):

| Cenário (asfalto, throttle 1) | Esperado |
|---|---|
| Ferrado, steer 0, 600 passos | `speed` ∈ [415, 420] |
| Ferrado, steer 0 | atinge 300 u/s entre 2,3 e 2,7 s |
| Máximo, steer 0 | atinge 700 u/s entre 2,8 e 3,2 s |
| Ferrado, começa a 400 u/s, steer 1 por 120 passos | `slip` máximo ∈ [0,25; 0,33]; `speed` final ∈ [350, 390] |
| Qualquer, throttle 0, brake 0 | velocidade cai (rollingDecel) e nunca fica negativa |

## 7.4 Colisões (`collision.js`)

**Muro** (`resolveWall`): `limite = track.wallDist - collisionRadius (26)`. Se `|lateral| > limite`:
```
impacto = |sin(angleDiff(track.ang[i], car.velDir))|               // 0 = raspão, 1 = de frente
car.x, car.y ← ponto do eixo + normal * sign(lateral) * limite      // empurra para dentro
car.speed *= max(B.wall.speedKeepMin, 1 - 0.6 * impacto)            // perde 0–60%
alvo = track.ang[i]  (sentido da pista)
car.heading += angleDiff(car.heading, alvo) * B.wall.alignToTrack * impacto
car.velDir  += angleDiff(car.velDir,  alvo) * B.wall.alignToTrack * impacto   // e mais: velDir = heading se impacto > 0.5
retorna impacto (conta batida se impacto > 0.15)
```

**Carro × carro** (`resolveCarPair`): círculos de raio 26. Se `d < 52`: separa cada um `(52 - d)/2` ao longo da normal; o carro com **menor progresso total** (o de trás) perde `B.carCar.rearSpeedLoss` (8%) de velocidade. Conta batida para o jogador se ele estiver envolvido e a velocidade relativa > 60 u/s. Pares checados: todos (15), só se `|Δs| < 200`.

## 7.5 Assistência do jogador (`assist.js`)

`A = balance.assist.levels[profile.assist]` (Desligada 0 / Média 0,35 / **Forte 0,7**).

Princípio: a assistência **não pilota pela criança**. Ela alinha o carro com a direção da pista logo à frente e o afasta das bordas. Sem tocar em nada (Forte + acelerar sozinho), o carro completa qualquer pista sem bater, mas **~10–20% mais lento** que uma IA de mesmo nível (simulado: razão 1,08–1,21 nas 8 pistas, nunca mais de 2,3 s seguidos na grama). Quem vira nas curvas ganha tempo.

```
i     = car.trackIndex
alvoAng = track.ang[(i + assist.lookaheadSamples) % n]          // 3 amostras = 60 u à frente
autoSteer = clamp(assist.steerGain * angleDiff(car.heading, alvoAng), -1, 1)

steer = clamp(raw.steer + A * (1 - |raw.steer|) * autoSteer, -1, 1)

// proteção de borda (vale também com o dedo no botão)
sg = sign(car.lateral)
mv = sin(angleDiff(track.ang[i], car.velDir))                   // + = indo para a direita da pista
if |car.lateral| > halfWidth - assist.edgeMargin and mv * sg > assist.edgeReturnThreshold:
    k = A * assist.edgeCorrection * (|car.lateral| > halfWidth ? assist.edgeOffRoadMul : 1)
    steer = clamp(steer - sg * k, -1, 1)

// acelerador
throttle = autoAccel ? 1 : raw.throttle
if raw.brake: throttle = 0
if A >= assist.autoThrottleEase.minAssist:
    vCurva = fórmula de 7.6 com skill = 1 e os params do jogador
    if car.speed > vCurva * assist.autoThrottleEase.overSpeedRatio:
        throttle = min(throttle, assist.autoThrottleEase.throttle)
brake = raw.brake
```

Níveis na prática: **Forte** = o carro "segue a pista" sozinho (padrão para começar); **Média** = a criança precisa virar nas curvas, o jogo só segura nas bordas e alivia o acelerador; **Desligada** = controle total.

## 7.6 IA dos adversários (`aiDriver.js`)

Atributos da IA: `R = opponent.rating * difficulty.aiRatingMul` (limitado a 0–100) aplicado igual nos 5 stats → `statsToPhysics`.
`skill = clamp(opponent.skill + difficulty.aiSkillAdd, 0.6, 1.0)`.

A cada passo:
```
// 1. faixa preferida e desvio
off = opponent.laneOffset * halfWidth + desvioAtual
   desvio: se outro carro está à frente (0 < Δs < ai.avoid.aheadDist) e |Δlateral| < ai.avoid.lateralDist,
           desvioAtual = ±ai.avoid.shift para o lado com mais espaço até a borda, por ai.avoid.seconds
off = clamp(off, -(halfWidth - 30), halfWidth - 30)

// 2. direção
look = ai.lookahead.base + ai.lookahead.perSpeed * speed
alvo = sampleAt(track, s + look, off)
steer = clamp(ai.steerGain * angleDiff(heading, ângulo até alvo), -1, 1)
erro: a cada passo, com probabilidade opponent.mistakeRate * dt, inicia erro de ai.mistake.seconds
      durante o erro: steer += ai.mistake.steerNoise * sinal sorteado (rng)

// 3. velocidade de curva
κ = maxCurvatureAhead(index, ai.curvatureWindow.start, ai.curvatureWindow.start + ai.curvatureWindow.perSpeed * speed)
tr = params.turnRate
vCurva = skill * ai.cornerSafety * tr / (κ + ai.cornerSafety * tr * ai.cornerHighSpeedTerm)
if speed > vCurva + ai.brakeMargin: throttle 0, brake 1
elif speed > vCurva:               throttle 0, brake 0
else:                              throttle 1, brake 0
```

**Rubber band** (`rubberBand.js`): `gap = progressoIA - progressoJogador` (u, pode ser negativo).
```
if gap > 0: mul = 1 - clamp(gap / ai.rubberBandRange, 0, 1) * strength          // IA na frente desacelera
else:       mul = 1 + clamp(-gap / ai.rubberBandRange, 0, 1) * strength * 0.5   // IA atrás acelera um pouco
car.speedMul = mul        (strength = difficulty.rubberBand: 0,15 / 0,10 / 0,05)
```

Determinismo: toda aleatoriedade usa `createRng(config.seed + índiceDoOponente)`. Teste: mesma seed + mesmas entradas → mesmo `RaceResult`.

## 7.7 Corrida (`raceSession.js`)

| Item | Regra |
|---|---|
| Grid | slot k (1..6): fila `r = ceil(k/2)`, coluna `c = k ímpar ? -1 : +1`; posição = `sampleAt(L - gridBehindLine - (r-1)*gridRowSpacing, c*gridLateral)`, heading = ang da pista |
| Countdown | 3 s; `race:countdown` em 3,2,1 e `race:go`. Durante: carros parados, motor em ponto morto |
| Voltas | `lapTracker`: s começa ≈ L−80 (atrás da linha) com `lapsDone = -1`; cruzar s: >0,9L → <0,1L com os 3 checkpoints marcados ⇒ `lapsDone++` e zera checkpoints; cruzar ao contrário (<0,1L → >0,9L) desmarca tudo |
| Progresso total | `lapsDone * L + s` (com `lapsDone = -1` no início ⇒ negativo antes da linha; correto para ranking) |
| Fim | jogador com `lapsDone == laps` ⇒ `phase = 'finished'`, calcula `RaceResult`, emite `race:finished`; o carro do jogador passa a ser dirigido por um `aiDriver` (skill 0,9) por 2 s |
| Melhor volta | `playerBestLapOfRace` = melhor volta do jogador < melhor volta de todas as IAs (IAs que não completaram nenhuma volta são ignoradas) |
| Contramão | `angleDiff(track.ang[i], heading)` > 110° com speed > 50 ⇒ `hud.wrongWay = true` |
| Respawn | `respawn.js`: contadores por condição (`stuckSeconds`, `offTrackSeconds`, `wrongWaySeconds`); ao estourar: `start_fade` (0,4 s) → `teleport`: posição = `sampleAt(s, 0)`, heading = velDir = ang, speed 0; zera contadores; emite `race:respawn` |

## 7.8 Câmera (`camera.js`)

```
alvoPos = posição interpolada do carro + (cos velDir, sin velDir) * speed * camera.lookaheadSeconds
cam.x,y = expSmooth(cam.x,y, alvoPos, camera.followRate, dt)
cam.rot = cam.rot + angleDiff(cam.rot, -heading - π/2) * (1 - exp(-camera.rotateRate * dt))
cam.zoom = expSmooth(cam.zoom, lerp(zoomAtRest, zoomAtMax, clamp(speed / zoomRefSpeed, 0, 1)), 2.0, dt)
transformação: translate(W/2, H*screenAnchorY) · scale(zoom * escalaBase) · rotate(cam.rot) · translate(-cam.x, -cam.y)
```

## 7.9 Desempenho (60 fps no iPad intermediário)

| Regra | Valor |
|---|---|
| Alocação no loop | zero `new`/literais de objeto por quadro em `race/` e `render/`; reutilizar `InputState`, arrays e `Float32Array` |
| Pista | Path2D pré-construído em blocos de 40 amostras; desenhar só blocos cujo retângulo envolvente cruza o círculo de visão (raio = diagonal da tela / zoom) |
| Decoração | pré-gerada no `enter`; culling por distância |
| Marcas de pneu | ring buffer de 400 segmentos, desenhadas como linhas de 6 u alpha 0,25 |
| Partículas | pool de 64 |
| Canvas | `getContext('2d', { alpha: false })`; `imageSmoothingQuality = 'low'` |
| DPR | máx. 2 |
| DOM do HUD | atualiza texto só quando o valor muda |
| Orçamento | update ≤ 3 ms, render ≤ 8 ms (medir com `?debug=1`, que mostra fps e tempos) |
