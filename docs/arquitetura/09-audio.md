# 9. Design de áudio

## 9.1 Grafo Web Audio

```
                       ┌─ music (GainNode, settings.musicVolume; 0,3× na pausa) ─┐
 fontes ──────────────►├─ sfx   (GainNode, settings.sfxVolume)                   ├─► master (GainNode: 0 se mudo, senão 1) ─► DynamicsCompressor ─► destination
                       └─ engine(GainNode, 0,7 × settings.sfxVolume)             ┘
```

- **Um** `AudioContext` (`new (window.AudioContext || window.webkitAudioContext)()`), criado no primeiro `pointerup` (bootState). Antes disso, nenhuma chamada de áudio (todas as funções viram no-op se `ctx` for null).
- `unlock()`: `ctx.resume()` + tocar um buffer silencioso de 1 amostra. Repetir `resume()` em todo `pointerup` enquanto `ctx.state !== 'running'` (iOS volta para `interrupted` após ligação/Siri/troca de app).
- Mudo: botão no menu, nos ajustes e na pausa (`ico.som`/`ico.mudo`); persiste em `settings.muted`. Mudo = `master.gain = 0` (rampa de 50 ms), não suspende o contexto.
- Todo som é `AudioBufferSourceNode` tocando um `AudioBuffer` de `assetLoader.getAudioBuffer(id)`.

## 9.2 Inventário de sons e gatilhos

| Id | Barramento | Gatilho (evento → ação) | Voz máx. |
|---|---|---|---|
| `mus.menu` | music | `state:changed` → boot/profile/menu/settings | 1 |
| `mus.garagem` | music | garage/trackSelect; fim do stinger de resultado | 1 |
| `mus.corrida` | music | `race:go` (volume 0,6× para o motor aparecer) | 1 |
| `mus.vitoria` | music | results com posição 1 (sem loop, ~6 s) | 1 |
| `mus.resultado` | music | results com posição 2–6 (sem loop, ~5 s) | 1 |
| `sfx.ui_toque` | sfx | `ui:tap {kind:'normal'}` | 2 |
| `sfx.ui_voltar` | sfx | `ui:tap {kind:'voltar'}` | 1 |
| `sfx.ui_negado` | sfx | `ui:denied` (sem dinheiro/requisito) — som suave, sem "erro" agressivo | 1 |
| `sfx.compra` | sfx | `shop:bought` | 1 |
| `sfx.instalar_restauracao` | sfx | `shop:bought` categoria restauração (atraso 150 ms) | 1 |
| `sfx.instalar_desempenho` | sfx | `shop:bought` categoria desempenho (atraso 150 ms) | 1 |
| `sfx.equipar_visual` | sfx | `shop:bought` estética e `shop:equipped` | 1 |
| `sfx.desbloqueio` | sfx | `progress:unlocked` | 1 |
| `sfx.partida_motor` | sfx | entrada no estado race | 1 |
| `sfx.contagem` | sfx | `race:countdown` | 1 |
| `sfx.largada` | sfx | `race:go` | 1 |
| `sfx.batida_muro` | sfx | `race:hit {kind:'muro'}`, volume = 0,3 + 0,7×intensity; ignora se < 0,15 | 2 |
| `sfx.batida_carro` | sfx | `race:hit {kind:'carro'}` | 2 |
| `sfx.derrapagem` | sfx (loop) | `race:skid {on:true}` inicia loop, volume = clamp(slip/0,6) atualizado por quadro; `on:false` → rampa 150 ms a 0 e para | 1 |
| `sfx.volta` | sfx | `race:lap` do jogador | 1 |
| `sfx.ultima_volta` | sfx | `race:lap` com `isFinalLapNext` | 1 |
| `sfx.chegada_vitoria` / `sfx.chegada` | sfx | `race:finished` (posição 1 / outras) | 1 |
| `sfx.moeda` | sfx | `money:counted` (limite: 1 a cada 50 ms) | 3 |
| `sfx.reboque` | sfx | `race:respawn` | 1 |
| `eng.*` | engine | contínuo durante race (9.3) | 2 + 1 |

Limite de vozes: se o id já tem o máximo tocando, para a mais antiga.

## 9.3 Motor (`engineSound.js` + `rpmModel.js`)

### Perfis de motor

| `engineProfile` | Cilindros | Marcha lenta | Redline | Caráter |
|---|---|---|---|---|
| `i6_200` | 6 | 750 | 4.400 | `rateando`: fino, irregular |
| `v8_289` | 8 | 800 | 5.800 | `v8` |
| `v8_302` | 8 | 800 | 6.000 | `v8` |
| `v8_390` | 8 | 750 | 5.600 | `v8_grave` |
| `v8_428` | 8 | 700 | 5.800 | `v8_grave` |

Os dados acima ficam no manifesto (`eng.<perfil>.low/high` → `synth.cyl`, `refRpm`) e em uma tabela `ENGINE_PROFILES` em `rpmModel.js` (idle, redline).

### rpm (`computeRpm`)

```
vn = clamp(speed / topSpeed, 0, 1)
if speed < 5: return { rpm: idle, gear: 1 }
gear = min(gears, floor(vn * gears) + 1)
t = vn * gears - (gear - 1)                       // 0..1 dentro da marcha
rpm = idle + (redline - idle) * (0.35 + 0.65 * t)  // cai para 35% da faixa ao trocar de marcha
```
Teste: `gears=3`, `vn` 0,32 → marcha 1; 0,34 → marcha 2; rpm em `vn=0,999` ≈ redline.

### Síntese em tempo real

