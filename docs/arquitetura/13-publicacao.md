# 13. Caminho de publicação no iPad

## 13.1 PWA (caminho principal, custo zero)

### Arquivos de PWA (criados na T28)

`manifest.webmanifest`:
```json
{
  "name": "Mustang 68",
  "short_name": "Mustang 68",
  "lang": "pt-BR",
  "start_url": "./index.html",
  "scope": "./",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
`index.html` também precisa de `<link rel="apple-touch-icon" href="icons/icon-180.png">` e `<link rel="manifest" href="manifest.webmanifest">`. Todos os caminhos são **relativos** (funciona em subpasta, ex. GitHub Pages `/Dead/`).

### Passo a passo

1. **Gerar a lista de cache:** `node tools/build-precache.mjs` (sempre antes de publicar; o teste `precache.test.js` falha se esquecer).
2. **Hospedar com HTTPS** (obrigatório para service worker). Opções, em ordem de simplicidade:
   - **GitHub Pages:** repositório → Settings → Pages → Source: branch `main`, pasta `/ (root)`. URL: `https://<usuario>.github.io/<repo>/`. Exige repositório público no plano gratuito.
   - **Cloudflare Pages** ou **Netlify** (aceitam repositório privado): conectar o repositório, comando de build vazio, diretório de saída `/`.
3. **Instalar no iPad de cada filho:** Safari → abrir a URL → botão Compartilhar → **Adicionar à Tela de Início** → nome "Mustang 68" → Adicionar.
4. **Abrir sempre pelo ícone** (o save do ícone é separado do save do Safari).
5. **Primeira abertura com internet**; depois funciona offline (modo avião).
6. **Atualizar:** publicar nova versão → ao abrir o app aparece "Atualização pronta" no menu → tocar → recarrega. O save não é afetado (migração automática se o schema mudou).
7. **Backup:** Ajustes → Exportar save → Salvar em Arquivos (iCloud Drive). Fazer após marcos importantes.

### Controle parental do iPad (opcional)
Tempo de Uso → Limites de Apps não se aplica a PWAs individualmente; usar **Tempo de Inatividade** ou limite de "Safari/Web". Sem rede necessária: pode-se bloquear sites e manter o jogo.

## 13.2 Evolução para app nativo (Capacitor + TestFlight)

Quando fizer sentido: querer ícone/app "de verdade", instalação em vários aparelhos da família via TestFlight, ou evitar a separação Safari/ícone.

| Requisito | Detalhe |
|---|---|
| Mac com Xcode atual | obrigatório para compilar iOS |
| Apple Developer Program | US$ 99/ano para TestFlight. Sem ele: instalar direto pelo Xcode com conta gratuita (perfil expira em **7 dias**, precisa reinstalar) |
| Node ≥ 20 | só no Mac de build |

Passo a passo:
1. `npm init -y` (se ainda não houver dependências) e `npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/ios @capacitor/preferences`.
2. Criar `tools/build-www.mjs` que copia `index.html`, `manifest.webmanifest`, `src/`, `data/`, `assets/`, `icons/` para `www/` (sem `sw.js`/`precache.js`: no app o conteúdo já é local).
3. `npx cap init "Mustang 68" br.familia.mustang68 --web-dir www`.
4. `npx cap add ios`.
5. **Trocar o backend de save:** criar `src/save/capacitorBackend.js` com a mesma interface `StorageBackend`, usando `@capacitor/preferences` (o WKWebView pode apagar `localStorage` sob pouca memória). `main.js` escolhe o backend se `window.Capacitor?.isNativePlatform()`. Como a interface é síncrona e Preferences é assíncrono: carregar tudo no boot para memória (`MemoryBackend`) e espelhar cada `setItem` para Preferences sem esperar.
6. No Xcode (`npx cap open ios`): Signing com o time da família; **Deployment Info → iPad only, Landscape Left + Right**; `UIRequiresFullScreen = YES`; ícone 1024×1024 em Assets.
7. Áudio: o mesmo código Web Audio funciona; opcional `AVAudioSession` categoria `ambient` (mantém respeito ao silencioso).
8. Migrar o progresso: no PWA exportar save → no app importar (mesmo formato).
9. TestFlight: Product → Archive → Distribute → App Store Connect → TestFlight → adicionar os iPads da família como testadores internos (até 100, sem revisão da Apple para testadores internos).
10. Cada atualização: `node tools/build-www.mjs && npx cap sync ios` → Archive → nova build no TestFlight (builds expiram em 90 dias; publicar uma nova antes disso).

Nenhuma alteração de arquitetura é necessária além do item 5 — por isso o save já nasce atrás de `StorageBackend`.
