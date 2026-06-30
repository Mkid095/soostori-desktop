import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import log from 'electron-log'
import { initDatabase, getDatabase } from './database'
import { registerDatabaseHandlers } from './ipc-handlers/database-handlers'
import { registerHardwareHandlers } from './ipc-handlers/hardware-handlers'
import { registerAppHandlers } from './ipc-handlers/app-handlers'

// Configure logging
log.transports.file.level = 'info'
log.transports.console.level = 'debug'
log.info('Soostori POS starting...')

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error)
  dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`)
  app.exit(1)
})

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Rejection:', reason)
})

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Soostori POS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for better-sqlite3
    },
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    log.info('Main window shown')
  })

  // Load the app
  if (process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL || 'http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  log.info('App ready, initializing...')

  try {
    // Initialize database
    await initDatabase()
    log.info('Database initialized')

    // Register IPC handlers
    registerDatabaseHandlers()
    registerHardwareHandlers()
    registerAppHandlers()
    log.info('IPC handlers registered')

    createWindow()
  } catch (error) {
    log.error('Failed to initialize app:', error)
    dialog.showErrorBox('Initialization Error', `Failed to start: ${error}`)
    app.exit(1)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  log.info('App quitting...')
  const db = getDatabase()
  if (db) {
    db.close()
    log.info('Database closed')
  }
})
