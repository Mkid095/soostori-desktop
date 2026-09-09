/**
 * IPC handler registration — split from main.ts to keep entry under 150 lines.
 */

import { registerProductHandlers, registerCategoryHandlers, registerSaleHandlers,
  registerCustomerHandlers, registerDebtHandlers, registerSettingsHandlers,
  registerStockHandlers, registerExpenseHandlers, registerShopHandlers,
  registerAuthHandlers, registerInviteHandlers, registerDeviceHandlers,
  registerAuditHandlers,
  registerSyncSaleHandlers, registerSyncQueueHandlers,
  registerSyncConflictHandlers, registerSyncServiceHandlers,
  registerCloudHandlers,
  registerCloudAuthHandlers,
} from './index'
import { registerCloudAuthIpcHandlers } from './cloud-auth-ipc-handlers'
import { registerHardwareHandlers } from './hardware-handlers'
import { registerAppHandlers } from './app-handlers'

export function registerAllIpcHandlers(): void {
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
  registerAuditHandlers()
  registerSyncSaleHandlers()
  registerSyncQueueHandlers()
  registerSyncConflictHandlers()
  registerCloudHandlers()
  registerCloudAuthHandlers()
  registerCloudAuthIpcHandlers()
  registerHardwareHandlers()
  registerAppHandlers()
  registerSyncServiceHandlers()
}
