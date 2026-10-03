# 4. Schemas de dados (JSON)

Os arquivos **completos e válidos** estão em [`dados/`](dados/). Esta seção define cada campo. Todo arquivo tem `"schemaVersion": 1` na raiz.

## 4.1 `data/car.json` — Mustang base ([arquivo](dados/car.json))

| Campo | Tipo | Significado |
|---|---|---|
| `id` | string | `"mustang68"` |
| `world.length` / `world.width` | número (u) | 96 × 48: tamanho do carro no mundo |
| `world.collisionRadius` | número (u) | 26: círculo usado em carro×carro e carro×muro |
| `baseStats` | Stats | Estado "ferrado": `acc 10, vel 10, ade 12, frn 10, dir 15` → nível 11 |
| `flagsDefault` | objeto | `fumaca: true` (fumaça no escapamento), `falhando: true` (motor rateando) |
| `views.top` / `views.side` | objeto | `size` (px lógicos), `anchor` (0–1), `artScale` (2 = PNG final tem o dobro), `points` (pontos de efeito em px lógicos do sprite) |
| `layers[]` | `{id, z, default}` | Camadas, ordem de desenho e variante padrão (`null` = camada oculta) |
| `customUnlockRequires` | string[] | Peças que liberam a aba Estética: `fer_1`, `fun_1`, `pin_1` |

**Estados do carro** (todos derivados do save, nenhum salvo como "estado"):

| Estado | Condição | Nível |
|---|---|---|
| Ferrado (inicial) | todas as peças tier 0 | 11 |
| Restauração básica | `fer_1` + `fun_1` + `pin_1` | ≥ 13 |
| Restaurado | 9 peças de restauração | ≥ 15 |
| Máximo | tudo de restauração + desempenho no tier máximo | **91** (`acc 95, vel 95, ade 90, frn 90, dir 85`) |

## 4.2 `data/parts.json` — peças ([arquivo](dados/parts.json))

```json
{
  "schemaVersion": 1,
  "slots": [ { "id": "motor", "category": "desempenho", "label": "Motor", "icon": "ico.motor" } ],
  "parts": [
    {
      "id": "mot_3", "slot": "motor", "tier": 3,
      "name": "V8 390", "desc": "Motor grande com tomada de ar.",
      "price": 4500,
      "requires": [],
      "stats": { "acc": 12, "vel": 12 },
      "visual": [ { "layer": "capo", "variant": "tomada_ar", "priority": 10 } ],
      "flags": {},
      "engineProfile": "v8_390"
    }
  ]
}
```

| Campo | Tipo | Regras |
|---|---|---|
| `slots[].category` | `restauracao` \| `desempenho` \| `estetica` | define a aba da loja |
| `parts[].id` | string única | prefixo do slot + `_` + tier (estética: `c_xxx_nome`) |
| `tier` | int | restauração/desempenho: 0 = peça de fábrica (preço 0, não aparece na loja); compra sequencial 1, 2, 3, 4. Estética: sempre 1 |
| `price` | int | em $; múltiplo de 10 |
| `requires` | string[] | ids de peças; ver regra em `partsCatalog.isRequirementMet` |
| `stats` | Stats parcial | **ganho incremental** deste tier (cumulativo com os tiers anteriores) |
| `visual[]` | `{layer, variant, priority}` | `variant: null` esconde a camada |
| `flags` | objeto | sobrescreve `flagsDefault` |
| `engineProfile` | string | só slot `motor` |
| `gears` | int | só slot `cambio` |
| `exhaust` | int | só slot `escapamento` (0–3) |
| `induction` | string | só slot `inducao` |

Totais: 9 peças de restauração ($ 3.190), 23 de desempenho ($ 51.780), 21 estéticas ($ 15.200).

## 4.3 `data/tracks.json` — pistas ([arquivo](dados/tracks.json))

```json
{
  "id": "t1", "name": "Rua do Bairro", "league": 1, "order": 1, "theme": "bairro",
  "laps": 3, "roadHalfWidth": 130, "grassWidth": 90,
  "prize": 200,
  "unlock": { "minCarLevel": 0, "requiresFullRestoration": false },
  "opponents": ["o01","o02","o03","o04","o05"],
  "scatter": { "assets": ["dec.arvore","dec.casa","dec.poste"], "per1000": 6, "seed": 1000,
               "minDistFromWall": 40, "maxDistFromWall": 420 },
  "points": [[0,0],[1400,0],[2300,100], "..."]
}
```

