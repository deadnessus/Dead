# Mustang 68

Jogo de corrida para iPad (PWA offline, pt-BR) em que as crianças restauram e evoluem o Mustang 1968 da família.

- Especificação de arquitetura: [`docs/arquitetura/README.md`](docs/arquitetura/README.md)
- Plano de implementação por tarefas: [`docs/arquitetura/10-plano.md`](docs/arquitetura/10-plano.md)
- Prompt para cada tarefa: [`docs/arquitetura/11-prompt-template.md`](docs/arquitetura/11-prompt-template.md)

## Como rodar

**Servidor local:**
```bash
python3 -m http.server 8080
```
Abra [`http://localhost:8080`](http://localhost:8080) no navegador.

**Testes:**
```bash
node --test tests/
```

**Validar dados:**
```bash
node tools/validate-data.mjs
```

**Build para deploy:**
```bash
node tools/build-precache.mjs
```
