import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'YEMS Browser',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

ipcMain.handle('navigate', (_event: Electron.IpcMainInvokeEvent, url: string) => {
  if (mainWindow) {
    const formatted = url.startsWith('http') ? url : `https://${url}`;
    mainWindow.webContents.send('did-navigate', formatted);
  }
});

ipcMain.handle('get-session-cookies', async () => {
  const cookies = await session.defaultSession.cookies.get({});
  return cookies;
});