| Campo | Regras |
|---|---|
| `theme` | `bairro` \| `cidade` \| `serra` \| `autodromo` → padrão de grama `trk.grama.<theme>` e cor de fundo |
| `points` | pontos de controle Catmull-Rom, em u, fechado (o último liga no primeiro), sentido horário; a largada fica no ponto 0, com o carro apontando para o ponto 1 |
| `scatter.per1000` | decorações por 1000 u de pista, **de cada lado** |
| `unlock.minCarLevel` | nível do carro mínimo |

| Pista | Liga | Comprimento (u) | Meia-largura | Prêmio | Nível mín. | Oponentes (rating) |
|---|---|---|---|---|---|---|
| t1 Rua do Bairro | 1 | 8.568 | 130 | 200 | 0 | 6, 9, 12, 15, 18 |
| t2 Vila das Palmeiras | 1 | 9.158 | 130 | 240 | 15 | 9, 12, 15, 18, 22 |
| t3 Avenida do Porto | 2 | 11.417 | 125 | 420 | 22 | 18, 22, 26, 30, 34 |
| t4 Parque da Cidade | 2 | 11.687 | 125 | 480 | 30 | 22, 26, 30, 34, 40 |
| t5 Serra das Curvas | 3 | 12.413 | 120 | 750 | 40 | 34, 40, 45, 50, 55 |
| t6 Estrada do Litoral | 3 | 14.187 | 120 | 850 | 48 | 40, 45, 50, 55, 62 |
| t7 Autódromo Clássico | 4 | 16.707 | 110 | 1.300 | 58 | 55, 62, 68, 74, 80 |
| t8 Grande Final | 4 | 16.944 | 110 | 1.600 | 70 + restauração completa | 62, 68, 74, 80, 88 |

## 4.4 `data/opponents.json` — adversários ([arquivo](dados/opponents.json))

```json
{ "id": "o04", "driver": "Duda", "car": "Foguete", "body": "muscle", "color": "#f07a1a",
  "rating": 15, "skill": 0.89, "laneOffset": -0.15, "mistakeRate": 0.06 }
```

| Campo | Regras |
|---|---|
| `body` | `muscle` \| `roadster` \| `coupe` \| `perua` (só afeta o placeholder) |
| `rating` | 0–100; vira os 5 stats da IA (todos iguais) após multiplicador de dificuldade |
| `skill` | 0,85–1,0; fator de velocidade de curva |
| `laneOffset` | −0,35..0,35 × meia-largura: faixa preferida |
| `mistakeRate` | erros por segundo (ruído de direção) |
| sprite | `opp.<id>.top` no manifesto |

## 4.5 `data/balance.json` ([arquivo](dados/balance.json))

Seções: `physics`, `assist`, `ai`, `difficulty`, `economy`, `race`, `camera`. Cada número é usado por exatamente uma fórmula das seções 7 e 8. **Nenhuma constante de balanceamento no código.**

## 4.6 Save (`localStorage['mustang68.save']`)

```json
{
  "schemaVersion": 1,
  "createdAt": 1767225600000,
  "updatedAt": 1767225600000,
  "settings": {
    "muted": false,
    "musicVolume": 0.6,
    "sfxVolume": 0.9,
    "lastProfileId": "p1"
  },
  "profiles": {
    "p1": {
      "id": "p1",
      "name": "Piloto 1",
      "helmet": "capacete_azul",
      "createdAt": 1767225600000,
      "money": 0,
      "difficulty": "tranquilo",
      "assist": "forte",
      "autoAccel": true,
      "installed": {
        "ferrugem": "fer_0", "funilaria": "fun_0", "vidros": "vid_0", "farois": "far_0",
        "parachoques": "pch_0", "rodas": "rod_0", "revisao": "rev_0", "pintura": "pin_0",
        "motor": "mot_0", "inducao": "ind_0", "cambio": "cam_0", "escapamento": "esc_0",
        "pneus": "pne_0", "suspensao": "sus_0", "freios": "fre_0", "aero": "aer_0"
      },
      "owned": [],
      "equipped": { "c_rodas": null, "c_faixas": null, "c_aerofolio": null,
                    "c_luzes": null, "c_adesivos": null, "c_cor": null },
      "tracks": {
        "t1": { "races": 0, "wins": 0, "bestPos": null, "bestLapMs": null, "bestTimeMs": null, "firstWinPaid": false }
      },
      "seenUnlocks": ["t1"],
      "totals": { "races": 0, "wins": 0, "moneyEarned": 0, "moneySpent": 0 },
      "tutorialDone": false
    },
    "p2": { "id": "p2", "name": "Piloto 2", "helmet": "capacete_vermelho", "...": "idem p1" }
  }
}
```

