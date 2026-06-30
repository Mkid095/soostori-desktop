// Types mirroring soostori's data models but adapted for desktop SQLite

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

export interface Sale {
  id: string
  type: 'retail' | 'wholesale' | 'order'
  status: 'pending' | 'completed' | 'cancelled' | 'refunded'
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  paymentMethod: 'cash' | 'card' | 'transfer' | 'mobile_money'
  note?: string
  createdAt: string
  updatedAt: string
  items?: SaleItem[]
}

export interface SaleItem {
  id: string
  saleId: string
  productId?: string
  variationName?: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  totalPrice: number
}

export interface HeldSale {
  id: string
  name?: string
  cartItems: CartItem[]
  paymentMethod: string
  createdAt: string
}

export interface CartItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  discount: number
  variationName?: string
  isCombo?: boolean
  comboId?: string
  metadata?: any
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

export interface OfferCombo {
  id: string
  name: string
  type: 'combo' | 'deal' | 'bundle' | 'discount'
  discountType?: 'percentage' | 'fixed'
  discountValue?: number
  applicableProducts: string[]
  isActive: boolean
  barcode?: string
  createdAt: string
  updatedAt: string
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

// Hardware settings stored in electron-store
export interface HardwareSettings {
  scanner: {
    type: 'keyboard' | 'serial'
    serialPort?: string
    baudRate: number
  }
  printer: {
    type: 'escpos' | 'system'
    serialPort?: string
    baudRate: number
  }
}

// API result wrapper
export interface ApiResult<T> {
  data?: T
  error?: string
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
