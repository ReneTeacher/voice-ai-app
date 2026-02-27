const { app, BrowserWindow, ipcMain, clipboard, globalShortcut, spawn } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let whisperProcess;

// Check if running in development
const isDev = process.env.NODE_ENV === 'development';

// Find the venv python - DEPRECATED since we need system python
// Keeping for reference but not used in packaged app

function startWhisperServer() {
  console.log('Starting Whisper server...');
  
  // Determine the correct path for the script
  let scriptPath;
  let workingDir;
  
  if (app.isPackaged) {
    // Running from packaged app
    scriptPath = path.join(process.resourcesPath, 'app', 'whisper_server.py');
    workingDir = path.join(process.resourcesPath, 'app');
  } else {
    // Running in development
    scriptPath = path.join(__dirname, '..', 'whisper_server.py');
    workingDir = path.join(__dirname, '..');
  }
  
  console.log('Script path:', scriptPath);
  console.log('Working dir:', workingDir);
  
  // Try different python commands
  const pythonCommands = ['python3', 'python', 'pip3'];
  let pythonPath = null;
  
  // For now, try python3
  pythonPath = 'python3';
  
  whisperProcess = spawn(pythonPath, [scriptPath], {
    cwd: workingDir,
    stdio: 'pipe',
    env: { ...process.env }
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