```
2 fontes em loop: low (refRpm_low) e high (refRpm_high), cada uma com GainNode próprio
playbackRate_x = rpm / refRpm_x                         (limitado a 0,5..2,0)
mix = clamp((rpm - refRpm_low) / (refRpm_high - refRpm_low), 0, 1)
gain_low = cos(mix * π/2) ; gain_high = sin(mix * π/2)   (crossfade de potência constante)
carga = 0.55 + 0.45 * throttle                           // acelerando soa mais alto
filtro lowpass: freq = 600 + 2400 * (rpm / redline) * (0.6 + 0.4 * throttle) ; Q 0,7
escapamento (exhaust 0..3): ganho extra 0,9 / 1,0 / 1,1 / 1,2 ; exhaust 0 adiciona chiado (ruído passa-alta 3 kHz, ganho 0,05)
indução: turbo/compressor → fonte extra eng.turbo|eng.compressor, rate = rpm/4000, ganho = 0,25 * throttle * (rpm/redline)
falhando (flags.falhando): LFO 7 Hz no ganho (profundidade 0,35) + a cada 0,2–0,6 s (rng) derruba ganho a 0,15 por 40 ms
fumaca (flags.fumaca): effects.emitSmoke no ponto do escapamento a cada 0,12 s com throttle > 0,5
todas as mudanças de parâmetro com setTargetAtTime(valor, agora, 0.03)
```

Na garagem, após comprar motor: `start(build)`, rampa de rpm idle → redline em 0,8 s, volta a idle em 0,8 s, `stop()` com fade de 0,4 s.

## 9.4 Receitas de placeholder (`synth.js`)

Renderizadas uma vez após o desbloqueio do áudio, em `OfflineAudioContext(1 canal, 22050 Hz)`; música em 2 canais. Tempo total alvo ≤ 1,5 s no iPad (renderizar música da corrida por último e sob demanda).

| `gen` | Parâmetros | Síntese |
|---|---|---|
| `blip` | `freq`, `dur`, `wave` (padrão square) | oscilador + envelope ataque 5 ms, decaimento exponencial |
| `arpeggio` | `notes` (MIDI), `step`, `wave` | notas em sequência; cada uma `step` s com envelope curto |
| `noise_hit` | `dur`, `lowpass` | ruído branco → lowpass → envelope decaimento 1/e em dur/4 |
| `skid` | `dur` | ruído → bandpass 1.800 Hz Q 4 + LFO 13 Hz no ganho; loop sem clique (fade 10 ms nas pontas) |
| `sparkle` | `dur` | 8 senos agudos aleatórios (2–5 kHz, seed fixa) com envelopes curtos espalhados |
| `ratchet` | `dur` | 10 cliques de ruído filtrado (catraca) espaçados igualmente |
| `whine` | `freq` | seno + seno ×2 (ganho 0,3), loop de 1 s |
| `engine` | `cyl`, `rpm`, `character`, `seconds` | frequência de disparo `f = rpm/60 × cyl/2`; soma: dente-de-serra em f (0,5), quadrada em f/2 (0,3), ruído lowpass 200 Hz (0,1); `v8`: + seno em f/4 (0,4) para batida "grave"; `v8_grave`: igual com f/4 (0,6) e lowpass 900 Hz; `rateando`: modulação aleatória de amplitude a cada ciclo de disparo (±30%); duração real = `round(seconds × f/2) / (f/2)` (número inteiro de ciclos de f/2 → loop sem clique) |
| `rock` | `pattern`, `bpm` | ver 9.5 |

## 9.5 Música placeholder (`musicPatterns.js`)

Estrutura comum: 4/4, 8 compassos, loop. Instrumentos: **bateria** (bumbo = seno 60→40 Hz 120 ms; caixa = ruído bandpass 1,8 kHz 100 ms; chimbal = ruído highpass 7 kHz 30 ms), **baixo** (dente-de-serra, lowpass 500 Hz), **guitarra** (power chord = fundamental + quinta + oitava em dente-de-serra, passando por WaveShaper `tanh(3x)` e lowpass 3 kHz).

| Padrão | BPM | Tom | Progressão (1 acorde por compasso) | Bateria | Baixo |
|---|---|---|---|---|---|
| `menu` | 120 | Mi | E E A A E E B A | bumbo 1 e 3, caixa 2 e 4, chimbal colcheias | colcheias na fundamental |
| `garagem` | 100 | Lá | A A D D A A E D | bumbo 1, caixa 3, chimbal semínimas (calmo, "surf") | semínimas, fundamental e quinta alternadas |
| `corrida` | 150 | Mi | E G A E E G B A | bumbo 1, 2½, 3; caixa 2 e 4; chimbal colcheias | colcheias contínuas |
| `vitoria` | 160 | Mi | E A B E (1 compasso cada) + 1 compasso final de E sustentado; total 5 compassos, sem loop | virada de caixa em semicolcheias no compasso 4 | semínimas |
| `resultado` | 110 | Lá | A D E A (4 compassos, sem loop) | leve | semínimas |

Guitarra: `menu` e `corrida` tocam o power chord em colcheias com palm mute (envelope 80 ms); `garagem` toca 1 vez por tempo com sustain 300 ms; `vitoria` sustain longo.

Requisito da arte final (Fase 2): músicas originais (compostas/sintetizadas pela família ou produtor), sem samples licenciados; loops exatos em número inteiro de compassos; `.m4a` AAC 128 kbps, 44,1 kHz; motores: gravações/sínteses em rpm constante = `refRpm` do manifesto, 1–2 s, loop sem clique.
