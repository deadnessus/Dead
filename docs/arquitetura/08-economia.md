# 8. Economia e balanceamento

Valores em `data/balance.json → economy`, `data/parts.json` (preços) e `data/tracks.json` (prêmios). Dinheiro inicial: **$ 0**.

## 8.1 Fórmula do prêmio (`economy.js → computePrize`)

```
P   = track.prize
pos = result.position (1..6)
r(x) = round(x / economy.roundTo) * economy.roundTo        // arredonda para múltiplo de 10

linhas (só entram as que forem > 0, nesta ordem):
  "Chegada <pos>º"        r(P * positionPayout[pos-1])          // 1,00 0,70 0,55 0,45 0,38 0,32
  "Melhor volta"          r(P * bestLapBonus)        se result.playerBestLapOfRace          // 0,15
  "Corrida limpa"         r(P * cleanRaceBonus)      se result.hits <= cleanRaceMaxHits     // 0,10 ; ≤ 2 batidas
  "Primeira vitória!"     r(P * firstWinBonus)       se pos == 1 e !profile.tracks[id].firstWinPaid  // 0,50
  "Bônus <dificuldade>"   r(soma_das_linhas_acima * (prizeMul - 1))   // Normal +15%, Desafio +30%, Tranquilo não aparece
total = soma das linhas (já arredondadas)
```

`applyRaceResult`: `money += total`; `totals.races++`; `totals.moneyEarned += total`; se pos 1: `wins++`, `firstWinPaid = true`; atualiza `bestPos`, `bestLapMs`, `bestTimeMs` (menor é melhor).

### Exemplos (Tranquilo, sem bônus de volta)

| Posição | t1 (P=200) | t1 + limpa | t3 (P=420) | t8 (P=1.600) |
|---|---|---|---|---|
| 1º | 200 (+100 1ª vitória) | 220 | 420 | 1.600 |
| 2º | 140 | 160 | 290 | 1.120 |
| 3º | 110 | 130 | 230 | 880 |
| 4º | 90 | 110 | 190 | 720 |
| 5º | 80 | 100 | 160 | 610 |
| 6º | 60 | 80 | 130 | 510 |

Garantia do "primeiro upgrade em até 2 corridas": a peça mais barata custa **$ 120** (Vidros novos / Faróis novos) = 2 × 6º lugar na t1 sem nenhum bônus.

## 8.2 Curva de preços

Regra usada para criar a tabela (para novas peças): `preço(tier) ≈ B_slot × G^(tier-1)` arredondado a 50, com `G ≈ 2,3–2,8` e `B_slot` entre 180 e 900. A **tabela abaixo é a fonte da verdade** (= `parts.json`).

### Restauração (9 peças, $ 3.190)

| Peça | Preço | Ganho | Camada | Requisito |
|---|---|---|---|---|
| Vidros novos | 120 | dir +1 | vidros → limpo | — |
| Faróis novos | 120 | dir +1 | farois → novo | — |
| Remover ferrugem | 250 | ade +1, frn +1 | ferrugem → oculta | — |
| Revisão do motor | 250 | acc +4 | sem fumaça, sem falha | — |
| Para-choques cromados | 300 | frn +1 | parachoques → cromado | — |
| Rodas originais | 300 | ade +2, dir +2 | rodas → original | — |
| Funilaria | 350 | vel +1, dir +2 | amassados → oculta | — |
| Pintura preta | 600 | vel +1 | pintura → preta | ferrugem + funilaria |
| Polimento e verniz | 900 | vel +1 | pintura → preta_brilhante | pintura preta |

### Desempenho (23 peças, $ 51.780)

| Slot | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---|---|---|---|
| Motor | V8 289 — 900 (acc+8 vel+8) | V8 302 — 2.200 (+10/+10) | V8 390 — 4.500 (+12/+12) | V8 428 — 8.000 (+14/+14) |
| Turbo/compressor | Turbo — 3.500 (acc+8 vel+5), req. V8 390 | Compressor — 6.000 (acc+9 vel+6), req. V8 428 | — | — |
| Câmbio | 4 marchas — 500 (acc+4 vel+3) | Esportivo — 1.500 (+6/+4) | Corrida — 3.500 (+6/+5) | — |
| Escapamento | Novo — 200 (acc+1 vel+2) | Duplo — 800 (+1/+2) | Esportivo — 2.000 (+2/+3) | — |
| Pneus | Novos — 180 (ade+8 frn+2 dir+4) | Esportivos — 900 (+10/+3/+4) | Corrida — 2.600 (+12/+3/+4) | — |
| Suspensão | Nova — 400 (ade+6 dir+12) | Esportiva — 1.400 (+8/+14) | Corrida — 3.200 (+10/+16) | — |
| Freios | Disco diant. — 300 (frn+18) | Disco 4 rodas — 1.200 (frn+22) | Corrida — 3.000 (frn+30) | — |
| Aerodinâmica | Defletor — 1.500 (vel+4 ade+10 dir+5) | Kit — 3.500 (vel+4 ade+11 dir+5) | — | — |

