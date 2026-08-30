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
  createSale: (sale: unknown) => ipcRenderer.invoke('db:sales:create', sale),
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
  createCustomer: (data: unknown) => ipcRenderer.invoke('db:customers:create', data),
  updateCustomer: (id: string, data: unknown) => ipcRenderer.invoke('db:customers:update', id, data),
  deleteCustomer: (id: string) => ipcRenderer.invoke('db:customers:delete', id),
  // Debts
  getDebts: () => ipcRenderer.invoke('db:debts:list'),
  getDebt: (id: string) => ipcRenderer.invoke('db:debts:get', id),
  createDebt: (data: unknown) => ipcRenderer.invoke('db:debts:create', data),
  recordDebtPayment: (debtId: string, amount: number, paymentMethod: string, reference: string) =>
    ipcRenderer.invoke('db:debts:recordPayment', debtId, amount, paymentMethod, reference),
  getDebtSummary: () => ipcRenderer.invoke('db:debts:summary'),
  getTotalDebtCollected: () => ipcRenderer.invoke('db:debts:totalCollected'),
  // Expenses
  getExpenses: () => ipcRenderer.invoke('db:expenses:list'),
  createExpense: (data: unknown) => ipcRenderer.invoke('db:expenses:create', data),
  deleteExpense: (id: string) => ipcRenderer.invoke('db:expenses:delete', id),
  // Shop / Auth / Team
  getShop: () => ipcRenderer.invoke('db:shop:get'),
  createShop: (data: { name: string; currency: string; ownerName: string; ownerPin: string }) =>
    ipcRenderer.invoke('db:shop:create', data),
  getUsers: () => ipcRenderer.invoke('db:shop:getUsers'),
  login: (userId: string, pin: string, deviceId: string) =>
    ipcRenderer.invoke('db:auth:login', userId, pin, deviceId),
  createUser: (data: { name: string; pin: string; role: string }) =>
    ipcRenderer.invoke('db:auth:createUser', data),
  updateUser: (id: string, data: { name?: string; pin?: string; role?: string }) =>
    ipcRenderer.invoke('db:auth:updateUser', id, data),
  deleteUser: (id: string) => ipcRenderer.invoke('db:auth:deleteUser', id),
  logout: (sessionId: string) => ipcRenderer.invoke('db:auth:logout', sessionId),
  // Invitations
  createInvite: (data: { employeeName: string; role: string; deviceName: string }) =>
    ipcRenderer.invoke('db:invites:create', data),
  acceptInvite: (code: string, userName: string, pin: string, deviceName: string) =>
    ipcRenderer.invoke('db:invites:accept', code, userName, pin, deviceName),
  listInvites: () => ipcRenderer.invoke('db:invites:list'),
  // Devices
  listDevices: () => ipcRenderer.invoke('db:devices:list'),
  registerDevice: (data: { name: string; employeeId?: string }) =>
    ipcRenderer.invoke('db:devices:register', data),
  deviceHeartbeat: (deviceId: string) => ipcRenderer.invoke('db:devices:heartbeat', deviceId),
  setHostDevice: (deviceId: string, masterPin: string) =>
    ipcRenderer.invoke('db:devices:setHost', deviceId, masterPin),
  requestPairing: (deviceId: string) => ipcRenderer.invoke('db:devices:requestPairing', deviceId),
  approvePairing: (pairingId: string) => ipcRenderer.invoke('db:devices:approvePairing', pairingId),
  rejectPairing: (pairingId: string) => ipcRenderer.invoke('db:devices:rejectPairing', pairingId),
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
}
