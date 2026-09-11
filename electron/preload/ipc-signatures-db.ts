// IPC signatures — DB operations
import type {
  Shop, ShopUser, Invitation, Device, InventoryTransaction,
  DevicePairing, Sale, SyncQueueItem, InventorySnapshot,
  ExpenseRow, ExpenseInput, RecurringExpenseRow, RecurringExpenseInput
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
  getRecentSales: (limit?: number) => Promise<unknown[]>
  createSale: (sale: unknown) => Promise<unknown>
  refundSale: (input: { saleId: string; lineItems?: Array<{ productId: string; quantity: number }>; refundAmount: number; reason: string; paymentMethod: 'cash' | 'mobile_money' | 'card' }) =>
    Promise<{ id: string; status: string; refundAmount: number; isPartial: boolean; reason: string; paymentMethod: string }>
  voidSale: (saleId: string, reason: string) => Promise<{ id: string; status: string; reason: string }>
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
  receiveStock: (data: { productId: string; quantity: number; supplier?: string; notes?: string }) => Promise<unknown>
  transferStock: (data: { productId: string; fromBusinessId: string; toBusinessId: string; quantity: number }) => Promise<unknown>
  countStock: (data: { counts: Array<{ productId: string; counted: number }> }) => Promise<unknown>
  getLowStockProducts: () => Promise<unknown[]>
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
  createCustomer: (data: unknown, idempotencyKey?: string) => Promise<unknown>
  updateCustomer: (id: string, data: unknown) => Promise<unknown>
  deleteCustomer: (id: string) => Promise<void>
  searchCustomers: (query: string) => Promise<unknown[]>
  getCustomerPurchaseHistory: (customerId: string) => Promise<unknown>
  attachCustomerToSale: (saleId: string, customerId: string) => Promise<unknown>
  // Debts
  getDebts: () => Promise<unknown[]>
  getDebt: (id: string) => Promise<unknown | null>
  createDebt: (data: unknown) => Promise<unknown>
  recordDebtPayment: (debtId: string, amount: number, paymentMethod: string, reference: string) => Promise<unknown>
  getDebtSummary: () => Promise<{ total: number; count: number }>
  getTotalDebtCollected: () => Promise<{ totalCollected: number }>
  getCustomerDebts: (customerId: string) => Promise<unknown[]>
  getCustomerDebtBalance: (customerId: string) => Promise<{ customerId: string; totalOutstanding: number }>
  // Expenses
  getExpenses: () => Promise<ExpenseRow[]>
  createExpense: (data: ExpenseInput) => Promise<ExpenseRow>
  deleteExpense: (id: string) => Promise<void>
  approveExpense: (id: string) => Promise<ExpenseRow>
  markExpensePaid: (id: string) => Promise<ExpenseRow>
  getExpenseSummary: (month: string) => Promise<{ total: number; byCategory: Record<string, number>; pendingCount: number }>
  getRecurringExpenses: () => Promise<RecurringExpenseRow[]>
  createRecurringExpense: (data: RecurringExpenseInput) => Promise<RecurringExpenseRow>
  deleteRecurringExpense: (id: string) => Promise<void>
  // Shop / Auth / Team
  getShop: () => Promise<Shop | null>
  createShop: (data: { name: string; currency: string; ownerName: string; ownerPin: string }) => Promise<Shop>
  getUsers: (shopId: string) => Promise<ShopUser[]>
  getDeviceId: () => Promise<{ deviceId: string }>
  // D3: login accepts one object matching the handler's Zod loginSchema
  login: (userId: string, pin: string, deviceId: string, shopId: string) => Promise<{ user: ShopUser; sessionId: string; operationalEstablished: boolean }>
  // D4: createUser payload now includes shopId + createdBy
  createUser: (data: { name: string; pin: string; role: string; shopId: string; createdBy: string }) => Promise<ShopUser>
  updateUser: (id: string, data: { name?: string; pin?: string; role?: string }) => Promise<ShopUser>
  deleteUser: (id: string) => Promise<void>
  // D5: logout accepts one object
  logout: (sessionId: string, deviceId: string, userId: string) => Promise<{ success: boolean }>
  // Invitations
  createInvite: (data: { shopId: string; employeeName: string; role: string; createdBy: string; deviceName?: string }) => Promise<Invitation>
  // D7: accepts one object matching the handler's payload shape
  acceptInvite: (code: string, userName: string, pin: string, deviceId: string) => Promise<{ userId: string; shopId: string }>
  listInvites: () => Promise<Invitation[]>
  // Devices
  listDevices: (shopId: string) => Promise<Device[]>
  registerDevice: (data: { deviceId: string; shopId: string; deviceName?: string; employeeId?: string }) => Promise<Device>
  deviceHeartbeat: (deviceId: string) => Promise<void>
  setHostDevice: (deviceId: string, masterPin: string) => Promise<{ success: boolean }>
  requestPairing: (data: { shopId: string; deviceId: string; requestedBy: string; deviceName?: string }) => Promise<DevicePairing>
  approvePairing: (pairingId: string, approvedBy: string) => Promise<void>
  rejectPairing: (pairingId: string) => Promise<void>
  getPairings: (shopId: string) => Promise<DevicePairing[]>
  getPrimaryStatus: (shopId: string) => Promise<{
    primaryId: string | null; primaryName: string | null; electedAt: string | null
    lastHeartbeatAt: string | null; stalenessMs: number; status: 'online' | 'stale' | 'lost'; electionPending: boolean
  }>
  transferPrimaryDevice: (toDeviceId: string, shopId: string) => Promise<{ success: boolean; primaryDeviceId: string }>
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
  syncStartHost: (port?: number) => Promise<{ mode: 'host' }>
  syncStartClient: (hostUrl: string, deviceToken?: string) => Promise<{ mode: 'client' }>
  syncStop: () => Promise<{ mode: 'offline' }>
  syncGetMode: () => Promise<{ mode: 'host' | 'client' | 'offline' }>
  syncGetAuthorityStatus: () => Promise<{ status: 'online' | 'stale' | 'lost' | 'unknown' }>
  // Business Setup
  businessSetup: (input: {
    businessName: string
    businessType: 'retail' | 'wholesale' | 'supermarket' | 'restaurant' | 'salon' | 'pharmacy' | 'other'
    country: string
    currency: string
    ownerName: string
    ownerEmail?: string
    ownerPhone: string
  }) => Promise<{ businessId: string; ownerMembershipId: string; defaultCategoryId: string }>
  listBusinessesForUser: () => Promise<Array<{ id: string; name: string; currency: string; created_at: string; memberCount: number }>>
  setActiveBusiness: (businessId: string) => Promise<void>
  getActiveBusinessId: () => Promise<string | null>
  // Dashboard (Phase 12)
  getDashboard: () => Promise<{
    sales: { totalAmount: number; count: number; cashTotal: number; mpesaTotal: number; cardTotal: number; debtTotal: number }
    stock: { totalProducts: number; inStock: number; lowStock: number; outOfStock: number; trackedProducts: number }
    debt: { totalOutstanding: number; count: number; overdueCount: number; collectedToday: number }
    generatedAt: string
  }>
  getDashboardSales: () => Promise<{ totalAmount: number; count: number; cashTotal: number; mpesaTotal: number; cardTotal: number; debtTotal: number }>
  getDashboardStock: () => Promise<{ totalProducts: number; inStock: number; lowStock: number; outOfStock: number; trackedProducts: number }>
  getDashboardDebt: () => Promise<{ totalOutstanding: number; count: number; overdueCount: number; collectedToday: number }>
  // Reports (Phase 13)
  getDashboardSummary: () => Promise<{
    todaySales: number; weekSales: number; monthSales: number
    todayRevenue: number; weekRevenue: number; monthRevenue: number
    monthCost: number; grossProfit: number; grossMargin: number
    lowStockCount: number; outstandingDebts: number; pendingExpenses: number; activeCustomers: number
  }>
  getSalesReport: (from: string, to: string) => Promise<{
    period: { from: string; to: string }; totalSales: number; totalRevenue: number; totalCost: number
    grossProfit: number; grossMargin: number
    byPaymentMethod: Record<string, { count: number; amount: number }>
    topProducts: Array<{ productId: string; name: string; quantitySold: number; revenue: number }>
    salesCount: number; averageSaleValue: number
  }>
  getInventoryReport: () => Promise<{
    totalProducts: number; totalStockValue: number; lowStockCount: number; outOfStockCount: number
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
  // Team (Phase 14)
  teamInvite: (data: { email: string; role: string; invitedByEmployeeId: string }) => Promise<unknown>
  teamListInvitations: () => Promise<unknown[]>
  teamCancelInvitation: (id: string) => Promise<{ success: boolean }>
  teamListMembers: () => Promise<unknown[]>
  teamUpdateMember: (membershipId: string, data: { role?: string; permissions?: string[] }) => Promise<unknown>
  teamRemoveMember: (membershipId: string) => Promise<{ success: boolean }>
}
