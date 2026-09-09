import { z } from 'zod'

export const loginSchema = z.object({
  shopId: z.string().min(1),
  userId: z.string().min(1),
  pin: z.string().min(4).max(8),
  deviceId: z.string().min(1),
})

export const createUserSchema = z.object({
  shopId: z.string().min(1),
  name: z.string().min(1).max(100),
  pin: z.string().min(4).max(8),
  role: z.enum(['admin', 'cashier', 'manager']),
  createdBy: z.string().min(1),
})

export const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  pin: z.string().min(4).max(8).optional(),
  role: z.enum(['admin', 'cashier', 'manager']).optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
