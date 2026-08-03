// POS-related types

export interface Sale {
  id: string
  type: 'retail' | 'wholesale' | 'order'
  status: 'pending' | 'completed' | 'cancelled' | 'refunded'
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  paymentMethod: 'cash' | 'card' | 'transfer' | 'mobile_money' | 'mpesa' | 'debt'
  note?: string
  customerIdNumber?: string
  createdAt: string
  updatedAt: string
  items?: SaleItem[]
  items_summary?: string
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
  totalPrice: number
  discount: number
  variationName?: string
  isCombo?: boolean
  comboId?: string
  metadata?: Record<string, unknown>
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