### Estética (21 itens, $ 15.200, sem efeito em desempenho; libera com ferrugem + funilaria + pintura preta)

| Slot | Itens (preço) |
|---|---|
| Rodas | Cinco raios 600 · Cromadas 800 · Raiadas 1.000 · Pretas 1.200 |
| Faixas | Brancas 400 · Vermelhas 500 · Lateral 600 · Douradas 800 |
| Aerofólio | Rabo de pato 700 · Alto 1.500 |
| Luzes | Faróis auxiliares 500 · Neon azul 1.200 |
| Adesivos | Número 68 300 · Raio 500 · Chamas 600 |
| Cor (requer Polimento) | Preto da família 0 · Vermelho 1.000 · Azul 1.000 · Verde 1.000 · Branco 1.000 |

## 8.3 Desbloqueio de pistas

| Pista | Nível do carro | Extra |
|---|---|---|
| t1 | 0 | — |
| t2 | 15 | — |
| t3 | 22 | — |
| t4 | 30 | — |
| t5 | 40 | — |
| t6 | 48 | — |
| t7 | 58 | — |
| t8 | 70 | restauração completa (9/9) |

## 8.4 Ritmo esperado (simulação)

Modelo da simulação (`tools/sim-economy.mjs` deve reproduzir): o jogador corre na pista desbloqueada que mais paga em média; sua posição = 1 + nº de IAs com `rating × aiRatingMul > nívelDoCarro − handicap`; recebe posição + 10% (média de bônus) + 15% se vencer + 1ª vitória; após cada corrida compra a peça disponível **mais barata** (restauração e desempenho; estética ignorada). `handicap` = quanto pior a criança dirige que a IA (em pontos de nível).

| Marco (nº da corrida) | Tranquilo h=6 | Normal h=3 | **Normal h=6** | Normal h=10 | Desafio h=6 |
|---|---|---|---|---|---|
| 1ª compra | 2 | 2 | **2** | 2 | 2 |
| t3 liberada (nível 22) | 19 | 17 | **20** | 23 | 20 |
| Restauração básica (estética liberada) | 22 | 20 | **23** | 29 | 23 |
| Restauração completa | 27 | 25 | **28** | 35 | 29 |
| t5 liberada (nível 40) | 36 | 34 | **39** | 47 | 40 |
| t7 liberada (nível 58) | 49 | 49 | **56** | 66 | 57 |
| Carro máximo (nível 91) | 65 | 68 | **76** | 88 | 82 |
| + toda a estética | ~+12 corridas | | | | |

Com corridas de 1–2 min + garagem, o carro máximo leva ≈ 76 corridas ≈ 4–5 h de jogo por criança; compras acontecem a cada 1–3 corridas até a corrida 40 e a cada 3–5 depois.

Política "só restauração primeiro" (Normal h=6): restauração completa na corrida 28 (sem ganho de nível, fica mais tempo na t1) — o jogo continua viável.

## 8.5 Como ajustar

| Sintoma no teste com as crianças | Ajuste (um por vez) |
|---|---|
| Ganha sempre em 1º no Tranquilo e enjoa | Sugerir Normal; ou `difficulty.tranquilo.aiRatingMul` 0,70 → 0,80 |
| Fica em último sempre | `aiRatingMul` −0,1 no nível usado; `rubberBand` +0,05; checar se assistência está "Forte" |
| Demora para comprar | `tracks[].prize` × 1,2 (todas) — não mexer nos preços |
| Compra rápido demais / acaba cedo | preços de desempenho tier ≥ 2 × 1,2 |
| Nova pista demora | baixar `unlock.minCarLevel` da pista em 3–5 |
| Carro sai da pista nas curvas no início | `physics.statToPhysics.centrifugal.base` 0,60 → 0,52 |
| Virar parece lento | `physics.statToPhysics.steer.base` 2,2 → 2,5 |
| Corridas longas demais | reduzir os `n` das retas em `tracks.json` (e atualizar `segments`) |
| Engasgos no iPad | `render.drawDistance` 150 → 100 |

Depois de qualquer ajuste: rodar `node tools/sim-economy.mjs` e conferir que (a) 1ª compra ≤ 2 corridas, (b) restauração completa entre 20 e 35, (c) carro máximo entre 60 e 95 em Normal h=6.

## 8.6 Dificuldade (resumo)

| | Tranquilo (padrão) | Normal | Desafio |
|---|---|---|---|
| Rating da IA × | 0,70 | 0,90 | 1,05 |
| Skill da IA + | −0,15 | −0,07 | 0 |
| Rubber band | 0,15 | 0,10 | 0,05 |
| Prêmio × | 1,00 | 1,15 | 1,30 |
