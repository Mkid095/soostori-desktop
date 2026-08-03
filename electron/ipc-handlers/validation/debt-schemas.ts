import { z } from 'zod'

export const debtCreateSchema = z.object({
  customerId: z.string().optional(),
  saleId: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
})

export type DebtCreateInput = z.infer<typeof debtCreateSchema>

export const debtPaymentSchema = z.object({
  debtId: z.string().min(1, 'Debt ID is required'),
  amount: z.number().positive('Payment amount must be positive'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  reference: z.string().optional(),
})

export type DebtPaymentInput = z.infer<typeof debtPaymentSchema>
