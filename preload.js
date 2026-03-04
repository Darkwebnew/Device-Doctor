/**
 * preload.js — Secure Context Bridge
 *
 * This is the ONLY file that can touch Node.js/Electron APIs from
 * the renderer side. It exposes a minimal, explicit API surface.
 * The renderer cannot require() anything or access process/ipcRenderer
 * directly — it must go through window.deviceDoctor.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Allowlist of updater events the renderer may receive
const ALLOWED_UPDATER_EVENTS = [
  'checking', 'available', 'up-to-date',
  'downloading', 'downloaded', 'error',
];

contextBridge.exposeInMainWorld('deviceDoctor', {

  // ── System operations ───────────────────────────────────────────────────
  scanSystem:  ()     => ipcRenderer.invoke('scan:full'),
  diagnose:    (data) => ipcRenderer.invoke('diagnose:run', data),
  getVersion:  ()     => ipcRenderer.invoke('app:version'),

  // ── Auto-updater ────────────────────────────────────────────────────────
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installUpdate:   () => ipcRenderer.send('updater:install'),

  // Listen for updater status pushed from main
  onUpdaterStatus: (callback) => {
    const handler = (_event, payload) => {
      if (ALLOWED_UPDATER_EVENTS.includes(payload.event)) {
        callback(payload);
      }
    };
    ipcRenderer.on('updater:status', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('updater:status', handler);
  },

  // ── Window controls ─────────────────────────────────────────────────────
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close:    () => ipcRenderer.send('window:close'),

  // ── Utilities ───────────────────────────────────────────────────────────
  openExternal: (url) => {
    // Validate in renderer before sending to main (defence in depth)
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      ipcRenderer.send('open:external', url);
    }
  },

  // Read-only platform info (safe to expose directly)
  platform: process.platform,
  arch:     process.arch,
});
