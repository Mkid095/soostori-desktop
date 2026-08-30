// IPC signatures — DB operations
import type {
  Shop, ShopUser, Invitation, Device, InventoryTransaction,
  DevicePairing, Sale, SyncQueueItem, InventorySnapshot,
  ExpenseRow, ExpenseInput
} from './types'

export interface DbIpc {
  // Products
  getProducts: (shopId?: string) => Promise<unknown[]>
  getProductById: (id: string) => Promise<unknown | null>
  getProductByBarcode: (barcode: string) => Promise<unknown | null>
  createProduct: (product: unknown) => Promise<unknown>
  updateProduct: (id: string, data: unknown) => Promise<unknown>
  deleteProduct: (id: string) => Promise<void>
  searchProducts: (query: string, shopId?: string) => Promise<unknown[]>
  lookupBarcode: (barcode: string) => Promise<unknown | null>
  validateImport: (rows: unknown[]) => Promise<{ new: unknown[]; updates: unknown[]; duplicates: unknown[] }>
  bulkCreate: (products: unknown[]) => Promise<{ createdCount: number }>
  // Categories
  getCategories: (shopId?: string) => Promise<unknown[]>
  createCategory: (category: unknown) => Promise<unknown>
  updateCategory: (id: string, data: unknown) => Promise<unknown>
  deleteCategory: (id: string) => Promise<void>
  // Sales
  getSales: (shopId?: string, limit?: number, offset?: number) => Promise<unknown[]>
  getSaleById: (id: string) => Promise<unknown | null>
  createSale: (sale: unknown) => Promise<unknown>
  getSalesByDateRange: (startDate: string, endDate: string, shopId?: string) => Promise<unknown[]>
  getTopProducts: (startDate: string, endDate: string, limit?: number) => Promise<unknown[]>
  // Held Sales
  getHeldSales: (shopId?: string) => Promise<unknown[]>
  createHeldSale: (sale: unknown) => Promise<unknown>
  deleteHeldSale: (id: string) => Promise<void>
  restoreHeldSale: (id: string) => Promise<unknown>
  // Inventory
  adjustStock: (productId: string, quantityChange: number, reason: string) => Promise<unknown>
  getStockMovements: (productId?: string, limit?: number) => Promise<unknown[]>
  // Shop Settings
  getShopSettings: () => Promise<unknown | null>
  updateShopSettings: (settings: unknown) => Promise<unknown>
  // App Settings
  getAppSettingsDefaults: () => Promise<{ defaultTheme: 'light' | 'dark'; defaultLanguage: 'en' | 'sw'; pinSet: number; lastLogin: string | null }>
  setDefaultTheme: (theme: 'light' | 'dark') => Promise<{ default_theme: string }>
  setDefaultLanguage: (language: 'en' | 'sw') => Promise<{ default_language: string }>
  setPin: (pin: string) => Promise<{ success: boolean }>
  verifyPin: (pin: string) => Promise<{ valid: boolean }>
  recordLogin: () => Promise<void>
  // Customers
  getCustomers: () => Promise<unknown[]>
  getCustomer: (id: string) => Promise<unknown | null>
  createCustomer: (data: unknown) => Promise<unknown>
  updateCustomer: (id: string, data: unknown) => Promise<unknown>
  deleteCustomer: (id: string) => Promise<void>
  // Debts
  getDebts: () => Promise<unknown[]>
  getDebt: (id: string) => Promise<unknown | null>
  createDebt: (data: unknown) => Promise<unknown>
  recordDebtPayment: (debtId: string, amount: number, paymentMethod: string, reference: string) => Promise<unknown>
  getDebtSummary: () => Promise<{ total: number; count: number }>
  getTotalDebtCollected: () => Promise<{ totalCollected: number }>
  // Expenses
  getExpenses: () => Promise<ExpenseRow[]>
  createExpense: (data: ExpenseInput) => Promise<ExpenseRow>
  deleteExpense: (id: string) => Promise<void>
  // Shop / Auth / Team
  getShop: () => Promise<Shop | null>
  createShop: (data: { name: string; currency: string; ownerName: string; ownerPin: string }) => Promise<Shop>
  getUsers: () => Promise<ShopUser[]>
  login: (userId: string, pin: string, deviceId: string) => Promise<{ user: ShopUser; sessionId: string }>
  createUser: (data: { name: string; pin: string; role: string }) => Promise<ShopUser>
  updateUser: (id: string, data: { name?: string; pin?: string; role?: string }) => Promise<ShopUser>
  deleteUser: (id: string) => Promise<void>
  logout: (sessionId: string) => Promise<void>
  // Invitations
  createInvite: (data: { employeeName: string; role: string; deviceName: string }) => Promise<Invitation>
  acceptInvite: (code: string, userName: string, pin: string, deviceName: string) => Promise<{ user: ShopUser; device: Device }>
  listInvites: () => Promise<Invitation[]>
  // Devices
  listDevices: () => Promise<Device[]>
  registerDevice: (data: { name: string; employeeId?: string }) => Promise<Device>
  deviceHeartbeat: (deviceId: string) => Promise<void>
  setHostDevice: (deviceId: string, masterPin: string) => Promise<{ success: boolean }>
  requestPairing: (deviceId: string) => Promise<DevicePairing>
  approvePairing: (pairingId: string) => Promise<void>
  rejectPairing: (pairingId: string) => Promise<void>
  // Inventory TX
  createInventoryTx: (data: { productId: string; eventType: string; quantity: number; balanceAfter: number; status: string; payload?: string }) => Promise<InventoryTransaction>
  getInventoryBalance: (productId: string) => Promise<number>
  getInventoryHistory: (productId: string) => Promise<InventoryTransaction[]>
  // Audit
  auditLog: (data: { action: string; entityType?: string; entityId?: string; payload?: string }) => Promise<void>
  // Sync Sales
  createSyncSale: (data: { shopId: string; userId: string; deviceId: string; total: number; paymentMethod: string; note?: string }) => Promise<Sale>
  updateSyncSaleStatus: (id: string, status: 'confirmed' | 'rejected') => Promise<void>
  getSyncSaleById: (id: string) => Promise<Sale | null>
  listSyncSales: (shopId?: string, limit?: number) => Promise<Sale[]>
  // Sync Queue
  addToSyncQueue: (data: { deviceId: string; eventType: string; payload: string }) => Promise<SyncQueueItem>
  processSyncQueueItem: (id: string, status: 'sent' | 'failed') => Promise<void>
  getPendingSyncQueue: (deviceId: string) => Promise<SyncQueueItem[]>
  // Inventory Snapshots
  createInventorySnapshot: (shopId: string, productCount: number, lastSequence: number) => Promise<InventorySnapshot>
  getLatestInventorySnapshot: (shopId: string) => Promise<InventorySnapshot | null>
}
