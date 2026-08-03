// Database-related types

export interface Product {
  id: string
  categoryId?: string
  categoryName?: string
  categoryColor?: string
  categoryIcon?: string
  name: string
  sku?: string
  barcode?: string
  barcodeGenerated?: boolean
  description?: string
  imageUrl?: string
  costPrice: number
  sellingPrice: number
  discountPrice?: number
  unit: string
  stockQuantity: number
  lowStockThreshold: number
  trackInventory: boolean
  hasVariants: boolean
  parentVariantId?: string
  expiryDate?: string
  metadata?: ProductMetadata
  isActive: boolean
  createdAt: string
  updatedAt: string
  // Full product fields
  distributorName?: string
  distributorPhone?: string
  allowSingleUnitSale: boolean
  unitsPerPackage?: number
  boxBuyingPrice?: number
  bulkSellingPrice?: number
  groupPrices?: GroupPrice[]
}

export interface ProductMetadata {
  allowSingleUnitSale?: boolean
  unitsPerPackage?: number
  boxBuyingPrice?: number
  bulkSellingPrice?: number
  groupPrices?: GroupPrice[]
}

export interface GroupPrice {
  name: string
  price: number
  minQuantity: number
}

export interface Category {
  id: string
  name: string
  description?: string
  icon?: string
  color: string
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StockMovement {
  id: string
  productId: string
  productName?: string
  type: 'adjustment' | 'sale' | 'purchase' | 'return' | 'transfer'
  quantity: number
  balanceAfter: number
  reason?: string
  referenceId?: string
  createdAt: string
  createdBy?: string
}

export interface ShopSettings {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  currency: string
  receiptFooter?: string
  receiptPrefix?: string
  lowStockThreshold?: number
  mpesaSendMoneyPhone?: string
  mpesaPaybillNumber?: string
  mpesaPaybillAccount?: string
  bankPaybillNumber?: string
  bankPaybillAccount?: string
  mpesaPochiPhone?: string
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Debt {
  id: string
  customerId?: string
  customerName?: string
  customerPhone?: string
  saleId?: string
  amount: number
  amountPaid: number
  status: 'pending' | 'partial' | 'paid'
  dueDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
  payments?: DebtPayment[]
}

export interface DebtPayment {
  id: string
  debtId: string
  amount: number
  paymentMethod: string
  reference?: string
  notes?: string
  createdAt: string
}
