# 11. Template de prompt para o implementador

Uso: copie o bloco abaixo, troque os campos `<<...>>` e cole numa sessão nova do Claude Code aberta na raiz do repositório. Uma tarefa por sessão. O arquivo `CLAUDE.md` da raiz é carregado automaticamente e repete as regras globais.

Quais seções passar em `<<SEÇÕES>>` (o mínimo necessário):

| Tarefas | Seções |
|---|---|
| T01, T02 | 01, 02 |
| T03, T04 | 03 §3.2 |
| T05 | 03 §3.3, 04 |
| T06 | 03 §3.4, 04 §4.6 |
| T07, T08 | 03 §3.5, 04 §4.2, 08 |
| T09 | 01 §1.3, 03 §3.2, 07 §7.10 |
| T10, T11 | 03 §3.3 e §3.7, 04 §4.7, 05 |
| T12a, T12b, T13 | 03 §3.9, 06 |
| T14–T18 | 03 §3.6, 07 §7.1–7.6 e §7.9 |
| T19a, T19b, T22 | 03 §3.7, 07 §7.7–7.8 e §7.10, 05 §5.1 (efeitos) |
| T20, T21 | 01 §1.4, 03 §3.9–3.11, 06 |
| T23 | 05 §5.5, 06, 03 §3.5 |
| T24–T26b | 03 §3.8, 09 |
| T27, T28 | 03 §3.4, 06, 13 |
| T29, T30 | 05 §5.4, 08 §8.4, 06 §6.3 |

```text
Você vai implementar UMA tarefa de um jogo já totalmente especificado. Não tome decisões de design: se algo não estiver na especificação, escolha a opção mais simples, registre em "Suposições" no relatório e NÃO invente funcionalidades extras.

## Tarefa
<<COLE AQUI O BLOCO COMPLETO DA TAREFA Txx DE docs/arquitetura/10-plano.md>>

## Leia antes de escrever código (nesta ordem)
1. CLAUDE.md (regras do projeto)
2. docs/arquitetura/<<SEÇÕES, ex.: 03-contratos.md §3.6 e 07-fisica-ia.md>>
3. Os arquivos existentes que a tarefa importa (abra-os; não presuma o conteúdo)

## Regras
- Crie/edite SOMENTE os arquivos listados na tarefa (e seus testes em tests/).
- Siga exatamente os nomes, parâmetros e retornos de docs/arquitetura/03-contratos.md. Se um contrato parecer errado, NÃO o altere: implemente como está e descreva o problema no relatório.
- Números de balanceamento vêm de data/*.json; não escreva constantes de jogo no código.
- JavaScript ES modules puro, import com extensão .js, JSDoc nas funções exportadas, sem dependências, arquivos ≤ 250 linhas.
- Módulos de src/core, src/game, src/race e src/save não acessam window/document/localStorage/AudioContext.
- Textos visíveis em português do Brasil, vindos de src/ui/strings.js.
- Escreva os testes de aceite da tarefa em tests/<modulo>.test.js usando node:test e node:assert/strict.

## Verificação obrigatória antes de terminar
1. node --test tests/          → tudo passando (cole o resumo no relatório)
2. node tools/validate-data.mjs → OK (a partir da T05)
3. Para tarefas com tela: descreva o que verificar em http://localhost:8080/<<URL/flag de debug>>
4. Releia seu diff procurando: nome divergente do contrato, número mágico de balanceamento, alocação dentro do loop de corrida, acesso a DOM em módulo puro.

## Entrega
- Um commit: "T<<NN>>: <<objetivo>>"
- Relatório curto:
  - Arquivos criados/alterados
  - Resultado dos testes
  - Critérios de aceite: cada um com ✅ ou ❌ e como foi verificado
  - Suposições feitas
  - Problemas encontrados na especificação (se houver)
```

## Prompt de correção (quando um critério falhar)

```text
A tarefa T<<NN>> foi implementada mas o critério abaixo falhou no teste:
<<critério>>
Observado: <<o que aconteceu, com mensagem de erro/console/print>>
Esperado: <<o que diz a especificação>>
Corrija com a menor mudança possível, só nos arquivos da T<<NN>>. Rode node --test tests/ e entregue o mesmo formato de relatório.
```
