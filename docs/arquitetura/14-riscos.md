# 14. Riscos na implementação por modelo simples e mitigações

| # | Risco (o que provavelmente vai dar errado) | Prob. | Impacto | Mitigação na arquitetura |
|---|---|---|---|---|
| 1 | **Inventar ou renomear contratos** entre sessões (cada sessão não lembra da anterior) | Alta | Alto | Contratos únicos em 03; prompt manda abrir os arquivos importados; testes de aceite chamam as funções pelos nomes do contrato |
| 2 | **Números mágicos** espalhados (velocidade, preço) divergindo dos dados | Alta | Médio | Toda constante de jogo em `data/*.json`; regra no CLAUDE.md e no prompt; revisão do diff no checklist do prompt |
| 3 | **Áudio mudo no iOS** (contexto criado antes do toque, sem `resume`) | Alta | Alto | Estado `boot` dedicado ao desbloqueio; todo o áudio vira no-op sem contexto; item no checklist 12 |
| 4 | **Física instável/dependente do fps** (usar `dt` variável, 120 Hz) | Média | Alto | Passo fixo no `loop.js`; render interpolado entre `prevZ/z`; testes numéricos de 07 §7.3 com faixas da simulação de referência |
| 5 | **Render pseudo-3D errado**: pista "dobrando" na volta (wrap de `z`), sprites atravessando morros, carros tremendo, curva acumulando errado (`x`/`dx`) | Alta | Alto | Algoritmo linha a linha em 07 §7.7; protótipo funcional em `referencia/prototipo-render.html` com imagens-alvo em `img/`; teste numérico de projeção; tarefa dividida em estrada (T19a) e sprites (T19b) |
| 6 | **IA saindo da pista ou lenta demais** | Média | Médio | Fórmula fechada com compensação da curva (feed-forward); teste "IA completa 3 voltas sem sair do asfalto" com tempos-alvo da simulação |
| 7 | **Assistência pilotando sozinha** (jogo sem desafio) ou inútil | Média | Médio | Fórmula de 7.5 simulada (sem tocar: termina no asfalto, 12–16% mais lento); teste com faixa 1,08–1,22× |
| 8 | **Arte final não encaixa** nas camadas | Média | Alto | Todas as camadas com o mesmo canvas e âncora; tamanhos/pontos fixos em 05 §5.4; `tools/layer-preview.html`; placeholders desenhados com as mesmas coordenadas |
| 9 | **Troca de assets exigir código** | Baixa | Alto | `src` já definido para cada asset; carregador tenta `src` e cai no placeholder sem erro; o mesmo caminho de código toca `AudioBuffer` sintetizado ou decodificado |
| 10 | **Save corrompido ou perdido** | Média | Muito alto (choro) | `.bak` a cada gravação; validação + normalização; export/import; flush em `pagehide`; testes de corrupção |
| 11 | **Migração de schema esquecida** ao mudar o save | Média | Alto | `SCHEMA_VERSION` + lista de migrações com teste obrigatório; normalização tolera slots/peças novos sem migração |
| 12 | **Arquivos gigantes / responsabilidades misturadas** | Alta | Médio | Limite de 250 linhas; árvore de arquivos fechada em 02; tabela de dependências permitidas |
| 13 | **Lógica de jogo acoplada ao DOM** (não testável) | Alta | Médio | Pastas puras sem `window`; testes em Node sem DOM forçam a separação |
| 14 | **Queda de fps no iPad** (muitos polígonos, alocação por quadro, sprites grandes) | Média | Alto | Regras de 07 §7.10; `drawDistance` ajustável em `balance.json` (150 → 100); fundos só do tema atual; `?debug=1` com tempos; DPR ≤ 2 |
| 15 | **Multitoque falhando** (botão "preso", eventos duplicados) | Média | Alto | Só Pointer Events, um `pointerId` por botão, solta em `pointerup/cancel/leave`; item de checklist |
| 16 | **Service worker servindo versão velha** ou misturada | Média | Médio | Precache com hash; `skipWaiting` só por botão; teste que confere a lista |
| 17 | **Economia desandar** depois de ajustes | Média | Médio | `tools/sim-economy.mjs` com metas numéricas (08 §8.5) |
| 18 | **Escopo extra** (modelo "melhora" o jogo por conta própria) | Alta | Médio | Lista "fora de escopo" em 01 §1.8; prompt proíbe funcionalidades extras e exige relatório de suposições |
| 19 | **Textos em inglês ou longos** | Média | Baixo | `strings.js` único; regra de ≤ 6 palavras em botões; checklist com as crianças |
| 20 | Haiku em tarefa de integração produz código que compila mas não funciona | Média | Médio | Haiku só em tarefas H (puras, com testes dados); todas as integrações são S |

## Pontos de verificação humana obrigatória (onde os testes automáticos não pegam)

1. Depois de **T13**: abrir no iPad real (toque, rotação, safe areas).
2. Depois de **T19a**: abrir `?debug=road` no iPad e medir fps (decide se `drawDistance` fica em 150).
3. Depois de **T20**: as crianças dirigem 3 corridas; ajustar `balance.json` se necessário (08 §8.5).
4. Depois de **T26b**: ouvir o motor nas 5 versões.
5. Depois de **T28**: instalar como PWA, modo avião, export/import.
