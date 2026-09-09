/**
 * updater.ts — IPC bridge for DesktopUpdateManager (implements @soostori/updates UpdateManager).
 *
 * All electron-updater semantics are encapsulated in DesktopUpdateManager.
 * This file only exposes IPC handlers that delegate to the manager.
 */

import { ipcMain, BrowserWindow } from 'electron'
import log from 'electron-log'
import { desktopUpdateManager } from './update-manager'
import { getDatabase } from './database'

let mainWindow: BrowserWindow | null = null

// Forward manager status changes to the renderer window
desktopUpdateManager.addListener((status) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', status)
  }
})

export function setupAutoUpdater(win: BrowserWindow): void {
  mainWindow = win

  // Initial check after 5 seconds (non-blocking)
  if (process.env.NODE_ENV !== 'development') {
    setTimeout(() => {
      log.info('[AutoUpdater] Running initial update check...')
      desktopUpdateManager.checkForUpdate().catch((err: Error) => {
        log.error('[AutoUpdater] Initial check failed:', err.message)
      })
    }, 5_000)
  }
}

// ── IPC handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('updater:check', async () => {
  if (process.env.NODE_ENV === 'development') {
    return desktopUpdateManager.getStatus()
  }
  try {
    await desktopUpdateManager.checkForUpdate()
    return desktopUpdateManager.getStatus()
  } catch (error: unknown) {
    return desktopUpdateManager.getStatus()
  }
})

ipcMain.handle('updater:download', async () => {
  try {
    await desktopUpdateManager.downloadUpdate()
    return desktopUpdateManager.getStatus()
  } catch (error: unknown) {
    return desktopUpdateManager.getStatus()
  }
})

ipcMain.handle('updater:install', async () => {
  try {
    await desktopUpdateManager.installUpdate()
    return { status: 'installing' }
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('active sale')) {
      return { blocked: true, reason: 'active_sale' }
    }
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
})

ipcMain.handle('updater:status', async () => {
  return desktopUpdateManager.getStatus()
})

ipcMain.handle('updater:abort', async () => {
  await desktopUpdateManager.abort()
  return desktopUpdateManager.getStatus()
})

log.info('AutoUpdater IPC handlers registered')
