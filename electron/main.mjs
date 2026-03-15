import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let logFilePath = '';
const isPortableLaunch = Boolean(process.env.PORTABLE_EXECUTABLE_FILE);

app.disableHardwareAcceleration();
// These GPU fallbacks are a compatibility workaround for real startup/rendering
// failures seen on some Windows portable environments. Do not remove them all
// at once unless you can re-test packaged builds across multiple machines.
//
// If we want to reduce this set later, prefer staged rollback in this order:
// 1. enable-unsafe-swiftshader
// 2. in-process-gpu
// 3. disable-d3d11 / disable-direct-composition
// 4. disable-features UseSkiaRenderer,Vulkan
//
// Note: renderer sandboxing is desirable in theory, but enabling
// `sandbox: true` caused a blank renderer in packaged portable testing for
// this app. Keep that change separate from GPU tuning and only retry it with
// direct packaged-app verification.
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-direct-composition');
app.commandLine.appendSwitch('disable-d3d11');
app.commandLine.appendSwitch('disable-features', 'UseSkiaRenderer,Vulkan');
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('use-angle', 'swiftshader');
app.commandLine.appendSwitch('use-gl', 'swiftshader');
app.commandLine.appendSwitch('enable-unsafe-swiftshader');

function writeLog(message, details) {
  const timestamp = new Date().toISOString();
  const serialized = details === undefined
    ? ''
    : ` ${typeof details === 'string' ? details : JSON.stringify(details)}`;
  const line = `[${timestamp}] ${message}${serialized}\n`;

  try {
    if (!logFilePath) {
      logFilePath = path.join(app.getPath('userData'), 'electron.log');
    }

    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
    fs.appendFileSync(logFilePath, line, 'utf8');
  } catch (error) {
    console.error('log-write-failed', error);
  }

  console.log(line.trim());
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    autoHideMenuBar: true,
    backgroundColor: '#0f1115',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  writeLog('create-window', {
    packaged: app.isPackaged,
    userData: app.getPath('userData'),
    isPortableLaunch,
    portableExecutableDir: process.env.PORTABLE_EXECUTABLE_DIR ?? null,
    portableExecutableFile: process.env.PORTABLE_EXECUTABLE_FILE ?? null,
  });

  window.webContents.on('did-fail-load', (_event, code, description, validatedURL) => {
    writeLog('did-fail-load', { code, description, validatedURL });
  });

  window.webContents.on('render-process-gone', (_event, details) => {
    writeLog('render-process-gone', details);
  });

  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    writeLog('renderer-console', { level, message, line, sourceId });
  });

  window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  writeLog('app-ready', {
    version: app.getVersion(),
    userData: app.getPath('userData'),
    argv: process.argv,
    isPortableLaunch,
    portableExecutableDir: process.env.PORTABLE_EXECUTABLE_DIR ?? null,
    portableExecutableFile: process.env.PORTABLE_EXECUTABLE_FILE ?? null,
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('child-process-gone', (_event, details) => {
  writeLog('child-process-gone', details);
});

app.on('render-process-gone', (_event, _webContents, details) => {
  writeLog('app-render-process-gone', details);
});

app.on('gpu-process-crashed', (_event, killed) => {
  writeLog('gpu-process-crashed', { killed });
});

app.on('window-all-closed', () => {
  writeLog('window-all-closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  writeLog('uncaught-exception', {
    message: error.message,
    stack: error.stack,
  });
});

process.on('unhandledRejection', (reason) => {
  writeLog('unhandled-rejection', String(reason));
});
