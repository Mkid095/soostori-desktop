import { z } from 'zod'

export const productCreateSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  categoryId: z.string().optional(),
  costPrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0),
  discountPrice: z.number().min(0).optional(),
  unit: z.string().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  trackInventory: z.boolean().optional(),
  hasVariants: z.boolean().optional(),
  expiryDate: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  distributorName: z.string().optional(),
  distributorPhone: z.string().optional(),
  barcodeGenerated: z.boolean().optional(),
  allowSingleUnitSale: z.boolean().optional(),
  unitsPerPackage: z.number().int().positive().optional(),
  boxBuyingPrice: z.number().min(0).optional(),
  bulkSellingPrice: z.number().min(0).optional(),
  groupPrices: z.array(z.object({
    name: z.string(),
    price: z.number(),
    minQuantity: z.number().int().positive(),
  })).optional(),
})

export type ProductCreateInput = z.infer<typeof productCreateSchema>
export const productUpdateSchema = productCreateSchema.partial()
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>
