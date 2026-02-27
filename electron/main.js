const { app, BrowserWindow, ipcMain, clipboard, globalShortcut, spawn } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let whisperProcess;

// Check if running in development
const isDev = process.env.NODE_ENV === 'development';

// Find the venv python
function getPythonPath() {
  // Try to find venv python first
  const venvPath = path.join(__dirname, '..', 'venv', 'bin', 'python3');
  if (fs.existsSync(venvPath)) {
    return venvPath;
  }
  // Fallback to system python
  return 'python3';
}

function startWhisperServer() {
  console.log('Starting Whisper server...');
  
  const pythonPath = getPythonPath();
  const scriptPath = path.join(__dirname, '..', 'whisper_server.py');
  
  whisperProcess = spawn(pythonPath, [scriptPath], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe'
  });

  whisperProcess.stdout.on('data', (data) => {
    console.log(`Whisper: ${data}`);
    // Send status to renderer
    if (mainWindow && data.toString().includes('ready')) {
      mainWindow.webContents.send('whisper-status', 'ready');
    }
  });

  whisperProcess.stderr.on('data', (data) => {
    console.error(`Whisper Error: ${data}`);
  });

  whisperProcess.on('close', (code) => {
    console.log(`Whisper server exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    resizable: true,
    frame: true,
    alwaysOnTop: false
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Start Whisper server automatically
  startWhisperServer();
  
  createWindow();

  // Register global shortcut
  globalShortcut.register('CommandOrControl+Shift+V', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.webContents.send('trigger-voice');
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Kill whisper server when app closes
  if (whisperProcess) {
    whisperProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('copy-to-clipboard', async (event, text) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.handle('get-from-clipboard', async () => {
  return clipboard.readText();
});

ipcMain.handle('get-whisper-status', async () => {
  return whisperProcess ? 'running' : 'stopped';
});
