import type { CartItem, ShopSettings } from '../../../lib/types'

export interface ReceiptDataInput {
  cart: CartItem[]
  shopSettings: ShopSettings | null | undefined
  paymentMethod: 'cash' | 'mpesa' | 'debt' | 'card' | 'transfer'
  receiptNumber?: string
}

const formatReceiptDate = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const methodLabel = (m: 'cash' | 'mpesa' | 'debt' | 'card' | 'transfer'): string => {
  if (m === 'cash') return 'Cash'
  if (m === 'debt') return 'Debt'
  if (m === 'card') return 'Card'
  if (m === 'transfer') return 'Transfer'
  return 'M-Pesa'
}

export function buildReceiptData(input: ReceiptDataInput) {
  const { cart, shopSettings, paymentMethod, receiptNumber } = input
  const subtotal = cart.reduce((s, i) => s + i.totalPrice, 0)
  return {
    shopName: shopSettings?.name ?? 'My Shop',
    shopAddress: shopSettings?.address,
    shopPhone: shopSettings?.phone,
    receiptNumber: receiptNumber ?? `T-${Date.now()}`,
    date: formatReceiptDate(new Date()),
    items: cart.map(i => ({
      name: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.totalPrice,
      variation: i.variationName,
    })),
    subtotal,
    discount: 0,
    total: subtotal,
    paymentMethod: methodLabel(paymentMethod),
    footerMessage: shopSettings?.receiptFooter,
  }
}
