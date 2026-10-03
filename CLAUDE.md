# Mustang 68 — regras para quem implementa

Especificação completa em `docs/arquitetura/` (comece pelo `README.md` de lá). Ela é a fonte da verdade: não tome decisões de design por conta própria.

## Regras
- Implemente uma tarefa de `docs/arquitetura/10-plano.md` por sessão; só toque nos arquivos listados na tarefa (e nos testes dela).
- Nomes, parâmetros e retornos exatamente como em `docs/arquitetura/03-contratos.md`.
- JavaScript ES modules nativos, imports relativos com `.js`, JSDoc nas exportações, sem dependências, sem bundler, arquivos ≤ 250 linhas.
- `src/core`, `src/game`, `src/race`, `src/save` são puros: sem `window`, `document`, `localStorage`, `AudioContext`, `Image`.
- Nenhuma constante de jogo no código: tudo vem de `data/*.json`.
- Textos visíveis em português do Brasil, só via `src/ui/strings.js`.
- Sem alocação de objetos dentro do loop de corrida (`race/`, `render/`).
- Nada fora do escopo de `docs/arquitetura/01-decisoes.md §1.8`.

## Comandos
- Servidor: `python3 -m http.server 8080` → http://localhost:8080 (`?debug=1` mostra fps)
- Testes: `node --test tests/`
- Dados: `node tools/validate-data.mjs`
- Antes de publicar: `node tools/build-precache.mjs`

## Commits
Um por tarefa: `T<nn>: <objetivo>`.
