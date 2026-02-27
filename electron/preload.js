const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  getFromClipboard: () => ipcRenderer.invoke('get-from-clipboard'),
  getWhisperStatus: () => ipcRenderer.invoke('get-whisper-status'),
  onTriggerVoice: (callback) => {
    ipcRenderer.on('trigger-voice', callback);
  },
  onWhisperStatus: (callback) => {
    ipcRenderer.on('whisper-status', (event, status) => callback(status));
  }
});
