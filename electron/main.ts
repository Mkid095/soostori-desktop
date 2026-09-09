import { app, dialog } from 'electron'
import log from 'electron-log'
import { initDatabase, getDatabase } from './database'
import { setMainWindow } from './window-manager'
import { registerAllIpcHandlers } from './ipc-handlers/index-register'
import { setupAutoUpdater } from './updater'
import { startHeartbeatService } from './services/heartbeat-service'
import { initSaleOrchestrator } from './sdk/sale-orchestrator'
import { initInventoryOrchestrator } from './sdk/inventory-orchestrator'
import { getShopId, getDeviceId } from './services/cloud-auth'
import { configureSyncTaskService, startSyncTaskService } from './services/sync-task-service'
import { verifySubscription } from './services/cloud-service'
import { getSyncStore } from './services/store'
import { syncService } from './sync/sync-service'
import { startQueueReplay } from './services/queue-replay'
import { createMainWindow, getMainWindow } from './app-window'
import { setupAppLifecycle } from './app-lifecycle'

log.transports.file.level = 'info'
log.transports.console.level = 'debug'
log.info('Soostori POS starting...')

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error)
  dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`)
  app.exit(1)
})

process.on('unhandledRejection', (reason) => { log.error('Unhandled Rejection:', reason) })

app.whenReady().then(async () => {
  log.info('App ready, initializing...')
  try {
    await initDatabase(); log.info('Database initialized')

    const orchShopId = getShopId() || 'default'
    const orchDeviceId = getDeviceId() || 'local'
    initSaleOrchestrator({ shopId: orchShopId, deviceId: orchDeviceId })
    initInventoryOrchestrator({ shopId: orchShopId, deviceId: orchDeviceId })
    log.info('SDK orchestrators initialized')

    const syncStore = getSyncStore()
    const shop = getDatabase().prepare('SELECT name FROM shops LIMIT 1').get() as { name: string } | undefined
    syncService.configure({
      deviceId: orchDeviceId, userId: syncStore.get('userId') as string ?? '',
      shopId: orchShopId, shopName: shop?.name ?? 'My Shop',
      deviceName: 'POS', deviceType: 'desktop',
      employeeId: syncStore.get('userId') as string ?? '',
      employeeName: syncStore.get('userName') as string ?? '',
      appVersion: app.getVersion(),
    })
    log.info('LAN sync service configured')

    registerAllIpcHandlers(); log.info('IPC handlers registered')

    const win = createMainWindow()
    setMainWindow(win)
    setupAutoUpdater(win)

    configureSyncTaskService(orchDeviceId)
    startSyncTaskService()
    startHeartbeatService()
    startQueueReplay()
    verifySubscription().catch(() => {})

    setupAppLifecycle(() => {
      const w = createMainWindow()
      setMainWindow(w)
    })
  } catch (error) {
    log.error('Failed to initialize app:', error)
    dialog.showErrorBox('Initialization Error', `Failed to start: ${error}`)
    app.exit(1)
  }
})
