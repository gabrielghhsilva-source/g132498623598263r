// Preload mínimo — expõe um flag para o app saber que está rodando no Electron.
const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  platform: process.platform,
});
