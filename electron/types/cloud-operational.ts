/**
 * Cloud operational entity types — shared across web, mobile, and desktop.
 * These represent local SQLite entities mirrored to the cloud.
 */

export interface CloudProduct {
  id: string
  shopId: string
  name: string
  barcode: string
  sku: string
  categoryId: string
  categoryName: string
  costPrice: number
  sellingPrice: number
  groupPrices: string  // JSON array
  isGroup: boolean
  unitsPerPackage: number
  stockQuantity: number
  currentStock: number
  lowStockThreshold: number
  trackInventory: number
  allowSingleUnitSale: number
  distributorName: string
  distributorPhone: string
  image: string
  isActive: number
  createdAt: string
  updatedAt: string
}

export interface CloudCategory {
  id: string
  shopId: string
  name: string
  color: string
  description?: string
  isActive: number
  createdAt: string
  updatedAt: string
}

export interface CloudSale {
  id: string
  shopId: string
  userId: string
  deviceId: string
  type: string
  status: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  paymentMethod: string
  note: string
  customerId: string
  customerName: string
  customerPhone: string
  itemsSummary: string
  createdAt: string
  updatedAt: string
}

export interface CloudCustomer {
  id: string
  shopId: string
  name: string
  phone: string
  email: string
  idNumber: string
  address: string
  notes: string
  isActive: number
  createdAt: string
  updatedAt: string
}

export interface CloudExpense {
  id: string
  shopId: string
  categoryId: string
  categoryName: string
  amount: number
  description: string
  reference: string
  date: string
  createdAt: string
  updatedAt: string
}

export interface MagicCodeResponse {
  ok: boolean
  userId?: string
  email?: string
  error?: string
}
