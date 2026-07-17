const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const { startServer } = require('../server.js');

// Initialize electron-store for persistent settings
const store = new Store.default();

// The bundled Next server runs in production mode, so it requires a session
// secret to sign auth cookies. Generate a stable per-install secret (stored in
// electron-store) so login works out-of-the-box without manual env setup.
if (!process.env.SESSION_SECRET) {
  let secret = store.get('sessionSecret');
  if (!secret) {
    secret = require('crypto').randomBytes(32).toString('hex');
    store.set('sessionSecret', secret);
  }
  process.env.SESSION_SECRET = secret;
}

let mainWindow;
let nextServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: '3EJS Tech - ISP Management',
    icon: path.join(__dirname, '../public/logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // In dev (`electron .`) the Next dev server is started separately
  // (see the `electron:dev` script) and is already on :3000.
  // In a packaged build the Next server runs in this same process.
  mainWindow.loadURL('http://localhost:3000');

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function boot() {
  // Run the Next.js server in-process. A packaged build has no standalone
  // `node` binary to spawn, so we boot Next inside the Electron main process.
  if (app.isPackaged) {
    try {
      // Next reads its `.next` output from the current working directory,
      // which is the app dir bundled at resources/app.
      process.chdir(path.join(process.resourcesPath, 'app'));
      nextServer = await startServer(false);
    } catch (err) {
      console.error('Failed to start Next.js server:', err);
    }
  }
  try {
    createWindow();
  } catch (err) {
    // A window can fail to open in headless/remote contexts; the API server
    // above is already running, so keep the process alive.
    console.error('Failed to create BrowserWindow:', err);
  }
}

app.whenReady().then(boot);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.close();
    nextServer = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for Google Sheets URL configuration
ipcMain.handle('get-sheets-url', async () => {
  return store.get('sheetsUrl', process.env.NEXT_PUBLIC_WEBAPP_URL || '');
});

ipcMain.handle('set-sheets-url', async (event, url) => {
  store.set('sheetsUrl', url);
  return { success: true };
});

ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

ipcMain.handle('select-file', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('save-file', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

// Export/Import data handlers
ipcMain.handle('export-csv', async (event, data, filename) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export CSV',
    defaultPath: filename,
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
  });

  if (filePath) {
    try {
      fs.writeFileSync(filePath, data, 'utf-8');
      return { success: true, path: filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'Cancelled' };
});

// System tray notification
ipcMain.handle('show-notification', async (event, title, body) => {
  const { Notification } = require('electron');
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
  return { success: true };
});
