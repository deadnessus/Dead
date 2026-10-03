# 12. Checklist de testes no iPad e armadilhas do Safari/iOS

## 12.1 Como testar

| Fase | Como abrir no iPad |
|---|---|
| Desenvolvimento (rede local) | `python3 -m http.server 8080` no computador → no iPad `http://<IP-do-computador>:8080`. Service worker **não** funciona em HTTP fora de localhost (normal). |
| Depuração | iPad: Ajustes → Apps → Safari → Avançado → **Web Inspector** ligado. Mac: Safari → Desenvolvedor → [iPad] → página. Sem Mac: usar `?debug=1` (fps e erros na tela). |
| PWA real | Abrir a URL HTTPS publicada (seção 13) → Compartilhar → **Adicionar à Tela de Início** → abrir pelo ícone. |

## 12.2 Checklist (marcar em cada versão)

### Instalação e tela
- [ ] Ícone aparece na tela de início com o nome "Mustang 68"
- [ ] Abre em tela cheia, sem barra do Safari
- [ ] Em retrato aparece "Gire o iPad"; em paisagem some
- [ ] Nada fica sob o notch/cantos arredondados/barra de início (safe areas) nos 4 lados, nas duas paisagens
- [ ] Nenhum zoom com duplo toque ou pinça em nenhuma tela
- [ ] Segurar o dedo não abre lupa, menu de copiar ou seleção de texto
- [ ] Puxar para baixo não "estica" a página (sem rubber band)
- [ ] Deslizar da borda esquerda não volta página

### Áudio
- [ ] Nenhum som antes do primeiro toque; depois do toque, música toca
- [ ] Com o modo silencioso do iPad ligado o jogo fica mudo (comportamento padrão do iOS, mantido de propósito); Ajustes mostra a dica "Sem som? Confira o modo silencioso"
- [ ] Trocar de app e voltar: som volta após o próximo toque
- [ ] Receber notificação/alarme durante a corrida: jogo pausa e som volta
- [ ] Botão mudo silencia tudo e continua mudo após fechar e abrir o app
- [ ] Motor muda de timbre ao trocar o motor na garagem (6cc falhando → V8)
- [ ] Sem estalos no loop de música e de motor

### Controles
- [ ] ◀ e ▶ respondem imediatamente com o polegar; segurar mantém a direção
- [ ] Dois dedos (◀ + FREIO) e três dedos funcionam juntos
- [ ] Soltar o dedo fora do botão solta o botão (não fica "preso")
- [ ] Botões confortáveis para mão de criança de 9 anos (pedir para eles testarem)
- [ ] Aceleração automática liga/desliga nos Ajustes e o botão ACELERAR aparece/some

### Desempenho
- [ ] `?debug=1`: ≥ 58 fps na t8 com 6 carros, fumaça e morros (se não, `render.drawDistance` 150 → 100)
- [ ] Pista não "pisca" nem dobra ao completar a volta (passagem pelo segmento 0)
- [ ] Objetos e carros somem atrás de morros sem aparecer "flutuando"
- [ ] Sem engasgos ao entrar/sair da corrida
- [ ] 15 min jogando sem esquentar demais nem travar
- [ ] Carregamento inicial < 5 s (depois da primeira vez)

### Save
- [ ] Perfil 1 e perfil 2 independentes (dinheiro, peças, pistas)
- [ ] Fechar o app pelo multitarefa logo após comprar: a compra continua lá
- [ ] Desligar e ligar o iPad: progresso mantido
- [ ] Exportar save gera arquivo (Compartilhar → Salvar em Arquivos)
- [ ] Importar o arquivo restaura os dois perfis
- [ ] Modo avião: o app abre e joga normalmente (PWA instalada)

### Jogo (com as crianças)
- [ ] Completa a 1ª corrida com o carro ferrado sem ajuda
- [ ] Compra a 1ª peça até a 2ª corrida
- [ ] Entende os ícones sem ler (perguntar "o que esse botão faz?")
- [ ] Nenhuma frase cortada; todo texto em português

## 12.3 Armadilhas conhecidas e como a arquitetura trata

| Armadilha | Sintoma | Tratamento |
|---|---|---|
| Áudio bloqueado até gesto | Silêncio total | `AudioContext` criado e `resume()` dentro de `pointerup` no bootState; `resume()` repetido em todo toque enquanto `state !== 'running'` |
| Contexto `interrupted` | Som some após ligação/Siri/troca de app | `visibilitychange` → `suspend`; volta → `resume` no próximo toque |
| `decodeAudioData` antigo | Promessa não resolve em iOS antigo | Usar a forma com callbacks envolvida em Promise |
| Modo silencioso | Web Audio fica mudo com o iPad no silencioso | Decisão: respeitar o silencioso (não usar `navigator.audioSession.type = 'playback'`); dica em Ajustes |
| Viewport 100vh | Altura errada/salta | Usar `window.innerHeight` em `viewport.js` + `position:fixed; inset:0` |
| Safe areas | Botões sob cantos/barra | `viewport-fit=cover` + `env(safe-area-inset-*)` em CSS e em `viewport.safe` |
| Duplo toque = zoom | Tela pula | `touch-action:none` em html/body/canvas/botões + `user-scalable=no` + `preventDefault` em `gesturestart` |
| Toque longo | Lupa/menu de contexto | `-webkit-touch-callout:none; -webkit-user-select:none` |
| Eventos de mouse simulados | Clique duplo nos botões | Só Pointer Events; nunca misturar `touchstart` e `click` no mesmo botão |
| Orientação no manifest | iOS ignora `orientation` | Overlay "Gire o iPad" |
| Canvas grande demais | Tela preta/crash (limite ~16 M px por canvas e memória total) | DPR ≤ 2; nenhum canvas maior que a tela; cache de sprites LRU 8; fundos só do tema atual, em escala 1 |
| Armazenamento separado | Save do Safari ≠ save do ícone | Instalar a PWA **antes** de começar a jogar; export/import para migrar |
| Limpeza de dados (ITP 7 dias) | Save some em site não usado | PWA na tela de início não sofre a regra de 7 dias; mesmo assim `navigator.storage.persist()` e export manual de vez em quando |
| `localStorage` lança exceção | Modo privado/cheio | `storageBackend` com try/catch + toast "Não deu para salvar" |
| Service worker preso em versão velha | Atualização não aparece | Versão por hash no nome do cache; faixa "Atualização pronta" + `SKIP_WAITING`; nunca trocar SW no meio da corrida |
| `pagehide` vs `unload` | Save perdido ao fechar | Gravar em `pagehide` e `visibilitychange` (hidden); nunca depender de `unload` |
| rAF a 120 Hz (ProMotion) | Física mais rápida | Passo fixo de 1/60 com acumulador; render interpolado |
| Fontes do sistema | Emoji diferente entre versões | Emojis só nos ícones placeholder (Fase 1) |
