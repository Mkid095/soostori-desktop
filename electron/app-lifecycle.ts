/**
 * app-lifecycle.ts — App-level lifecycle management.
 * Extracted from main.ts per ANPAS (≤150 lines per file).
 */

import { app, BrowserWindow, dialog } from 'electron'
import { getDatabase } from './database'
import { syncService } from './sync/sync-service'
import { stopSyncTaskService } from './services/sync-task-service'
import log from 'electron-log'

export function setupAppLifecycle(onActivate: () => void): void {
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) onActivate()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    log.info('App quitting...')
    stopSyncTaskService()
    syncService.stop()
    const db = getDatabase()
    if (db) { db.close(); log.info('Database closed') }
  })
}
