import { contextBridge, ipcRenderer } from 'electron'

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
    listSerialPorts: () => Promise<string[]>
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

// Expose APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Database
  db: {
    // Products
    getProducts: (shopId?: string) => ipcRenderer.invoke('db:products:list', shopId),
    getProductById: (id: string) => ipcRenderer.invoke('db:products:get', id),
    getProductByBarcode: (barcode: string) => ipcRenderer.invoke('db:products:getByBarcode', barcode),
    createProduct: (product: any) => ipcRenderer.invoke('db:products:create', product),
    updateProduct: (id: string, data: any) => ipcRenderer.invoke('db:products:update', id, data),
    deleteProduct: (id: string) => ipcRenderer.invoke('db:products:delete', id),
    searchProducts: (query: string, shopId?: string) => ipcRenderer.invoke('db:products:search', query, shopId),
    lookupBarcode: (barcode: string) => ipcRenderer.invoke('db:products:lookupBarcode', barcode),

    // Categories
    getCategories: (shopId?: string) => ipcRenderer.invoke('db:categories:list', shopId),
    createCategory: (category: any) => ipcRenderer.invoke('db:categories:create', category),
    updateCategory: (id: string, data: any) => ipcRenderer.invoke('db:categories:update', id, data),
    deleteCategory: (id: string) => ipcRenderer.invoke('db:categories:delete', id),

    // Sales
    getSales: (shopId?: string, limit?: number) => ipcRenderer.invoke('db:sales:list', shopId, limit),
    getSaleById: (id: string) => ipcRenderer.invoke('db:sales:get', id),
    createSale: (sale: any) => ipcRenderer.invoke('db:sales:create', sale),
    getSalesByDateRange: (startDate: string, endDate: string, shopId?: string) =>
      ipcRenderer.invoke('db:sales:listByDateRange', startDate, endDate, shopId),

    // Held Sales
    getHeldSales: (shopId?: string) => ipcRenderer.invoke('db:held-sales:list', shopId),
    createHeldSale: (sale: any) => ipcRenderer.invoke('db:held-sales:create', sale),
    deleteHeldSale: (id: string) => ipcRenderer.invoke('db:held-sales:delete', id),
    restoreHeldSale: (id: string) => ipcRenderer.invoke('db:held-sales:restore', id),

    // Inventory
    adjustStock: (productId: string, quantityChange: number, reason: string) =>
      ipcRenderer.invoke('db:inventory:adjust', productId, quantityChange, reason),
    getStockMovements: (productId?: string, limit?: number) =>
      ipcRenderer.invoke('db:inventory:movements', productId, limit),

    // Shop Settings
    getShopSettings: () => ipcRenderer.invoke('db:shop-settings:get'),
    updateShopSettings: (settings: any) => ipcRenderer.invoke('db:shop-settings:update', settings),

    // Customers
    getCustomers: () => ipcRenderer.invoke('db:customers:list'),
    getCustomer: (id: string) => ipcRenderer.invoke('db:customers:get', id),
    createCustomer: (data: any) => ipcRenderer.invoke('db:customers:create', data),
    updateCustomer: (id: string, data: any) => ipcRenderer.invoke('db:customers:update', id, data),
    deleteCustomer: (id: string) => ipcRenderer.invoke('db:customers:delete', id),

    // Debts
    getDebts: () => ipcRenderer.invoke('db:debts:list'),
    getDebt: (id: string) => ipcRenderer.invoke('db:debts:get', id),
    createDebt: (data: any) => ipcRenderer.invoke('db:debts:create', data),
    recordDebtPayment: (debtId: string, amount: number, paymentMethod: string, reference: string) =>
      ipcRenderer.invoke('db:debts:recordPayment', debtId, amount, paymentMethod, reference),
    getDebtSummary: () => ipcRenderer.invoke('db:debts:summary'),
  },

  // Hardware
  hw: {
    onBarcodeScanned: (callback: (barcode: string) => void) => {
      const handler = (_event: any, barcode: string) => callback(barcode)
      ipcRenderer.on('hw:scanner:barcode', handler)
      return () => ipcRenderer.removeListener('hw:scanner:barcode', handler)
    },
    startSerialScanner: (port: string, baudRate: number) =>
      ipcRenderer.invoke('hw:scanner:startSerial', port, baudRate),
    stopSerialScanner: () => ipcRenderer.invoke('hw:scanner:stopSerial'),
    listSerialPorts: () => ipcRenderer.invoke('hw:listPorts'),
    autoDetectScanner: () => ipcRenderer.invoke('hw:scanner:autoDetect'),
    getAutoDetectedScannerPort: () => ipcRenderer.invoke('hw:scanner:getAutoDetected'),
    saveAutoDetectedScannerPort: (port: string) => ipcRenderer.invoke('hw:scanner:saveAutoDetected', port),
    getSavedScannerPort: () => ipcRenderer.invoke('hw:scanner:getSavedPort'),
    setScannerType: (type: 'keyboard' | 'serial') => ipcRenderer.invoke('hw:scanner:setType', type),
    getScannerType: () => ipcRenderer.invoke('hw:scanner:getType'),

    printReceipt: (data: ReceiptData) => ipcRenderer.invoke('hw:printer:print', data),
    printViaSystemDialog: (html: string) => ipcRenderer.invoke('hw:printer:printSystem', html),
    connectPrinter: (port: string, baudRate: number) =>
      ipcRenderer.invoke('hw:printer:connect', port, baudRate),
    disconnectPrinter: () => ipcRenderer.invoke('hw:printer:disconnect'),
    testPrint: () => ipcRenderer.invoke('hw:printer:test'),
  },

  // App
  app: {
    getVersion: () => ipcRenderer.invoke('app:version'),
    getPlatform: () => process.platform,
    minimize: () => ipcRenderer.send('app:window:minimize'),
    maximize: () => ipcRenderer.send('app:window:maximize'),
    close: () => ipcRenderer.send('app:window:close'),
    isMaximized: () => ipcRenderer.invoke('app:window:isMaximized'),
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      const handler = (_event: any, isMaximized: boolean) => callback(isMaximized)
      ipcRenderer.on('app:window:maximizeChange', handler)
      return () => ipcRenderer.removeListener('app:window:maximizeChange', handler)
    },
    showSaveDialog: (options: any) => ipcRenderer.invoke('app:dialog:save', options),
    showOpenDialog: (options: any) => ipcRenderer.invoke('app:dialog:open', options),
    exportDatabase: (filePath: string) => ipcRenderer.invoke('app:db:export', filePath),
    importDatabase: (filePath: string) => ipcRenderer.invoke('app:db:import', filePath),
  },
} as ElectronAPI)
