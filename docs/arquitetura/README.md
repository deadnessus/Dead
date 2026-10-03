# Mustang 68 — Especificação de arquitetura

Jogo de corrida pseudo-3D com vista traseira (estilo Out Run) para iPad (PWA, offline, pt-BR) em que duas crianças restauram e evoluem o Mustang 1968 hardtop preto da família.

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
| 10 | [10-plano.md](10-plano.md) | 34 tarefas ordenadas (33 de código + teste no iPad) com critérios de aceite e modelo indicado |
| 11 | [11-prompt-template.md](11-prompt-template.md) | Prompt para colar a cada tarefa |
| 12 | [12-testes-ipad.md](12-testes-ipad.md) | Checklist no iPad e armadilhas do Safari/iOS |
| 13 | [13-publicacao.md](13-publicacao.md) | PWA passo a passo e caminho Capacitor/TestFlight |
| 14 | [14-riscos.md](14-riscos.md) | Riscos com modelo simples e mitigações |
| — | [dados/](dados/) | Arquivos JSON completos e validados (copiados para `/data` na T02) |
| — | [img/](img/) | Placeholders do carro (traseira e lateral) e quadros de corrida gerados pelo protótipo |
| — | [referencia/prototipo-render.html](referencia/prototipo-render.html) | Protótipo do render pseudo-3D usando os dados reais (consulta; não é código do jogo) |

## Como os números foram validados

Antes de escrever a especificação, as fórmulas foram simuladas em Python (mesmas equações do documento 07) e o render foi prototipado no navegador:
- 8 pistas em seções (curva/morro), soma dos morros = 0, com comprimento ajustado para a corrida da IA no nível de desbloqueio durar 81–85 s.
- IA nunca sai do asfalto; Mustang ferrado (IA dirigindo) faz a t1 em ~84 s; carro máximo faz a t8 em ~73 s.
- Assistência Forte sem tocar na tela: termina todas as pistas no asfalto, 12–16% mais lenta que a IA.
- Economia: 1ª compra na 2ª corrida; restauração completa ~28 corridas; carro máximo ~76 corridas (Normal).
- Projeção pseudo-3D conferida em imagens (`img/corrida-*.png`) com placeholders, temas, objetos e adversários.
- Dados cruzados: toda variante visual de peça tem asset nas duas vistas; todas as referências entre JSONs existem.

## Decisões da família (respostas às perguntas da 1ª versão)

| Pergunta | Resposta | Efeito |
|---|---|---|
| Mesmo iPad ou um cada? | Um por vez, mesmo iPad | 2 perfis no aparelho; sem tela dividida |
| Vista da corrida | Traseira pseudo-3D | Pista em segmentos, câmera atrás do carro, camadas do carro em vista traseira |
| Arte final | Não nesta versão | Só placeholders; manifesto continua pronto para a troca |
| App Store | Talvez depois | PWA agora; caminho Capacitor documentado na seção 13 |
| Dislexia/daltonismo | Não | Sem adaptação |

## Suposições registradas

1. **Hardware:** iPad 9ª/10ª geração ou iPad Air (2020+), iPadOS 16.4+, compartilhado pelos dois filhos (um joga por vez).
2. **Hospedagem:** existe uma URL HTTPS gratuita (GitHub Pages/Cloudflare Pages) para instalar a PWA; sem servidor próprio.
3. **Modelo implementador:** Claude Code em sessões separadas com acesso ao repositório (lê `CLAUDE.md` e os docs), Node ≥ 20 disponível para testes.
4. **Vista lateral na garagem** além da traseira na corrida: é onde o perfil hardtop do Mustang é reconhecível.
5. **Sem dano mecânico, sem ré, sem clima/noite, sem bifurcações, sem tráfego civil**, 6 carros por corrida, 3 voltas, 8 pistas em 4 ligas.
6. **Nomes de peças genéricos** (V8 289/302/390/428 são cilindradas, não marcas); nenhum nome comercial de carro ou fabricante nos adversários.
7. Cor alternativa só depois do polimento, e o "Preto da família" é gratuito para sempre poder voltar ao original.
8. "Faróis novos" virou "Faróis e lanternas", porque na corrida o que aparece são as lanternas de 3 barras.
