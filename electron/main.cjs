// Processo principal do Electron — janela "assistente" que desliza pela direita.
// Atalho global padrão: Ctrl+Space (alterna mostrar/esconder).
// Ícone na bandeja (system tray) com menu: Abrir / Sair.

const { app, BrowserWindow, globalShortcut, Tray, Menu, screen, nativeImage } = require("electron");
const path = require("path");

const WIN_WIDTH = 460;          // largura do painel lateral
const SLIDE_DURATION = 220;     // ms (animação)
const SLIDE_STEPS = 14;
const TOGGLE_SHORTCUT = "Control+Space";

let mainWindow = null;
let tray = null;
let isAnimating = false;

function getTargetBounds() {
  const display = screen.getPrimaryDisplay();
  const { x, y, width, height } = display.workArea;
  return {
    hiddenX: x + width,           // fora da tela (totalmente à direita)
    shownX: x + width - WIN_WIDTH,
    y,
    height,
    width: WIN_WIDTH,
  };
}

function createWindow() {
  const b = getTargetBounds();

  mainWindow = new BrowserWindow({
    width: b.width,
    height: b.height,
    x: b.hiddenX,
    y: b.y,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,            // não polui a barra de tarefas
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // Carrega o app — produção usa o build do Vite, dev pode usar localhost:8080
  const devURL = process.env.ELECTRON_DEV_URL;
  if (devURL) {
    mainWindow.loadURL(devURL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  // Esconde ao perder foco (comportamento de assistente)
  mainWindow.on("blur", () => {
    if (!mainWindow.webContents.isDevToolsOpened()) hideWindow();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function animateTo(targetX, onDone) {
  if (!mainWindow || isAnimating) return;
  isAnimating = true;
  const startX = mainWindow.getBounds().x;
  const delta = targetX - startX;
  let step = 0;
  const b = mainWindow.getBounds();

  const tick = () => {
    step++;
    const t = step / SLIDE_STEPS;
    // ease-out
    const eased = 1 - Math.pow(1 - t, 3);
    const x = Math.round(startX + delta * eased);
    mainWindow.setBounds({ x, y: b.y, width: b.width, height: b.height });
    if (step < SLIDE_STEPS) {
      setTimeout(tick, SLIDE_DURATION / SLIDE_STEPS);
    } else {
      mainWindow.setBounds({ x: targetX, y: b.y, width: b.width, height: b.height });
      isAnimating = false;
      onDone && onDone();
    }
  };
  tick();
}

function showWindow() {
  if (!mainWindow) createWindow();
  const b = getTargetBounds();
  // Reposiciona caso o usuário tenha trocado de monitor/resolução
  mainWindow.setBounds({ x: b.hiddenX, y: b.y, width: b.width, height: b.height });
  mainWindow.show();
  mainWindow.focus();
  animateTo(b.shownX);
}

function hideWindow() {
  if (!mainWindow || !mainWindow.isVisible()) return;
  const b = getTargetBounds();
  animateTo(b.hiddenX, () => {
    if (mainWindow) mainWindow.hide();
  });
}

function toggleWindow() {
  if (!mainWindow) {
    createWindow();
    mainWindow.once("ready-to-show", showWindow);
    return;
  }
  if (mainWindow.isVisible() && !isAnimating) hideWindow();
  else showWindow();
}

function createTray() {
  // Ícone simples vindo do public/. Se não existir, usa imagem vazia (Electron mostra padrão).
  const iconPath = path.join(__dirname, "..", "dist", "icon-192.png");
  let image;
  try {
    image = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    image = nativeImage.createEmpty();
  }
  tray = new Tray(image);
  tray.setToolTip("Assistente — Tarefas G");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Abrir / fechar (${TOGGLE_SHORTCUT})`, click: toggleWindow },
      { type: "separator" },
      { label: "Sair", click: () => { app.isQuitting = true; app.quit(); } },
    ])
  );
  tray.on("click", toggleWindow);
}

// Instância única — segundo lançamento apenas mostra a janela
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => showWindow());

  app.whenReady().then(() => {
    createWindow();
    createTray();

    const registered = globalShortcut.register(TOGGLE_SHORTCUT, toggleWindow);
    if (!registered) console.warn(`Falha ao registrar atalho global ${TOGGLE_SHORTCUT}`);
  });

  app.on("will-quit", () => globalShortcut.unregisterAll());

  // Mantém o app vivo na bandeja mesmo sem janelas
  app.on("window-all-closed", (e) => {
    if (!app.isQuitting) e.preventDefault?.();
  });
}
