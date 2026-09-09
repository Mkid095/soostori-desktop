import { ipcMain, BrowserWindow } from 'electron'
import log from 'electron-log'
import { syncService } from '../sync/sync-service'
import { dispatchSyncStatus } from '../sync/sync-service-core'

export function registerSyncServiceHandlers(): void {
  ipcMain.handle('sync:startHost', (_event, port?: number) => {
    syncService.startHost(port)
    // Forward status to renderer
    syncService.onEvent(() => {})
    dispatchSyncStatus('online')
    log.info(`SyncService: host started via IPC`)
    return { mode: 'host' }
  })

  ipcMain.handle('sync:startClient', (_event, hostUrl: string, deviceToken?: string) => {
    syncService.startClient(hostUrl, deviceToken)
    log.info(`SyncService: client connecting to ${hostUrl} via IPC`)
    return { mode: 'client' }
  })

  ipcMain.handle('sync:stop', () => {
    syncService.stop()
    dispatchSyncStatus('offline')
    log.info(`SyncService: stopped via IPC`)
    return { mode: 'offline' }
  })

  ipcMain.handle('sync:getMode', () => {
    return { mode: syncService.getMode() }
  })

  ipcMain.handle('sync:getAuthorityStatus', () => {
    return { status: syncService.getAuthorityStatus() }
  })

  // Forward sync service DOM events to all renderer windows
  syncService.onEvent(() => {
    const wins = BrowserWindow.getAllWindows()
    wins.forEach(win => {
      win.webContents.send('sync:statusChange', syncService.getMode())
    })
  })

  log.info('Sync service IPC handlers registered')
}
