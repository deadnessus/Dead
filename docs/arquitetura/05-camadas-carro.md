# 5. Sistema de camadas visuais do carro

![Placeholders: ferrado, restaurado, máximo](img/placeholder-camadas.png)

*Render real das receitas `ph` de `dados/assets.manifest.json`. Linha de cima: traseira (corrida) — ferrado, restaurado, máximo. Embaixo: lateral (garagem) nos mesmos três estados.*

O carro tem **duas vistas** com as **mesmas camadas e a mesma ordem**:
- `rear` (traseira): usada na corrida, centro inferior da tela.
- `side` (lateral): usada na garagem, menu e cartões de perfil.

Nesta versão só existem placeholders (decisão da família). O sistema continua pronto para a arte final: cada camada já tem o caminho do PNG definido.

## 5.1 Camadas, ordem de desenho e quem controla

`z` menor desenha primeiro (fica embaixo).

| z | Camada | Padrão (ferrado) | Variantes | Controlada por | Aparece na traseira? |
|---|---|---|---|---|---|
| 0 | `sombra` | `base` | base | fixa | sim |
| 5 | `neon` | — | azul | `c_luz_neon` | sim (brilho no chão) |
| 10 | `pneus` | `careca` | careca, novo, esportivo, slick | `pne_1..3` | sim (largura muda) |
| 20 | `rodas` | `enferrujada` | enferrujada, original, cinco_raios, cromada, raiada, preta | `rod_1` (prio 10), `c_rod_*` (prio 100) | pouco (filete do aro) |
| 30 | `carroceria` | `base` | base (metal cinza; silhueta) | fixa | sim |
| 40 | `pintura` | `desbotada` | desbotada, preta, preta_brilhante, vermelha, azul, verde, branca | `pin_1` (10), `pin_2` (20), `c_cor_*` (100) | sim |
| 50 | `ferrugem` | `ferrugem` | ferrugem | `fer_1` → oculta | sim |
| 60 | `amassados` | `amassado` | amassado | `fun_1` → oculta | sim |
| 70 | `faixas` | — | dupla_branca, dupla_vermelha, lateral, dupla_dourada | `c_fai_*` | sim |
| 80 | `adesivos` | — | numero_68, raio, chamas | `c_ade_*` | sim |
| 90 | `vidros` | `trincado` | trincado, limpo | `vid_1` | sim (vidro traseiro) |
| 100 | `capo` | — | tomada_ar, compressor | `mot_3`/`mot_4` (10), `ind_1` (20), `ind_2` (30) | só `compressor` (acima do teto); `tomada_ar` = vazio |
| 110 | `escapamento` | `furado` | furado, simples, duplo, esportivo | `esc_1..3` | sim |
| 120 | `parachoques` | `amassado` | amassado, cromado | `pch_1` | sim |
| 130 | `farois` | `trincado` | trincado, novo | `far_1` ("Faróis e lanternas") | sim: **lanternas de 3 barras** |
| 140 | `aero` | — | defletor, kit | `aer_1..2` | só `kit` (saias); `defletor` = vazio |
| 150 | `aerofolio` | — | rabo_de_pato, asa_alta | `c_aer_*` | sim |
| 160 | `luzes` | — | auxiliares | `c_luz_aux` | não (vazio) |

"Vazio" = a variante existe no manifesto com `ph: []` (e, na Fase 2, PNG transparente). O código não trata exceção.

Efeitos que **não** são camadas (desenhados por `effects.js` / `spriteRenderer.js` em coordenadas de tela): fumaça do escapamento (`flags.fumaca`), luz de freio (brilho vermelho sobre `lanternaEsq/Dir` quando `car.braking`), fumaça de pneu na derrapagem, poeira fora da pista, faíscas.

## 5.2 Algoritmo de resolução (`render/carLayers.js` → `resolveCarLayers`)

```
entrada: profile, data, catalog, view ('rear'|'side')
1. variant[layer.id] = layer.default; prio[layer.id] = 0          para cada layer de car.json
2. fontes = []
   para cada slot de restauração/desempenho:
       para t = 1 .. tier(installed[slot]):  fontes.push(peça do slot com tier t)
   para cada slot estético com equipped[slot] != null: fontes.push(peça equipada)
   (ordem de fontes = ordem de parts.json; isso decide empates)
3. para cada peça em fontes, para cada v em peça.visual:
       se v.priority >= prio[v.layer]: variant[v.layer] = v.variant; prio[v.layer] = v.priority
4. saída = layers de car.json, ordenadas por z, filtrando variant == null,
   mapeadas para { layerId, variant, z, assetId: `car.${view}.${layerId}.${variant}` }
5. se assets.has(assetId) == false → lançar Error (dados inconsistentes; o validador pega antes)
```

