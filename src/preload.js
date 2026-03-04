/**
 * preload.js — Secure Context Bridge
 * Exposes a safe API surface to the renderer process.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('deviceDoctor', {
  // System scan
  scanSystem: () => ipcRenderer.invoke('scan:full'),
  diagnose: (data) => ipcRenderer.invoke('diagnose:run', data),

  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),

  // Utilities
  openExternal: (url) => ipcRenderer.send('open:external', url),

  // Platform info
  platform: process.platform,
});
