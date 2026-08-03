import { z } from 'zod'

export const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>
export const categoryUpdateSchema = categoryCreateSchema.partial()
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>
