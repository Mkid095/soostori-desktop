import type { Product } from '../../../lib/types'

export interface ProductFormState {
  name: string
  sku: string
  barcode: string
  categoryId: string
  unit: string
  distributorName: string
  distributorPhone: string
  costPrice: string
  sellingPrice: string
  stockQuantity: string
  lowStockThreshold: string
  trackInventory: boolean
  allowSingleUnitSale: boolean
  unitsPerPackage: string
  boxBuyingPrice: string
  bulkSellingPrice: string
}

export type ProductFormMode = 'loose' | 'bulk'

export function productToForm(p: Product): ProductFormState {
  return {
    name: p.name || '',
    sku: p.sku || '',
    barcode: p.barcode || '',
    categoryId: p.categoryId || '',
    unit: p.unit || 'piece',
    distributorName: p.distributorName || '',
    distributorPhone: p.distributorPhone || '',
    costPrice: p.costPrice !== undefined ? String(p.costPrice) : '0',
    sellingPrice: p.sellingPrice !== undefined ? String(p.sellingPrice) : '0',
    stockQuantity: p.stockQuantity !== undefined ? String(p.stockQuantity) : '0',
    lowStockThreshold: p.lowStockThreshold !== undefined ? String(p.lowStockThreshold) : '10',
    trackInventory: p.trackInventory ?? true,
    allowSingleUnitSale: p.allowSingleUnitSale ?? true,
    unitsPerPackage: p.unitsPerPackage !== undefined ? String(p.unitsPerPackage) : '',
    boxBuyingPrice: p.boxBuyingPrice !== undefined ? String(p.boxBuyingPrice) : '',
    bulkSellingPrice: p.bulkSellingPrice !== undefined ? String(p.bulkSellingPrice) : '',
  }
}

export function buildProductData(
  mode: ProductFormMode,
  form: ProductFormState,
  groupPrices: { quantity: number; price: number }[],
  imageUrl: string,
): Partial<Product> {
  const unitCost = mode === 'bulk' && form.boxBuyingPrice && form.unitsPerPackage
    ? parseFloat(form.boxBuyingPrice) / parseInt(form.unitsPerPackage)
    : parseFloat(form.costPrice) || 0
  const selling = mode === 'bulk' && form.bulkSellingPrice
    ? parseFloat(form.bulkSellingPrice)
    : parseFloat(form.sellingPrice) || 0

  return {
    name: form.name,
    sku: form.sku || undefined,
    barcode: form.barcode || undefined,
    categoryId: form.categoryId || undefined,
    unit: form.unit,
    distributorName: form.distributorName || undefined,
    distributorPhone: form.distributorPhone || undefined,
    costPrice: unitCost,
    sellingPrice: selling,
    stockQuantity: parseInt(form.stockQuantity) || 0,
    lowStockThreshold: parseInt(form.lowStockThreshold) || 10,
    trackInventory: form.trackInventory,
    allowSingleUnitSale: mode === 'loose' ? form.allowSingleUnitSale : false,
    unitsPerPackage: mode === 'bulk' && form.unitsPerPackage ? parseInt(form.unitsPerPackage) : undefined,
    boxBuyingPrice: mode === 'bulk' && form.boxBuyingPrice ? parseFloat(form.boxBuyingPrice) : undefined,
    bulkSellingPrice: mode === 'bulk' && form.bulkSellingPrice ? parseFloat(form.bulkSellingPrice) : undefined,
    groupPrices: groupPrices.length > 0
      ? groupPrices.map(gp => ({ name: '', price: gp.price, minQuantity: gp.quantity }))
      : undefined,
    imageUrl: imageUrl || undefined,
    barcodeGenerated: !form.barcode,
  } as Partial<Product>
}

export function isProductFormValid(mode: ProductFormMode, form: ProductFormState): boolean {
  if (!form.name) return false
  if (mode === 'loose' && form.allowSingleUnitSale && !form.sellingPrice) return false
  return true
}
