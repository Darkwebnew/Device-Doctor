/**
 * main.js — Electron Main Process
 * Device Doctor — System Analyzer
 *
 * Security posture:
 *   nodeIntegration:  false
 *   contextIsolation: true
 *   sandbox:          true  (renderer)
 *   All Node.js APIs accessed only via IPC handlers here in main.
 */

const { app, BrowserWindow, ipcMain, shell, dialog, Notification } = require('electron');
const path  = require('path');
const log   = require('electron-log');
const { autoUpdater } = require('electron-updater');

const SystemCollector = require('./collectors/systemCollector');
const Analyzer        = require('./analyzer/analyzer');

// ── Logging setup ─────────────────────────────────────────────────────────────
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// ── App globals ───────────────────────────────────────────────────────────────
let mainWindow;
const isDev = process.argv.includes('--dev') || !app.isPackaged;

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// ── Window creation ───────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:    1280,
    height:   820,
    minWidth: 1024,
    minHeight: 680,
    frame:    false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0d14',
    show: false,                // Avoid flash; show after ready-to-show
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      nodeIntegration:  false,   // ← Security: renderer has NO Node.js access
      contextIsolation: true,    // ← Security: strict API surface via preload
      sandbox:          true,    // ← Security: OS-level sandbox for renderer
      webSecurity:      true,
      allowRunningInsecureContent: false,
    },
    icon: path.join(__dirname, '../assets/icons/icon.png'),
  });

  // Graceful show — avoids white flash on load
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Block navigation to external URLs in the main window
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appURL = `file://${path.resolve(__dirname, 'renderer/index.html')}`;
    if (!url.startsWith(appURL)) {
      event.preventDefault();
      log.warn(`Blocked navigation to: ${url}`);
    }
  });

  // Block new windows entirely — open in system browser instead
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  createWindow();
  if (!isDev) initAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Disable navigation to remote URLs globally
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) return;
    event.preventDefault();
  });
});

// ── Auto-Updater ─────────────────────────────────────────────────────────────
function initAutoUpdater() {
  // Check for updates 3 seconds after the window is ready
  // (gives the UI time to paint before any dialogs)
  setTimeout(() => {
    log.info('[Updater] Checking for updates…');
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      log.error('[Updater] Check failed:', err.message);
    });
  }, 3000);

  // Also check every 4 hours while the app is running
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      log.error('[Updater] Periodic check failed:', err.message);
    });
  }, 4 * 60 * 60 * 1000);

  // ── Updater events ──────────────────────────────────────────────────────

  autoUpdater.on('checking-for-update', () => {
    log.info('[Updater] Checking for update…');
    sendUpdaterStatus('checking');
  });

  autoUpdater.on('update-available', (info) => {
    log.info(`[Updater] Update available: v${info.version}`);
    sendUpdaterStatus('available', { version: info.version, releaseDate: info.releaseDate });

    // Show native notification (Windows Action Center)
    if (Notification.isSupported()) {
      new Notification({
        title: 'Device Doctor — Update Available',
        body:  `Version ${info.version} is downloading in the background.`,
        icon:  path.join(__dirname, '../assets/icons/icon.png'),
      }).show();
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info(`[Updater] Up to date (v${info.version})`);
    sendUpdaterStatus('up-to-date', { version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    const pct = Math.round(progress.percent);
    log.info(`[Updater] Download: ${pct}% (${formatBytes(progress.transferred)}/${formatBytes(progress.total)})`);
    sendUpdaterStatus('downloading', {
      percent:     pct,
      transferred: progress.transferred,
      total:       progress.total,
      bytesPerSec: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info(`[Updater] Download complete: v${info.version}`);
    sendUpdaterStatus('downloaded', { version: info.version });

    // Prompt user to restart and install
    if (mainWindow) {
      dialog.showMessageBox(mainWindow, {
        type:      'info',
        title:     'Update Ready — Device Doctor',
        message:   `Version ${info.version} has been downloaded.`,
        detail:    'Restart Device Doctor now to apply the update, or continue and it will install on next launch.',
        buttons:   ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId:  1,
        icon:      path.join(__dirname, '../assets/icons/icon.png'),
      }).then(({ response }) => {
        if (response === 0) {
          log.info('[Updater] User chose to restart and install.');
          autoUpdater.quitAndInstall(false, true);
        } else {
          log.info('[Updater] User deferred update.');
        }
      });
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('[Updater] Error:', err.message);
    sendUpdaterStatus('error', { message: err.message });
  });
}

// Send updater state to renderer
function sendUpdaterStatus(event, data = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', { event, ...data });
  }
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// ── IPC Handlers ─────────────────────────────────────────────────────────────

/** Full system scan */
ipcMain.handle('scan:full', async () => {
  try {
    const collector = new SystemCollector();
    const data = await collector.collectAll();
    return { success: true, data };
  } catch (err) {
    log.error('[Scan] Error:', err.message);
    return { success: false, error: err.message };
  }
});

/** Diagnostics engine */
ipcMain.handle('diagnose:run', async (_event, systemData) => {
  try {
    const analyzer = new Analyzer();
    const report   = analyzer.analyze(systemData);
    return { success: true, report };
  } catch (err) {
    log.error('[Diagnose] Error:', err.message);
    return { success: false, error: err.message };
  }
});

/** App version */
ipcMain.handle('app:version', () => app.getVersion());

/** Manual update check (triggered from UI) */
ipcMain.handle('updater:check', async () => {
  if (isDev) return { success: false, reason: 'dev-mode' };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/** Quit and install (triggered from UI) */
ipcMain.on('updater:install', () => {
  autoUpdater.quitAndInstall(false, true);
});

/** Window controls (custom frameless titlebar) */
ipcMain.on('window:minimize', () => mainWindow?.minimize());
ipcMain.on('window:maximize', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window:close', () => mainWindow?.close());

/** Safe external URL opener */
ipcMain.on('open:external', (_event, url) => {
  // Whitelist only http/https schemes
  if (/^https?:\/\//i.test(url)) {
    shell.openExternal(url);
  } else {
    log.warn(`Blocked open:external for non-http URL: ${url}`);
  }
});
