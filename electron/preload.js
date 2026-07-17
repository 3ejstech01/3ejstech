const { contextBridge, ipcRenderer } = require('electron');

// Expose safe IPC methods to renderer
contextBridge.exposeInMainWorld('electron', {
  // Settings
  getSheetsUrl: () => ipcRenderer.invoke('get-sheets-url'),
  setSheetsUrl: (url) => ipcRenderer.invoke('set-sheets-url', url),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // File operations
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  exportCsv: (data, filename) => ipcRenderer.invoke('export-csv', data, filename),
  
  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  
  // Platform info
  platform: process.platform,
  isElectron: true,
});
