import { z } from 'zod'

export const shopSettingsSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  currency: z.string().optional(),
  receiptFooter: z.string().optional(),
  receiptPrefix: z.string().optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  mpesaSendMoneyPhone: z.string().optional(),
  mpesaPaybillNumber: z.string().optional(),
  mpesaPaybillAccount: z.string().optional(),
  bankPaybillNumber: z.string().optional(),
  bankPaybillAccount: z.string().optional(),
  mpesaPochiPhone: z.string().optional(),
  mpesaTillNumber: z.string().optional(),
})

export type ShopSettingsInput = z.infer<typeof shopSettingsSchema>

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantityChange: z.number().int(),
  reason: z.string().min(1, 'Reason is required'),
})

export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
