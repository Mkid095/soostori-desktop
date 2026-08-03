import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI, ReceiptData, UpdateStatusData } from './types'

export function exposeElectronAPI(): void {
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
      getSales: (shopId?: string, limit?: number, offset?: number) => ipcRenderer.invoke('db:sales:list', shopId, limit, offset),
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
      getTotalDebtCollected: () => ipcRenderer.invoke('db:debts:totalCollected'),
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
      writeFile: (filePath: string, content: string) => ipcRenderer.invoke('app:file:write', filePath, content),
    },

    // Auto-updater
    updater: {
      check: () => ipcRenderer.invoke('updater:check'),
      download: () => ipcRenderer.invoke('updater:download'),
      install: () => ipcRenderer.send('updater:install'),
      status: () => ipcRenderer.invoke('updater:status'),
      onStatus: (callback: (data: UpdateStatusData) => void) => {
        const handler = (_event: any, data: UpdateStatusData) => callback(data)
        ipcRenderer.on('updater:status', handler)
        return () => ipcRenderer.removeListener('updater:status', handler)
      },
    },
  } as ElectronAPI)
}
