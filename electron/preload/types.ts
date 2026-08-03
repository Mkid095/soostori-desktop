// Types for exposed API
export interface ElectronAPI {
  // Database operations
  db: {
    // Products
    getProducts: (shopId?: string) => Promise<unknown[]>
    getProductById: (id: string) => Promise<unknown | null>
    getProductByBarcode: (barcode: string) => Promise<unknown | null>
    createProduct: (product: unknown) => Promise<unknown>
    updateProduct: (id: string, data: unknown) => Promise<unknown>
    deleteProduct: (id: string) => Promise<void>
    searchProducts: (query: string, shopId?: string) => Promise<unknown[]>
    lookupBarcode: (barcode: string) => Promise<unknown | null>

    // Categories
    getCategories: (shopId?: string) => Promise<unknown[]>
    createCategory: (category: unknown) => Promise<unknown>
    updateCategory: (id: string, data: unknown) => Promise<unknown>
    deleteCategory: (id: string) => Promise<void>

    // Sales
    getSales: (shopId?: string, limit?: number) => Promise<unknown[]>
    getSaleById: (id: string) => Promise<unknown | null>
    createSale: (sale: unknown) => Promise<unknown>
    getSalesByDateRange: (startDate: string, endDate: string, shopId?: string) => Promise<unknown[]>

    // Cart / Held Sales
    getHeldSales: (shopId?: string) => Promise<unknown[]>
    createHeldSale: (sale: unknown) => Promise<unknown>
    deleteHeldSale: (id: string) => Promise<void>
    restoreHeldSale: (id: string) => Promise<unknown>

    // Inventory / Stock
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
  }

  // Hardware operations
  hw: {
    // Scanner
    onBarcodeScanned: (callback: (barcode: string) => void) => () => void
    startSerialScanner: (port: string, baudRate: number) => Promise<void>
    stopSerialScanner: () => Promise<void>
    listSerialPorts: () => Promise<string[]>
    autoDetectScanner: () => Promise<{ port: string; baudRate: number } | null>
    getAutoDetectedScannerPort: () => Promise<string | null>
    saveAutoDetectedScannerPort: (port: string) => Promise<void>
    getSavedScannerPort: () => Promise<string | null>
    setScannerType: (type: 'keyboard' | 'serial') => Promise<void>
    getScannerType: () => Promise<'keyboard' | 'serial'>

    // Printer
    printReceipt: (data: ReceiptData) => Promise<void>
    printViaSystemDialog: (html: string) => Promise<void>
    connectPrinter: (port: string, baudRate: number) => Promise<void>
    disconnectPrinter: () => Promise<void>
    testPrint: () => Promise<void>
  }

  // App operations
  app: {
    getVersion: () => Promise<string>
    getPlatform: () => string
    minimize: () => void
    maximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
    showSaveDialog: (options: unknown) => Promise<string | null>
    showOpenDialog: (options: unknown) => Promise<string[] | null>
    exportDatabase: (filePath: string) => Promise<void>
    importDatabase: (filePath: string) => Promise<void>
    writeFile: (filePath: string, content: string) => Promise<void>
  }

  // Auto-updater operations
  updater: {
    check: () => Promise<{ status: string; version?: string; message?: string }>
    download: () => Promise<{ status: string; message?: string }>
    install: () => void
    status: () => Promise<{ status: string; version?: string }>
    onStatus: (callback: (data: UpdateStatusData) => void) => () => void
  }
}

export interface ReceiptData {
  shopName: string
  shopAddress?: string
  shopPhone?: string
  receiptNumber: string
  date: string
  items: ReceiptItem[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  cashierName?: string
  footerMessage?: string
}

export interface ReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  total: number
  variation?: string
}

export interface UpdateStatusData {
  status: string
  version?: string
  message?: string
  releaseNotes?: string
  percent?: number
  bytesPerSecond?: number
  transferred?: number
  total?: number
}
