# Modo Assistente (Electron) — Windows

Transforma o app num assistente que desliza pela direita da tela, com:

- **Atalho global `Ctrl+Space`** → abre/fecha a janela
- **Ícone na bandeja** (system tray, ao lado do relógio) → clique abre/fecha; menu de contexto pra sair
- **Janela frameless**, transparente, sempre no topo, larga 460px, altura cheia
- **Auto-esconder** quando perde o foco (clica em qualquer lugar fora → some)
- **Animação slide-in** suave vindo da direita

## Setup (uma vez, no seu PC)

1. Exporte o projeto pro GitHub e faça `git clone` no PC.
2. Dentro da pasta do projeto, instale dependências:
   ```bash
   npm install
   npm install --save-dev electron @electron/packager
   ```
3. Adicione estas linhas ao `package.json` em `"scripts"`:
   ```json
   "electron:dev": "ELECTRON_DEV_URL=http://localhost:8080 electron electron/main.cjs",
   "electron:start": "vite build && electron electron/main.cjs",
   "electron:build": "vite build && electron-packager . \"Assistente\" --platform=win32 --arch=x64 --out=electron-release --overwrite --ignore=\"^/src\" --ignore=\"^/public\" --ignore=\"^/electron-release\""
   ```
   E também:
   ```json
   "main": "electron/main.cjs"
   ```

## Rodar

- **Testar rápido** (com a build de produção):
  ```bash
  npm run electron:start
  ```
- **Dev com hot reload** (em outro terminal rode `npm run dev` antes):
  ```bash
  npm run electron:dev
  ```
- **Gerar o `.exe` standalone**:
  ```bash
  npm run electron:build
  ```
  O executável fica em `electron-release/Assistente-win32-x64/Assistente.exe`.

## Iniciar com o Windows

1. `Win+R` → digite `shell:startup` → Enter
2. Crie um atalho do `Assistente.exe` ali dentro

Pronto. Ao logar no Windows, o ícone aparece na bandeja e `Ctrl+Space` chama o assistente.

## Customizar

No arquivo `electron/main.cjs`:
- `WIN_WIDTH` → largura do painel (padrão 460px)
- `TOGGLE_SHORTCUT` → mude pra `"Alt+Space"`, `"Control+Shift+T"` etc.
- Comente o handler `mainWindow.on("blur", ...)` se quiser que a janela **não** suma ao clicar fora.
