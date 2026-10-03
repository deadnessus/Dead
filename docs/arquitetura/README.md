# Mustang 68 — Especificação de arquitetura

Jogo de corrida 2D top-down para iPad (PWA, offline, pt-BR) em que duas crianças restauram e evoluem o Mustang 1968 hardtop preto da família.

Este diretório é a **fonte da verdade** para a implementação. O código é escrito tarefa a tarefa (seção 10) por um modelo implementador usando o template da seção 11.

## Índice

| # | Documento | Conteúdo |
|---|---|---|
| 1 | [01-decisoes.md](01-decisoes.md) | Stack, câmera, resolução, controles, formato de pista, regras de corrida |
| 2 | [02-estrutura.md](02-estrutura.md) | Árvore de arquivos e responsabilidade de cada um; dependências permitidas |
| 3 | [03-contratos.md](03-contratos.md) | Tipos, funções públicas, eventos, fluxo por quadro |
| 4 | [04-schemas.md](04-schemas.md) | JSON de carro, peças, pistas, oponentes, balanceamento, save, manifesto |
| 5 | [05-camadas-carro.md](05-camadas-carro.md) | Camadas visuais, resolução pelo save, convenções para a arte final |
| 6 | [06-estados.md](06-estados.md) | Máquina de estados e telas |
| 7 | [07-fisica-ia.md](07-fisica-ia.md) | Fórmulas de pista, física, colisão, assistência, IA, câmera, desempenho |
| 8 | [08-economia.md](08-economia.md) | Prêmios, preços, desbloqueios, ritmo simulado, ajustes |
| 9 | [09-audio.md](09-audio.md) | Grafo de áudio, sons e gatilhos, motor, placeholders sintetizados |
| 10 | [10-plano.md](10-plano.md) | 33 tarefas ordenadas (32 de código + teste no iPad) com critérios de aceite e modelo indicado |
| 11 | [11-prompt-template.md](11-prompt-template.md) | Prompt para colar a cada tarefa |
| 12 | [12-testes-ipad.md](12-testes-ipad.md) | Checklist no iPad e armadilhas do Safari/iOS |
| 13 | [13-publicacao.md](13-publicacao.md) | PWA passo a passo e caminho Capacitor/TestFlight |
| 14 | [14-riscos.md](14-riscos.md) | Riscos com modelo simples e mitigações |
| — | [dados/](dados/) | Arquivos JSON completos e validados (copiados para `/data` na T02) |
| — | [img/placeholder-camadas.png](img/placeholder-camadas.png) | Render dos placeholders: ferrado, restaurado, máximo |

## Como os números foram validados

Antes de escrever a especificação, as fórmulas foram simuladas em Python (mesmas equações do documento 07):
- 8 traçados de pista gerados e verificados (raio mínimo ≥ 250 u, sem trechos encostando).
- IA com o carro ferrado completa a t1 em ~66 s; carro máximo completa a t8 em ~79 s; zero batidas.
- Assistência Forte sem tocar na tela: termina todas as pistas sem bater, 8–21% mais lenta que a IA.
- Economia: 1ª compra na 2ª corrida; restauração completa ~28 corridas; carro máximo ~76 corridas (Normal).
- Dados cruzados: toda variante visual de peça tem asset nas duas vistas; todas as referências entre JSONs existem.

## Suposições registradas

1. **Hardware:** iPad 9ª/10ª geração ou iPad Air (2020+), iPadOS 16.4+, um iPad por criança ou compartilhado (os 2 perfis ficam no mesmo aparelho; em iPads separados cada um usa só o seu perfil).
2. **Hospedagem:** existe uma URL HTTPS gratuita (GitHub Pages/Cloudflare Pages) para instalar a PWA; sem servidor próprio.
3. **Modelo implementador:** Claude Code em sessões separadas com acesso ao repositório (lê `CLAUDE.md` e os docs), Node ≥ 20 disponível para testes.
4. **Arte final:** feita depois, por alguém da família ou freelancer, seguindo 05 §5.4; músicas originais ou sintetizadas sem licença de terceiros.
5. **Vista lateral na garagem** além da top-down na corrida (dobra o número de camadas de arte, mas é onde o Mustang é reconhecível).
6. **Sem dano mecânico, sem ré, sem clima/noite**, 6 carros por corrida, 3 voltas, 8 pistas em 4 ligas.
7. **Nomes de peças genéricos** (V8 289/302/390/428 são cilindradas, não marcas); nenhum nome comercial de carro ou fabricante nos adversários.
8. Cor alternativa só depois do polimento, e o "Preto da família" é gratuito para sempre poder voltar ao original.

## Perguntas que mudariam a arquitetura

1. **Os dois filhos vão jogar no mesmo iPad ou cada um no seu?** Se em iPads separados, um "perfil único por aparelho" simplifica a tela inicial; se quiserem disputar entre si, um modo **2 jogadores em tela dividida no mesmo iPad** mudaria controles, câmera e render (dois viewports).
2. **Querem ver o Mustang de cima na corrida ou preferem vista traseira em pseudo-3D (estilo Out Run)?** A pseudo-3D é mais "emocionante" e mostra a traseira do Mustang, mas troca todo o modelo de pista, física e arte.
3. **Haverá fotos/desenhos do Mustang real da família para a arte final?** Se sim, vale incluir uma tela "Álbum de restauração" (antes/depois), que exige guardar marcos no save.
4. **Pretendem publicar na App Store algum dia (mesmo só para a família)?** Se sim, começar já pelo Capacitor com `@capacitor/preferences` em vez de PWA muda as tarefas T27–T28.
5. **Algum dos dois tem dificuldade de leitura ou daltonismo?** Mudaria a dependência de texto (mais voz/ícones) e a paleta (os estados de cartão e as faixas usam vermelho/verde).
