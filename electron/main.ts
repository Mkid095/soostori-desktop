import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'path'
import log from 'electron-log'
import { initDatabase, getDatabase } from './database'
import { setMainWindow } from './window-manager'
import {
  registerProductHandlers, registerCategoryHandlers, registerSaleHandlers,
  registerCustomerHandlers, registerDebtHandlers, registerSettingsHandlers,
  registerStockHandlers, registerExpenseHandlers, registerShopHandlers,
  registerAuthHandlers, registerInviteHandlers, registerDeviceHandlers,
  registerInventoryTxHandlers, registerAuditHandlers,
  registerSyncSaleHandlers, registerSyncQueueHandlers,
  registerSyncConflictHandlers,
  registerCloudHandlers,
} from './ipc-handlers'
import { registerHardwareHandlers } from './ipc-handlers/hardware-handlers'
import { registerAppHandlers } from './ipc-handlers/app-handlers'
import { setupAutoUpdater } from './updater'
import { startHeartbeatService } from './services/heartbeat-service'
import { configureSyncTaskService, startSyncTaskService, stopSyncTaskService } from './services/sync-task-service'
import { verifySubscription } from './services/cloud-service'
import { getSyncStore } from './services/store'

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
    frame: false, // Custom title bar via renderer
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // Required for better-sqlite3
    },
    show: false,
  })

  // Double-click title bar region to maximize/restore
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('app:window:maximizeChange', true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('app:window:maximizeChange', false)
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
    registerProductHandlers()
    registerCategoryHandlers()
    registerSaleHandlers()
    registerCustomerHandlers()
    registerDebtHandlers()
    registerSettingsHandlers()
    registerStockHandlers()
    registerExpenseHandlers()
    registerShopHandlers()
    registerAuthHandlers()
    registerInviteHandlers()
    registerDeviceHandlers()
    registerInventoryTxHandlers()
    registerAuditHandlers()
    registerSyncSaleHandlers()
    registerSyncQueueHandlers()
    registerSyncConflictHandlers()
    registerCloudHandlers()
    registerHardwareHandlers()
    registerAppHandlers()
    log.info('IPC handlers registered')

    createWindow()
    setMainWindow(mainWindow!)

    // Set up auto-updater after window is created
    // Configure your update server URL in electron-builder.yml publish field
    setupAutoUpdater(mainWindow!)

    // Start background services
    const syncStore = getSyncStore()
    const deviceId = (syncStore.get('deviceId') as string | undefined) ?? ''
    configureSyncTaskService(deviceId)
    startSyncTaskService()
    startHeartbeatService()
    verifySubscription().catch(() => {})  // fire-and-forget, non-blocking
  } catch (error) {
    log.error('Failed to initialize app:', error)
    dialog.showErrorBox('Initialization Error', `Failed to start: ${error}`)
    app.exit(1)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
      setMainWindow(mainWindow!)
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
  stopSyncTaskService()
  const db = getDatabase()
  if (db) {
    db.close()
    log.info('Database closed')
  }
})
