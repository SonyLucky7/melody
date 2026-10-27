const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('melodyDesktop', {
  platform: process.platform,
  onMediaKey: (callback) => {
    ipcRenderer.on('media-key', (event, key) => callback(key));
  },
});
