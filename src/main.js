/**
 * main.js — Electron Main Process
 * Device Doctor — System Analyzer
 */

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const SystemCollector = require('./collectors/systemCollector');
const Analyzer = require('./analyzer/analyzer');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    frame: false,           // Custom titlebar
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0d14',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../assets/icons/icon.png'),
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC Handlers ─────────────────────────────────────────────────────────────

/**
 * Full system scan — returns raw collected data
 */
ipcMain.handle('scan:full', async () => {
  try {
    const collector = new SystemCollector();
    const data = await collector.collectAll();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/**
 * Run diagnostics + analysis on collected data
 */
ipcMain.handle('diagnose:run', async (_event, systemData) => {
  try {
    const analyzer = new Analyzer();
    const report = analyzer.analyze(systemData);
    return { success: true, report };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/**
 * Window controls (custom titlebar)
 */
ipcMain.on('window:minimize', () => mainWindow.minimize());
ipcMain.on('window:maximize', () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window:close', () => mainWindow.close());

/**
 * Open external URLs safely
 */
ipcMain.on('open:external', (_event, url) => {
  shell.openExternal(url);
});
