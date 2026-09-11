import { z } from 'zod'

export const receiveStockSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  supplier: z.string().optional(),
  notes: z.string().optional(),
})

export const transferStockSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  fromBusinessId: z.string().min(1, 'Source business is required'),
  toBusinessId: z.string().min(1, 'Destination business is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
})

export const countStockSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  countedQuantity: z.number().int().min(0, 'Counted quantity cannot be negative'),
})

export const countBatchSchema = z.object({
  counts: z.array(z.object({
    productId: z.string(),
    counted: z.number().int().min(0),
  })).min(1, 'At least one count is required'),
})

export type ReceiveStockInput = z.infer<typeof receiveStockSchema>
export type TransferStockInput = z.infer<typeof transferStockSchema>
export type CountStockInput = z.infer<typeof countStockSchema>