Propriedades garantidas (testar em `carLayers.test.js`):
- Perfil novo → 11 camadas: sombra, pneus.careca, rodas.enferrujada, carroceria.base, pintura.desbotada, ferrugem, amassados, vidros.trincado, escapamento.furado, parachoques.amassado, farois.trincado.
- `fer_1` instalado → `ferrugem` some.
- `pin_2` instalado → pintura = `preta_brilhante` (tier 2 vence tier 1 por prioridade 20 > 10).
- `c_cor_vermelha` equipada → pintura = `vermelha` (prio 100); desequipar → volta a `preta_brilhante`.
- `mot_4` + `ind_2` → capo = `compressor`.
- O resultado é o mesmo para `rear` e `side` exceto o prefixo do `assetId`.

## 5.3 Composição e cache (`render/carCompositor.js`)

- Chave de cache = `view + ':' + layersKey(layers)`; `layersKey` = `"layerId=variant"` unidos por `|` na ordem de z.
- Canvas offscreen do tamanho `size × artScale × dpr` (rear: 640×400×dpr; side: 1280×480×dpr).
- Para cada camada: `ctx.drawImage(assets.getImage(assetId), 0, 0, W, H)` (todas as camadas da mesma vista têm **o mesmo tamanho e a mesma âncora**, sem offset).
- LRU com 8 entradas. Oponentes não passam pelo compositor (1 sprite cada, `opp.<id>.rear`).
- Na corrida, o sprite traseiro do jogador é composto **uma vez** no `enter` do estado.

## 5.4 Convenções de arte (para quando houver arte final)

| Item | Traseira (`rear`) | Lateral (`side`) |
|---|---|---|
| Tamanho lógico / PNG | 320×200 / **640×400** | 640×240 / **1280×480** |
| Orientação | carro visto de trás, levemente de cima (câmera alta) | frente para a **direita** |
| Âncora | (0,5; 1,0) = chão sob o centro do carro | (0,5; 0,9) = chão sob o meio do carro |
| Área do carro | carroceria x 22–298 (`bodyWidth` 280 = 0,5 de pista), chão y=196, teto y≈34 | para-choques x≈28 a ≈620; chão y=216 |
| Pontos fixos | lanternas (67,126) e (253,126); escapamentos (72,176) e (248,176) | rodas (150,180) e (482,180), raio pneu 36–38, aro 22; escapamento (30,200) |
| Fundo | transparente | transparente |
| Iluminação | luz de cima | luz vinda do topo-esquerdo |

Regras de produção (valem para **todas** as camadas):
1. Cada camada é um PNG RGBA do **tamanho exato** acima, com o carro na **mesma posição**; trabalhar num arquivo-mestre com todas as camadas empilhadas e exportar cada uma com o canvas inteiro.
2. `carroceria.base` é a silhueta completa (metal cinza). `pintura.*` cobre a mesma silhueta com a cor/acabamento; vidros, cromados, lanternas e pneus ficam em suas camadas.
3. Camadas de "dano" (`ferrugem`, `amassados`) contêm **só** as marcas, com transparência ao redor.
4. Na lateral, os arcos das rodas são **vazados** na carroceria e na pintura (pneus e rodas ficam embaixo).
5. Nome do arquivo = `src` do manifesto: `img/car/<rear|side>/<camada>__<variante>.png`.
6. Conferência: `tools/layer-preview.html` (T29) empilha as camadas de 3 perfis-exemplo nas duas vistas.

## 5.5 Feedback de compra na garagem

Ao comprar uma peça com `visual` não vazio:
1. `garageScene.playUpgrade(layerIdsAfetadas)`: 0–300 ms brilho (`fx.brilho`) pulsando sobre o carro; em 300 ms troca o sprite composto; 300–900 ms crossfade do sprite antigo (alpha 1→0) sobre o novo.
2. Som `sfx.instalar_restauracao` (restauração/estética) ou `sfx.instalar_desempenho` (desempenho) + `sfx.compra`.
3. Barras de stats animam de valor antigo → novo em 600 ms; ganho aparece como "+8" verde por 1,5 s.
4. Peças de desempenho sem visual (freios, suspensão, câmbio): só passo 2 e 3 + o carro "pula" (escala 1→1,04→1 em 300 ms).
5. Motor: após a compra toca uma acelerada (`engineSound` em ponto morto, rpm sobe ao redline em 0,8 s e volta) com o novo perfil de motor.
6. Botão "Ver de trás" na garagem alterna a vista `side`/`rear` (a criança vê como o carro vai aparecer na corrida).
