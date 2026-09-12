// IPC signatures — DB operations
import type {
  Shop, ShopUser, Invitation, Device, InventoryTransaction,
  DevicePairing, Sale, SyncQueueItem, InventorySnapshot,
  ExpenseRow, ExpenseInput
} from './types'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface NotificationRecord {
  id: string
  business_id: string
  user_id: string
  event_type: string
  payload: Record<string, unknown>
  priority: NotificationPriority
  created_at: string
  read_at: string | null
}

export interface NotificationPrefRecord {
  id: string
  user_id: string
  event_type: string
  channel: string
  enabled: boolean
}

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
  // LAN Sync Service
  syncStartHost: (port?: number) => Promise<void>
  syncStartClient: (hostUrl: string, deviceToken?: string) => Promise<void>
  syncStop: () => Promise<void>
  syncGetMode: () => Promise<'host' | 'client' | 'offline'>
  syncGetAuthorityStatus: () => Promise<{ status: 'online' | 'stale' | 'lost' | 'unknown' }>
  // Notifications
  listNotifications: (opts?: { limit?: number; offset?: number; eventType?: string; unreadOnly?: boolean }) =>
    Promise<{ items: NotificationRecord[]; total: number; hasMore: boolean }>
  markNotificationRead: (id: string) => Promise<{ ok: boolean }>
  markAllNotificationsRead: () => Promise<{ ok: boolean }>
  createNotification: (data: { eventType: string; payload?: Record<string, unknown>; priority?: string; userId?: string }) =>
    Promise<{ id: string }>
  getNotificationPreferences: () => Promise<NotificationPrefRecord[]>
  setNotificationPreference: (data: { eventType: string; channel: string; enabled: boolean }) => Promise<{ ok: boolean }>
  getUnreadNotificationCount: () => Promise<number>
  // M-Pesa STK Push
  mpesaStkPush: (phone: string, amount: number, accountRef: string) =>
    Promise<{ success: boolean; id?: string; checkoutRequestId?: string; error?: string }>
  mpesaPollSTK: (id: string, checkoutRequestId: string) =>
    Promise<{ success: boolean; status?: 'pending' | 'completed' | 'failed' | 'timeout'; error?: string }>
  // Reports (Phase 19)
  getDashboardSummary: () => Promise<{
    todaySales: number; weekSales: number; monthSales: number
    todayRevenue: number; weekRevenue: number; monthRevenue: number
    monthCost: number; grossProfit: number; grossMargin: number
    lowStockCount: number; outstandingDebts: number; pendingExpenses: number; activeCustomers: number
  }>
  getSalesReport: (from: string, to: string) => Promise<{
    period: { from: string; to: string }
    totalSales: number; totalRevenue: number; totalCost: number
    grossProfit: number; grossMargin: number
    byPaymentMethod: Record<string, { count: number; amount: number }>
    topProducts: Array<{ productId: string; name: string; quantitySold: number; revenue: number }>
    salesCount: number; averageSaleValue: number
  }>
  getInventoryReport: () => Promise<{
    totalProducts: number; totalStockValue: number
    lowStockCount: number; outOfStockCount: number
    deadStock: Array<{ productId: string; name: string; lastMovementDate: string }>
    reorderSuggestions: Array<{ productId: string; name: string; currentStock: number; threshold: number; suggestedOrder: number }>
  }>
  getDebtReport: () => Promise<{
    totalOutstanding: number; overdueCount: number; partialCount: number
    agingBuckets: { '0-30': number; '31-60': number; '61-90': number; '90+': number }
    byCustomer: Array<{ customerId: string; name: string; outstanding: number; debtCount: number }>
  }>
  getExpenseReport: (month: string) => Promise<{
    total: number; byCategory: Record<string, number>; pendingCount: number; vsPriorMonth: number
  }>
  // Settings (Phase 19)
  updateBusinessProfile: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  updateOwnerProfile: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
  updateMpesaConfig: (data: Record<string, unknown>) => Promise<Record<string, unknown>>
}
