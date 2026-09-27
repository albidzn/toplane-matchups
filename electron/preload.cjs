const { contextBridge, ipcRenderer } = require("electron");

// Minimal, explicit surface exposed to the web app (no Node access).
contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  getInfo: () => ipcRenderer.invoke("desktop:get-info"),
  setAlwaysOnTop: (value) => ipcRenderer.invoke("desktop:set-always-on-top", Boolean(value)),
  openDataFolder: () => ipcRenderer.invoke("desktop:open-data-folder"),

  getUpdateState: () => ipcRenderer.invoke("desktop:get-update-state"),
  checkForUpdates: () => ipcRenderer.invoke("desktop:check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("desktop:install-update"),
  onUpdateState: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on("desktop:update-state", handler);
    return () => ipcRenderer.removeListener("desktop:update-state", handler);
  },
});
