export interface ElectronAPI {
  getSheetsUrl: () => Promise<string>;
  setSheetsUrl: (url: string) => Promise<{ success: boolean }>;
  getAppVersion: () => Promise<string>;
  selectFile: (options: Record<string, unknown>) => Promise<{ canceled: boolean; filePaths: string[] }>;
  saveFile: (options: Record<string, unknown>) => Promise<{ canceled: boolean; filePath?: string }>;
  exportCsv: (data: string, filename: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  showNotification: (title: string, body: string) => Promise<{ success: boolean }>;
  platform: string;
  isElectron: boolean;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};
