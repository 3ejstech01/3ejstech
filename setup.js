const fs = require('fs');
const path = require('path');

console.log('🚀 Completing Electron setup...\n');

// 1. Update package.json with build configuration
console.log('1. Updating package.json with electron-builder config...');
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

packageJson.build = {
  appId: 'com.3ejs.tech',
  productName: '3EJS Tech',
  files: ['out/**/*', 'electron/**/*', 'public/**/*', 'package.json'],
  directories: { buildResources: 'public' },
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'public/logo.png'
  },
  nsis: {
    oneClick: true,
    perMachine: false,
    allowToChangeInstallationDirectory: false,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  }
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
console.log('✅ package.json updated\n');

// 2. Create TypeScript types for Electron
console.log('2. Creating TypeScript type definitions...');
const typesDir = path.join(__dirname, 'src', 'types');
if (!fs.existsSync(typesDir)) { fs.mkdirSync(typesDir, { recursive: true }); }

const electronTypes = 'export interface ElectronAPI {\n  getSheetsUrl: () => Promise<string>;\n  setSheetsUrl: (url: string) => Promise<{ success: boolean }>;\n  getAppVersion: () => Promise<string>;\n  selectFile: (options: any) => Promise<any>;\n  saveFile: (options: any) => Promise<any>;\n  exportCsv: (data: string, filename: string) => Promise<{ success: boolean; path?: string; error?: string }>;\n  showNotification: (title: string, body: string) => Promise<{ success: boolean }>;\n  platform: string;\n  isElectron: boolean;\n}\n\ndeclare global {\n  interface Window {\n    electron?: ElectronAPI;\n  }\n}\n\nexport {};\n';

fs.writeFileSync(path.join(typesDir, 'electron.d.ts'), electronTypes, 'utf8');
console.log('✅ TypeScript types created\n');

console.log('✅ Setup complete!\n');
