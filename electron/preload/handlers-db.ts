import { ipcRenderer } from 'electron'
import type { DbIpc, ReceiptData } from './types'

export const dbHandlers: DbIpc = {
  // Products
  getProducts: (shopId?: string) => ipcRenderer.invoke('db:products:list', shopId),
  getProductById: (id: string) => ipcRenderer.invoke('db:products:get', id),
  getProductByBarcode: (barcode: string) => ipcRenderer.invoke('db:products:getByBarcode', barcode),
  createProduct: (product: unknown) => ipcRenderer.invoke('db:products:create', product),
  updateProduct: (id: string, data: unknown) => ipcRenderer.invoke('db:products:update', id, data),
  deleteProduct: (id: string) => ipcRenderer.invoke('db:products:delete', id),
  searchProducts: (query: string, shopId?: string) => ipcRenderer.invoke('db:products:search', query, shopId),
  lookupBarcode: (barcode: string) => ipcRenderer.invoke('db:products:lookupBarcode', barcode),
  validateImport: (rows: unknown[]) => ipcRenderer.invoke('db:products:validateImport', rows),
  bulkCreate: (products: unknown[]) => ipcRenderer.invoke('db:products:bulkCreate', products),
  // Categories
  getCategories: (shopId?: string) => ipcRenderer.invoke('db:categories:list', shopId),
  createCategory: (category: unknown) => ipcRenderer.invoke('db:categories:create', category),
  updateCategory: (id: string, data: unknown) => ipcRenderer.invoke('db:categories:update', id, data),
  deleteCategory: (id: string) => ipcRenderer.invoke('db:categories:delete', id),
  // Sales
  getSales: (shopId?: string, limit?: number, offset?: number) => ipcRenderer.invoke('db:sales:list', shopId, limit, offset),
  getSaleById: (id: string) => ipcRenderer.invoke('db:sales:get', id),
  getRecentSales: (limit?: number) => ipcRenderer.invoke('db:sales:recent', limit),
  createSale: (sale: unknown) => ipcRenderer.invoke('db:sales:create', sale),
  refundSale: (input: { saleId: string; lineItems?: Array<{ productId: string; quantity: number }>; refundAmount: number; reason: string; paymentMethod: 'cash' | 'mobile_money' | 'card' }) =>
    ipcRenderer.invoke('db:sales:refund', input),
  voidSale: (saleId: string, reason: string) => ipcRenderer.invoke('db:sales:void', saleId, reason),
  getSalesByDateRange: (startDate: string, endDate: string, shopId?: string) =>
    ipcRenderer.invoke('db:sales:listByDateRange', startDate, endDate, shopId),
  getTopProducts: (startDate: string, endDate: string, limit?: number) =>
    ipcRenderer.invoke('db:sales:topProducts', startDate, endDate, limit),
  // Held Sales
  getHeldSales: (shopId?: string) => ipcRenderer.invoke('db:held-sales:list', shopId),
  createHeldSale: (sale: unknown) => ipcRenderer.invoke('db:held-sales:create', sale),
  deleteHeldSale: (id: string) => ipcRenderer.invoke('db:held-sales:delete', id),
  restoreHeldSale: (id: string) => ipcRenderer.invoke('db:held-sales:restore', id),
  // Inventory
  adjustStock: (productId: string, quantityChange: number, reason: string) =>
    ipcRenderer.invoke('db:inventory:adjust', productId, quantityChange, reason),
  getStockMovements: (productId?: string, limit?: number) =>
    ipcRenderer.invoke('db:inventory:movements', productId, limit),
  receiveStock: (data: { productId: string; quantity: number; supplier?: string; notes?: string }) =>
    ipcRenderer.invoke('db:inventory:receive', data),
  transferStock: (data: { productId: string; fromBusinessId: string; toBusinessId: string; quantity: number }) =>
    ipcRenderer.invoke('db:inventory:transfer', data),
  countStock: (data: { counts: Array<{ productId: string; counted: number }> }) =>
    ipcRenderer.invoke('db:inventory:count', data),
  getLowStockProducts: () =>
    ipcRenderer.invoke('db:inventory:lowStock'),
  // Shop Settings
  getShopSettings: () => ipcRenderer.invoke('db:shop-settings:get'),
  updateShopSettings: (settings: unknown) => ipcRenderer.invoke('db:shop-settings:update', settings),
  // App Settings
  getAppSettingsDefaults: () => ipcRenderer.invoke('app:settings:getDefaults'),
  setDefaultTheme: (theme: 'light' | 'dark') => ipcRenderer.invoke('app:settings:setDefaultTheme', theme),
  setDefaultLanguage: (language: 'en' | 'sw') => ipcRenderer.invoke('app:settings:setDefaultLanguage', language),
  setPin: (pin: string) => ipcRenderer.invoke('app:settings:setPin', pin),
  verifyPin: (pin: string) => ipcRenderer.invoke('app:settings:verifyPin', pin),
  recordLogin: () => ipcRenderer.invoke('app:settings:recordLogin'),
  // Customers
  getCustomers: () => ipcRenderer.invoke('db:customers:list'),
  getCustomer: (id: string) => ipcRenderer.invoke('db:customers:get', id),
  createCustomer: (data: unknown, idempotencyKey?: string) =>
    ipcRenderer.invoke('db:customers:create', data, idempotencyKey),
  updateCustomer: (id: string, data: unknown) => ipcRenderer.invoke('db:customers:update', id, data),
  deleteCustomer: (id: string) => ipcRenderer.invoke('db:customers:delete', id),
  searchCustomers: (query: string) => ipcRenderer.invoke('db:customers:search', query),
  getCustomerPurchaseHistory: (customerId: string) =>
    ipcRenderer.invoke('db:customers:purchaseHistory', customerId),
  attachCustomerToSale: (saleId: string, customerId: string) =>
    ipcRenderer.invoke('db:customers:attachToSale', saleId, customerId),
  // Debts
  getDebts: () => ipcRenderer.invoke('db:debts:list'),
  getDebt: (id: string) => ipcRenderer.invoke('db:debts:get', id),
  createDebt: (data: unknown) => ipcRenderer.invoke('db:debts:create', data),
  recordDebtPayment: (debtId: string, amount: number, paymentMethod: string, reference: string) =>
    ipcRenderer.invoke('db:debts:recordPayment', debtId, amount, paymentMethod, reference),
  getDebtSummary: () => ipcRenderer.invoke('db:debts:summary'),
  getTotalDebtCollected: () => ipcRenderer.invoke('db:debts:totalCollected'),
  getCustomerDebts: (customerId: string) => ipcRenderer.invoke('db:debts:byCustomer', customerId),
  getCustomerDebtBalance: (customerId: string) => ipcRenderer.invoke('db:debts:customerBalance', customerId),
  // Expenses
  getExpenses: () => ipcRenderer.invoke('db:expenses:list'),
  createExpense: (data: unknown) => ipcRenderer.invoke('db:expenses:create', data),
  deleteExpense: (id: string) => ipcRenderer.invoke('db:expenses:delete', id),
  approveExpense: (id: string) => ipcRenderer.invoke('db:expenses:approve', id),
  markExpensePaid: (id: string) => ipcRenderer.invoke('db:expenses:markPaid', id),
  getExpenseSummary: (month: string) => ipcRenderer.invoke('db:expenses:summary', month),
  getRecurringExpenses: () => ipcRenderer.invoke('db:expenses:recurring:list'),
  createRecurringExpense: (data: unknown) => ipcRenderer.invoke('db:expenses:recurring:create', data),
  deleteRecurringExpense: (id: string) => ipcRenderer.invoke('db:expenses:recurring:delete', id),
  // Shop / Auth / Team
  getShop: () => ipcRenderer.invoke('db:shop:get'),
  getDeviceId: () => ipcRenderer.invoke('db:device:getId'),
  createShop: (data: { name: string; currency: string; ownerName: string; ownerPin: string }) =>
    ipcRenderer.invoke('db:shop:create', data),
  getUsers: (shopId: string) => ipcRenderer.invoke('db:shop:getUsers', shopId),
  // D3: login sends one object so the handler's Zod schema parses correctly
  login: (userId: string, pin: string, deviceId: string, shopId: string) =>
    ipcRenderer.invoke('db:auth:login', { userId, pin, deviceId, shopId }),
  // D4: createUser sends shopId + createdBy so the Zod schema accepts the payload
  createUser: (data: { name: string; pin: string; role: string; shopId: string; createdBy: string }) =>
    ipcRenderer.invoke('db:auth:createUser', data),
  updateUser: (id: string, data: { name?: string; pin?: string; role?: string }) =>
    ipcRenderer.invoke('db:auth:updateUser', id, data),
  deleteUser: (id: string) => ipcRenderer.invoke('db:auth:deleteUser', id),
  // D5: logout sends one object so the handler can read all three fields
  logout: (sessionId: string, deviceId: string, userId: string) =>
    ipcRenderer.invoke('db:auth:logout', { sessionId, deviceId, userId }),
  // Invitations
  createInvite: (data: { shopId: string; employeeName: string; role: string; createdBy: string; deviceName?: string }) =>
    ipcRenderer.invoke('db:invites:create', data),
  // D7: accepts the payload shape the handler already expects
  acceptInvite: (code: string, userName: string, pin: string, deviceId: string) =>
    ipcRenderer.invoke('db:invites:accept', { code, userName, pin, deviceId }),
  listInvites: () => ipcRenderer.invoke('db:invites:list'),
  // Devices
  listDevices: (shopId: string) => ipcRenderer.invoke('db:devices:list', shopId),
  registerDevice: (data: { deviceId: string; shopId: string; deviceName?: string; employeeId?: string }) =>
    ipcRenderer.invoke('db:devices:register', data),
  deviceHeartbeat: (deviceId: string) => ipcRenderer.invoke('db:devices:heartbeat', deviceId),
  setHostDevice: (deviceId: string, masterPin: string) =>
    ipcRenderer.invoke('db:devices:setHost', deviceId, masterPin),
  requestPairing: (data: { shopId: string; deviceId: string; requestedBy: string; deviceName?: string }) =>
    ipcRenderer.invoke('db:devices:requestPairing', data),
  approvePairing: (pairingId: string, approvedBy: string) => ipcRenderer.invoke('db:devices:approvePairing', pairingId, approvedBy),
  rejectPairing: (pairingId: string) => ipcRenderer.invoke('db:devices:rejectPairing', pairingId),
  getPairings: (shopId: string) => ipcRenderer.invoke('db:devices:getPairings', shopId),
  getPrimaryStatus: (shopId: string) => ipcRenderer.invoke('db:devices:getPrimaryStatus', shopId),
  transferPrimaryDevice: (toDeviceId: string, shopId: string) =>
    ipcRenderer.invoke('db:devices:transferPrimary', toDeviceId, shopId),
  // Inventory TX
  createInventoryTx: (data: { productId: string; eventType: string; quantity: number; balanceAfter: number; status: string; payload?: string }) =>
    ipcRenderer.invoke('db:inventory:txCreate', data),
  getInventoryBalance: (productId: string) => ipcRenderer.invoke('db:inventory:getBalance', productId),
  getInventoryHistory: (productId: string) => ipcRenderer.invoke('db:inventory:getHistory', productId),
  // Audit
  auditLog: (data: { action: string; entityType?: string; entityId?: string; payload?: string }) =>
    ipcRenderer.invoke('db:audit:log', data),
  // Sync Sales
  createSyncSale: (data: { shopId: string; userId: string; deviceId: string; total: number; paymentMethod: string; note?: string }) =>
    ipcRenderer.invoke('db:syncSales:create', data),
  updateSyncSaleStatus: (id: string, status: 'confirmed' | 'rejected') =>
    ipcRenderer.invoke('db:syncSales:updateStatus', id, status),
  getSyncSaleById: (id: string) => ipcRenderer.invoke('db:syncSales:get', id),
  listSyncSales: (shopId?: string, limit?: number) => ipcRenderer.invoke('db:syncSales:list', shopId, limit),
  // Sync Queue
  addToSyncQueue: (data: { deviceId: string; eventType: string; payload: string }) =>
    ipcRenderer.invoke('db:syncQueue:add', data),
  processSyncQueueItem: (id: string, status: 'sent' | 'failed') =>
    ipcRenderer.invoke('db:syncQueue:process', id, status),
  getPendingSyncQueue: (deviceId: string) => ipcRenderer.invoke('db:syncQueue:getPending', deviceId),
  // Inventory Snapshots
  createInventorySnapshot: (shopId: string, productCount: number, lastSequence: number) =>
    ipcRenderer.invoke('db:inventory:createSnapshot', shopId, productCount, lastSequence),
  getLatestInventorySnapshot: (shopId: string) =>
    ipcRenderer.invoke('db:inventory:getLatestSnapshot', shopId),
  // LAN Sync Service
  syncStartHost: (port?: number) => ipcRenderer.invoke('sync:startHost', port),
  syncStartClient: (hostUrl: string, deviceToken?: string) => ipcRenderer.invoke('sync:startClient', hostUrl, deviceToken),
  syncStop: () => ipcRenderer.invoke('sync:stop'),
  syncGetMode: () => ipcRenderer.invoke('sync:getMode'),
  syncGetAuthorityStatus: () => ipcRenderer.invoke('sync:getAuthorityStatus'),
  // Business Setup
  businessSetup: (input) => ipcRenderer.invoke('db:business:setup', input),
  listBusinessesForUser: () => ipcRenderer.invoke('db:business:listForUser'),
  setActiveBusiness: (businessId: string) => ipcRenderer.invoke('db:business:setActive', businessId),
  getActiveBusinessId: () => ipcRenderer.invoke('db:business:getActive'),
  // Dashboard (Phase 12)
  getDashboard: () => ipcRenderer.invoke('db:dashboard'),
  getDashboardSales: () => ipcRenderer.invoke('db:dashboard:sales'),
  getDashboardStock: () => ipcRenderer.invoke('db:dashboard:stock'),
  getDashboardDebt: () => ipcRenderer.invoke('db:dashboard:debt'),
  // Reports (Phase 13)
  getDashboardSummary: () => ipcRenderer.invoke('db:reports:dashboardSummary'),
  getSalesReport: (from: string, to: string) => ipcRenderer.invoke('db:reports:sales', from, to),
  getInventoryReport: () => ipcRenderer.invoke('db:reports:inventory'),
  getDebtReport: () => ipcRenderer.invoke('db:reports:debt'),
  getExpenseReport: (month: string) => ipcRenderer.invoke('db:reports:expense', month),
  // Team (Phase 14)
  teamInvite: (data: { email: string; role: string; invitedByEmployeeId: string }) =>
    ipcRenderer.invoke('db:team:invite', data),
  teamListInvitations: () => ipcRenderer.invoke('db:team:listInvitations'),
  teamCancelInvitation: (id: string) => ipcRenderer.invoke('db:team:cancelInvitation', id),
  teamListMembers: () => ipcRenderer.invoke('db:team:listMembers'),
  teamUpdateMember: (membershipId: string, data: { role?: string; permissions?: string[] }) =>
    ipcRenderer.invoke('db:team:updateMember', { membershipId, ...data }),
  teamRemoveMember: (membershipId: string) => ipcRenderer.invoke('db:team:removeMember', membershipId),
}
