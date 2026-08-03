import { z } from 'zod'

const saleItemSchema = z.object({
  productId: z.string().optional(),
  variationName: z.string().optional(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).optional(),
  totalPrice: z.number().min(0).optional(),
})

export const saleCreateSchema = z.object({
  type: z.enum(['retail', 'wholesale', 'order']).optional(),
  subtotal: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  totalAmount: z.number().min(0),
  paymentMethod: z.enum(['cash', 'mpesa', 'debt']),
  paidAmount: z.number().min(0).optional(),
  note: z.string().optional(),
  status: z.enum(['pending', 'completed', 'cancelled', 'refunded']).optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerIdNumber: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
})

export type SaleCreateInput = z.infer<typeof saleCreateSchema>

export const heldSaleCreateSchema = z.object({
  name: z.string().optional(),
  cartItems: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().min(0),
    totalPrice: z.number().min(0),
    discount: z.number().min(0).optional(),
    variationName: z.string().optional(),
    isCombo: z.boolean().optional(),
    comboId: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })),
  paymentMethod: z.string().optional(),
})

export type HeldSaleCreateInput = z.infer<typeof heldSaleCreateSchema>
