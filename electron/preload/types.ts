// Types for exposed API
export interface ElectronAPI {
  // Database operations
  db: {
    // Products
    getProducts: (shopId?: string) => Promise<any[]>
    getProductById: (id: string) => Promise<any | null>
    getProductByBarcode: (barcode: string) => Promise<any | null>
    createProduct: (product: any) => Promise<any>
    updateProduct: (id: string, data: any) => Promise<any>
    deleteProduct: (id: string) => Promise<void>
    searchProducts: (query: string, shopId?: string) => Promise<any[]>
    lookupBarcode: (barcode: string) => Promise<any | null>

    // Categories
    getCategories: (shopId?: string) => Promise<any[]>
    createCategory: (category: any) => Promise<any>
    updateCategory: (id: string, data: any) => Promise<any>
    deleteCategory: (id: string) => Promise<void>

    // Sales
    getSales: (shopId?: string, limit?: number) => Promise<any[]>
    getSaleById: (id: string) => Promise<any | null>
    createSale: (sale: any) => Promise<any>
    getSalesByDateRange: (startDate: string, endDate: string, shopId?: string) => Promise<any[]>

    // Cart / Held Sales
    getHeldSales: (shopId?: string) => Promise<any[]>
    createHeldSale: (sale: any) => Promise<any>
    deleteHeldSale: (id: string) => Promise<void>
    restoreHeldSale: (id: string) => Promise<any>

    // Inventory / Stock
    adjustStock: (productId: string, quantityChange: number, reason: string) => Promise<any>
    getStockMovements: (productId?: string, limit?: number) => Promise<any[]>

    // Shop Settings
    getShopSettings: () => Promise<any | null>
    updateShopSettings: (settings: any) => Promise<any>

    // App Settings
    getAppSettingsDefaults: () => Promise<{ defaultTheme: 'light' | 'dark'; defaultLanguage: 'en' | 'sw'; pinSet: number; lastLogin: string | null }>
    setDefaultTheme: (theme: 'light' | 'dark') => Promise<{ default_theme: string }>
    setDefaultLanguage: (language: 'en' | 'sw') => Promise<{ default_language: string }>
    setPin: (pin: string) => Promise<{ success: boolean }>
    verifyPin: (pin: string) => Promise<{ valid: boolean }>
    recordLogin: () => Promise<void>

    // Customers
    getCustomers: () => Promise<any[]>
    getCustomer: (id: string) => Promise<any | null>
    createCustomer: (data: any) => Promise<any>
    updateCustomer: (id: string, data: any) => Promise<any>
    deleteCustomer: (id: string) => Promise<void>

    // Debts
    getDebts: () => Promise<any[]>
    getDebt: (id: string) => Promise<any | null>
    createDebt: (data: any) => Promise<any>
    recordDebtPayment: (debtId: string, amount: number, paymentMethod: string, reference: string) => Promise<any>
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
    showSaveDialog: (options: any) => Promise<string | null>
    showOpenDialog: (options: any) => Promise<string[] | null>
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
