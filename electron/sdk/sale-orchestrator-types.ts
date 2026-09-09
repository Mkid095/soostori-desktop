/**
 * Sale orchestrator types — argument shapes for commitSale and authorizeSale.
 */

import type { PaymentMethod } from '@soostori/desktop-adapter'

export interface CommitSaleArgs {
  saleId: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    discount?: number
    totalPrice: number
    variationName?: string
  }>
  paymentMethod: PaymentMethod
  paidAmount: number
  discountAmount?: number
  taxAmount?: number
  note?: string
  customerId?: string
  customerName?: string
  customerIdNumber?: string
  userId: string
  deviceId: string
}

export interface AuthorizeSaleArgs {
  saleId: string
  items: Array<{ productId: string; quantity: number }>
  paymentMethod: PaymentMethod
  paidAmount: number
  customerId?: string
  customerName?: string
  note?: string
  deviceId: string
  userId: string
}