Regras:
- `tracks` contém entrada só para pistas já corridas (criada em `applyRaceResult`).
- `installed` sempre tem os 16 slots de restauração/desempenho.
- Valores válidos: `difficulty` ∈ chaves de `balance.difficulty.levels`; `assist` ∈ `desligada|media|forte`; `helmet` ∈ `capacete_azul|capacete_vermelho|capacete_verde|capacete_amarelo`.
- Arquivo de exportação: `{ "app": "mustang68", "exportedAt": <ms>, "save": <SaveData> }`, nome `mustang68-save-AAAA-MM-DD.json`.

### Versionamento e migração

1. `load()` lê o JSON → `migrate(raw)`.
2. `migrate` aplica em sequência toda migração com `from === raw.schemaVersion` até chegar em `SCHEMA_VERSION`.
3. Depois da migração, **normaliza**: para cada perfil, slots ausentes em `installed` recebem a peça tier 0; ids de peça inexistentes no catálogo voltam para tier 0 (e o dinheiro da peça é devolvido: `money += price`); `equipped` com id não possuído vira `null`.
4. `schemaVersion > SCHEMA_VERSION` → não sobrescreve nada; mostra "Este save é de uma versão mais nova do jogo."
5. Toda migração nova vem com um teste com JSON de entrada fixo e saída esperada.

## 4.7 Manifesto de assets (`assets/manifest.json`) ([arquivo](dados/assets.manifest.json))

```json
{
  "schemaVersion": 1,
  "images": {
    "car.top.pintura.preta": {
      "kind": "carLayer",
      "size": [112, 56], "anchor": [0.5, 0.5],
      "src": "img/car/top/pintura__preta.png",
      "ph": [ { "t": "rrect", "x": 8, "y": 6, "w": 96, "h": 44, "r": 9, "fill": "#161616" } ]
    }
  },
  "audio": {
    "eng.v8_289.low": { "kind": "engine", "loop": true, "refRpm": 1200,
                        "src": "audio/engine/v8_289_low.m4a",
                        "synth": { "gen": "engine", "cyl": 8, "rpm": 1200, "character": "v8", "seconds": 1.0 } }
  }
}
```

| Campo | Regras |
|---|---|
| chave | id do asset. Convenções: `car.<view>.<camada>.<variante>`, `opp.<id>.top`, `trk.*`, `dec.*`, `fx.*`, `ico.*`, `mus.*`, `eng.*`, `sfx.*` |
| `kind` (imagem) | `carLayer` \| `sprite` \| `pattern` (repetível, 128×128 u) \| `icon` (DOM, 96×96) |
| `size` | px lógicos. O PNG final tem `size × 2` |
| `anchor` | fração do tamanho; ponto que vai na posição do objeto |
| `src` | caminho relativo a `assets/`. Na Fase 1 o arquivo **não existe** → usa `ph` |
| `ph` | lista de formas: `rect{x,y,w,h}`, `rrect{x,y,w,h,r}`, `circle{x,y,r}`, `ellipse{x,y,rx,ry}`, `poly{pts:[[x,y]...]}`, `line{x1,y1,x2,y2,w,stroke}`, `text{x,y,text,size}`; comuns: `fill` (#hex), `a` (alpha 0–1, padrão 1) |
| `kind` (áudio) | `music` \| `engine` \| `sfx` |
| `loop` | boolean |
| `refRpm` | só `engine`: rpm em que o sample foi gravado (playbackRate = rpm/refRpm) |
| `synth` | receita de placeholder (geradores em [09-audio.md](09-audio.md#94-receitas-de-placeholder)) |

**Troca para a Fase 2:** colocar o arquivo no caminho de `src`. Nada mais. Se o arquivo existir, ele vence; se faltar ou falhar, o placeholder é usado e um aviso vai para `console.warn` (nunca quebra o jogo).

Conteúdo do manifesto entregue: 92 camadas do carro (46 variantes × 2 vistas), 18 oponentes, 8 padrões de pista, 11 decorações, 4 efeitos, 45 ícones, 5 músicas, 12 amostras de motor, 20 efeitos sonoros.
