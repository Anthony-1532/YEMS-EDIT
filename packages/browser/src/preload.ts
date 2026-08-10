import { contextBridge, ipcRenderer } from 'electron';

interface BrowserAPI {
  navigate: (url: string) => Promise<void>;
  onNavigate: (callback: (url: string) => void) => void;
}

contextBridge.exposeInMainWorld('browserAPI', {
  navigate: (url: string): Promise<void> => ipcRenderer.invoke('navigate', url),
  onNavigate: (callback: (url: string) => void): void => {
    ipcRenderer.on('did-navigate', (_e: Electron.IpcRendererEvent, url: string) => callback(url));
  },
} as BrowserAPI);
