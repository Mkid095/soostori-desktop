import { app, BrowserWindow, ipcMain } from 'electron'
import { autoUpdater, UpdateInfo } from 'electron-updater'
import log from 'electron-log'

let mainWindow: BrowserWindow | null = null

export function setupAutoUpdater(win: BrowserWindow): void {
  mainWindow = win

  // Configure logging for auto-updater
  autoUpdater.logger = log
  // electron-log v5 uses log.transports, not logger.transports
  log.transports.file.level = 'info'
  log.transports.console.level = 'debug'

  // Disable auto-download — we want user control
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  // Track update state
  let updateAvailable = false
  let updateInfo: UpdateInfo | null = null

  // ---- Event handlers ----

  autoUpdater.on('checking-for-update', () => {
    log.info('[AutoUpdater] Checking for update...')
    sendUpdateStatus('checking')
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    log.info(`[AutoUpdater] Update available: ${info.version}`)
    updateAvailable = true
    updateInfo = info
    // releaseNotes can be string | ReleaseNoteInfo[] | null - normalize to string
    const releaseNotes = Array.isArray(info.releaseNotes)
      ? info.releaseNotes.map(n => n.note).join('\n')
      : info.releaseNotes ?? undefined
    sendUpdateStatus('available', { version: info.version, releaseNotes })
  })

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    log.info(`[AutoUpdater] No update available. Current: ${app.getVersion()}, latest: ${info.version}`)
    updateAvailable = false
    updateInfo = null
    sendUpdateStatus('not-available', { version: app.getVersion() })
  })

  autoUpdater.on('download-progress', (progress) => {
    log.info(`[AutoUpdater] Download progress: ${progress.percent.toFixed(1)}%`)
    sendUpdateStatus('downloading', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    log.info(`[AutoUpdater] Update downloaded: ${info.version}`)
    sendUpdateStatus('ready', { version: info.version })
  })

  autoUpdater.on('error', (error: Error) => {
    log.error('[AutoUpdater] Error:', error.message)
    sendUpdateStatus('error', { message: error.message })
  })

  // ---- IPC handlers ----

  ipcMain.handle('updater:check', async () => {
    if (process.env.NODE_ENV === 'development') {
      log.info('[AutoUpdater] Skipping update check in dev mode')
      return { status: 'dev-mode', version: app.getVersion() }
    }
    try {
      await autoUpdater.checkForUpdates()
      return { status: 'checking', version: app.getVersion() }
    } catch (error: any) {
      return { status: 'error', message: error.message }
    }
  })

  ipcMain.handle('updater:download', async () => {
    if (!updateAvailable) {
      return { status: 'error', message: 'No update available to download' }
    }
    try {
      await autoUpdater.downloadUpdate()
      return { status: 'downloading' }
    } catch (error: any) {
      return { status: 'error', message: error.message }
    }
  })

  ipcMain.handle('updater:install', () => {
    log.info('[AutoUpdater] Installing update and restarting...')
    autoUpdater.quitAndInstall(false, true)
  })

  ipcMain.handle('updater:status', () => {
    if (updateInfo) {
      return { status: 'ready', version: updateInfo.version }
    }
    return { status: 'unknown', version: app.getVersion() }
  })

  // ---- Helper ----

  function sendUpdateStatus(
    status: string,
    data?: {
      version?: string
      message?: string
      releaseNotes?: string
      percent?: number
      bytesPerSecond?: number
      transferred?: number
      total?: number
    }
  ) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:status', { status, ...data })
    }
  }

  // Initial check after 5 seconds
  if (process.env.NODE_ENV !== 'development') {
    setTimeout(() => {
      log.info('[AutoUpdater] Running initial update check...')
      autoUpdater.checkForUpdates().catch((err: Error) => {
        log.error('[AutoUpdater] Initial check failed:', err.message)
      })
    }, 5000)
  }
}
