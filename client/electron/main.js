const { app, BrowserWindow, Tray, Menu, globalShortcut } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

function createWindow() {
  const iconPath = process.platform === 'win32'
    ? path.join(__dirname, '../public/Melody-Logo.ico')
    : path.join(__dirname, '../public/Melody-Logo-1024.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Melody - High Fidelity Music Player',
    icon: iconPath,
    backgroundColor: '#0f0f13',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Remove default menu for clean Spotify-style desktop appearance
  mainWindow.setMenuBarVisibility(false);

  // In development, load local Vite dev server; in production, load built static files
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:3000';
  mainWindow.loadURL(startUrl).catch(() => {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  });

  // Register Global Media Keys
  globalShortcut.register('MediaPlayPause', () => {
    mainWindow?.webContents.send('media-key', 'play-pause');
  });
  globalShortcut.register('MediaNextTrack', () => {
    mainWindow?.webContents.send('media-key', 'next');
  });
  globalShortcut.register('MediaPreviousTrack', () => {
    mainWindow?.webContents.send('media-key', 'prev');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  createTray();
}

function createTray() {
  const trayIcon = process.platform === 'win32'
    ? path.join(__dirname, '../public/Melody-Taskbar.ico')
    : path.join(__dirname, '../public/Melody-Taskbar-32.png');

  try {
    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Melody Player', enabled: false },
      { type: 'separator' },
      {
        label: 'Show Melody',
        click: () => {
          mainWindow?.show();
          mainWindow?.focus();
        },
      },
      {
        label: 'Quit',
        click: () => {
          app.quit();
        },
      },
    ]);

    tray.setToolTip('Melody - Studio Sound Streaming');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      mainWindow?.show();
      mainWindow?.focus();
    });
  } catch (err) {
    console.warn('[Tray Icon Warning]:', err.message);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
