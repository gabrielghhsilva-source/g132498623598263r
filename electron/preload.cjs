// Preload mínimo — expõe a API do assistente para o React.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
  // Esconde a janela do assistente (slide-out + hide). NÃO encerra o app —
  // continua vivo na bandeja para reabrir com Ctrl+Space ou clique no tray.
  hide: () => ipcRenderer.invoke("assistant:hide"),
  // Encerra o app por completo (sai da bandeja também).
  quit: () => ipcRenderer.invoke("assistant:quit"),
});
