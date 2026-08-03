import { z } from 'zod'

export const customerCreateSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
  idNumber: z.string().optional(),
})

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>
export const customerUpdateSchema = customerCreateSchema.partial()
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>
