/**
 * IPC handler registration — split from main.ts to keep entry under 150 lines.
 */

import {
  registerProductHandlers, registerCategoryHandlers, registerSaleHandlers,
  registerCustomerHandlers, registerDebtHandlers, registerSettingsHandlers,
  registerStockHandlers, registerExpenseHandlers, registerRecurringExpenseHandlers,
  registerShopHandlers,
  registerAuthHandlers, registerInviteHandlers, registerDeviceHandlers,
  registerAuditHandlers,
  registerSyncSaleHandlers, registerSyncQueueHandlers,
  registerSyncConflictHandlers, registerSyncServiceHandlers,
  registerSyncIpcHandlers,
  registerCloudHandlers,
  registerCloudAuthHandlers,
  registerDashboardHandlers,
  registerReportHandlers,
  registerTeamHandlers,
} from './index'
import { registerCloudAuthIpcHandlers } from './cloud-auth-ipc-handlers'
import { registerHardwareHandlers } from './hardware-handlers'
import { registerAppHandlers } from './app-handlers'
import { registerBusinessSetupHandlers } from './business-setup-handlers'
import { registerNotificationHandlers } from './notification-handlers'

export function registerAllIpcHandlers(): void {
  registerProductHandlers()
  registerCategoryHandlers()
  registerSaleHandlers()
  registerCustomerHandlers()
  registerDebtHandlers()
  registerSettingsHandlers()
  registerStockHandlers()
  registerExpenseHandlers()
  registerRecurringExpenseHandlers()
  registerShopHandlers()
  registerAuthHandlers()
  registerInviteHandlers()
  registerDeviceHandlers()
  registerAuditHandlers()
  registerSyncSaleHandlers()
  registerSyncQueueHandlers()
  registerSyncConflictHandlers()
  registerSyncIpcHandlers()
  registerCloudHandlers()
  registerCloudAuthHandlers()
  registerCloudAuthIpcHandlers()
  registerHardwareHandlers()
  registerAppHandlers()
  registerSyncServiceHandlers()
  registerBusinessSetupHandlers()
  registerDashboardHandlers()
  registerReportHandlers()
  registerTeamHandlers()
  registerNotificationHandlers()
}
