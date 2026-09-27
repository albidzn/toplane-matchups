const { app, BrowserWindow, Menu, shell, ipcMain, screen, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

const APP_NAME = "Toplane Matchups";
const PREFERRED_PORT = 4748; // fixed so the origin (and localStorage) stays stable between launches
const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4h
const FIRST_UPDATE_CHECK_DELAY_MS = 10 * 1000; // let the window settle first

app.setName(APP_NAME);
// Keep user data in %APPDATA%\Toplane Matchups regardless of package name.
app.setPath("userData", path.join(app.getPath("appData"), APP_NAME));

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let server = null;
let saveStateTimer = null;
let updateState = { status: "idle" }; // idle | checking | available | downloading | ready | not-available | error

const stateFile = () => path.join(app.getPath("userData"), "window-state.json");

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile(), "utf-8"));
  } catch {
    return {};
  }
}

function saveState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const state = {
    bounds: mainWindow.getNormalBounds(), // restored size, even while maximized
    maximized: mainWindow.isMaximized(),
    alwaysOnTop: mainWindow.isAlwaysOnTop(),
    zoom: mainWindow.webContents.getZoomFactor(),
  };
  try {
    fs.writeFileSync(stateFile(), JSON.stringify(state));
  } catch {
    // non-fatal
  }
}

function scheduleSaveState() {
  clearTimeout(saveStateTimer);
  saveStateTimer = setTimeout(saveState, 400);
}

/** Only restore saved bounds if they still land on a connected monitor. */
function visibleBounds(bounds) {
  if (!bounds) return null;
  const onScreen = screen.getAllDisplays().some((d) => {
    const a = d.workArea;
    return (
      bounds.x < a.x + a.width - 80 &&
      bounds.x + bounds.width > a.x + 80 &&
      bounds.y < a.y + a.height - 80 &&
      bounds.y + 60 > a.y
    );
  });
  return onScreen ? bounds : null;
}

function seedFile() {
  const packaged = path.join(process.resourcesPath, "seed", "matchups.json");
  if (app.isPackaged && fs.existsSync(packaged)) return packaged;
  return path.join(app.getAppPath(), "data", "matchups.json");
}

async function startBackend() {
  const appRoot = app.getAppPath();
  const { startServer } = await import(pathToFileURL(path.join(appRoot, "server", "index.js")).href);
  return startServer({
    port: PREFERRED_PORT,
    fallbackToRandomPort: true,
    dev: false,
    dataDir: path.join(app.getPath("userData"), "data"),
    distDir: path.join(appRoot, "dist"),
    seedFile: seedFile(),
  });
}

function buildMenu() {
  const template = [
    {
      label: "App",
      submenu: [
        {
          label: "Open data folder",
          click: () => shell.openPath(server.dataDir),
        },
        {
          label: "Check for updates",
          enabled: app.isPackaged,
          click: () => autoUpdater.checkForUpdates().catch(() => {}),
        },
        { type: "separator" },
        { role: "quit", label: "Quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Always on top",
          type: "checkbox",
          checked: mainWindow.isAlwaysOnTop(),
          click: (item) => setAlwaysOnTop(item.checked),
        },
        { type: "separator" },
        { role: "zoomIn", accelerator: "CommandOrControl+=" },
        { role: "zoomOut" },
        { role: "resetZoom" },
        { type: "separator" },
        { role: "togglefullscreen" },
        { role: "reload" },
        { role: "toggleDevTools" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setAlwaysOnTop(value) {
  mainWindow.setAlwaysOnTop(Boolean(value), "floating");
  buildMenu();
  scheduleSaveState();
  return mainWindow.isAlwaysOnTop();
}

function createWindow() {
  const state = loadState();
  const bounds = visibleBounds(state.bounds);

  mainWindow = new BrowserWindow({
    width: bounds?.width ?? 1280,
    height: bounds?.height ?? 820,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 360,
    minHeight: 480,
    title: APP_NAME,
    backgroundColor: "#0a0e14",
    autoHideMenuBar: true,
    show: false,
    icon: path.join(app.getAppPath(), "build", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  if (state.alwaysOnTop) mainWindow.setAlwaysOnTop(true, "floating");
  if (state.maximized) mainWindow.maximize();

  mainWindow.once("ready-to-show", () => {
    if (state.zoom) mainWindow.webContents.setZoomFactor(state.zoom);
    mainWindow.show();
  });

  mainWindow.on("resize", scheduleSaveState);
  mainWindow.on("move", scheduleSaveState);
  mainWindow.on("close", saveState);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Keep the window on our own origin; send everything else to the browser.
  const origin = new URL(server.url).origin;
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (new URL(url).origin !== origin) {
      event.preventDefault();
      if (/^https:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.loadURL(server.url);
  buildMenu();
}

ipcMain.handle("desktop:get-info", () => ({
  alwaysOnTop: mainWindow?.isAlwaysOnTop() ?? false,
  dataDir: server?.dataDir ?? "",
  version: app.getVersion(),
}));
ipcMain.handle("desktop:set-always-on-top", (_e, value) => setAlwaysOnTop(value));
ipcMain.handle("desktop:open-data-folder", () => shell.openPath(server.dataDir));
ipcMain.handle("desktop:get-update-state", () => updateState);
ipcMain.handle("desktop:check-for-updates", () => {
  if (app.isPackaged) autoUpdater.checkForUpdates().catch(() => {});
  return updateState;
});
ipcMain.handle("desktop:install-update", () => {
  if (updateState.status === "ready") autoUpdater.quitAndInstall();
});

// ---------- auto-update (installed builds only; the portable exe and dev
// runs skip this — there's no NSIS installer for electron-updater to swap) ----------

function pushUpdateState(next) {
  updateState = next;
  mainWindow?.webContents.send("desktop:update-state", updateState);
}

function setupAutoUpdater() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => pushUpdateState({ status: "checking" }));
  autoUpdater.on("update-available", (info) =>
    pushUpdateState({ status: "downloading", version: info.version })
  );
  autoUpdater.on("update-not-available", () => pushUpdateState({ status: "not-available" }));
  autoUpdater.on("download-progress", (p) =>
    pushUpdateState({ status: "downloading", percent: Math.round(p.percent) })
  );
  autoUpdater.on("update-downloaded", (info) =>
    pushUpdateState({ status: "ready", version: info.version })
  );
  autoUpdater.on("error", (err) => {
    console.warn("Auto-update error:", err?.message ?? err);
    pushUpdateState({ status: "error" });
  });

  const check = () => autoUpdater.checkForUpdates().catch((err) => console.warn("Update check failed:", err.message));
  setTimeout(check, FIRST_UPDATE_CHECK_DELAY_MS);
  setInterval(check, UPDATE_CHECK_INTERVAL_MS);
}

app.on("second-instance", () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(async () => {
  try {
    server = await startBackend();
  } catch (err) {
    dialog.showErrorBox(APP_NAME, `Could not start the local server:\n\n${err?.stack ?? err}`);
    app.quit();
    return;
  }
  createWindow();
  setupAutoUpdater();
});

app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => {
  server?.close();
});
