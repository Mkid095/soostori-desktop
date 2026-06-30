import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Product, Category, Sale, HeldSale, StockMovement, ShopSettings, CartItem, Customer, Debt } from '../lib/types'

// ========== SNAKE_CASE → CAMELCASE MAPPERS ==========

function mapProduct(row: any): Product {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryColor: row.category_color,
    categoryIcon: row.category_icon,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    barcodeGenerated: !!row.barcode_generated,
    description: row.description,
    imageUrl: row.image_url,
    costPrice: row.cost_price ?? 0,
    sellingPrice: row.selling_price ?? 0,
    discountPrice: row.discount_price,
    unit: row.unit || 'piece',
    stockQuantity: row.stock_quantity ?? 0,
    lowStockThreshold: row.low_stock_threshold ?? 5,
    trackInventory: !!row.track_inventory,
    hasVariants: !!row.has_variants,
    parentVariantId: row.parent_variant_id,
    expiryDate: row.expiry_date,
    metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    distributorName: row.distributor_name,
    distributorPhone: row.distributor_phone,
    allowSingleUnitSale: row.allow_single_unit_sale !== 0,
    unitsPerPackage: row.units_per_package,
    boxBuyingPrice: row.box_buying_price,
    bulkSellingPrice: row.bulk_selling_price,
    groupPrices: row.group_prices ? (typeof row.group_prices === 'string' ? JSON.parse(row.group_prices) : row.group_prices) : undefined,
  }
}

function mapCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    icon: row.icon,
    color: row.color || '#6366f1',
    displayOrder: row.display_order ?? 0,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapSale(row: any): Sale {
  return {
    id: row.id,
    type: row.type || 'retail',
    status: row.status || 'completed',
    subtotal: row.subtotal ?? 0,
    discountAmount: row.discount_amount ?? 0,
    taxAmount: row.tax_amount ?? 0,
    totalAmount: row.total_amount ?? 0,
    paidAmount: row.paid_amount ?? 0,
    paymentMethod: row.payment_method || 'cash',
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    isActive: !!row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapDebt(row: any): Debt {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    saleId: row.sale_id,
    amount: row.amount ?? 0,
    amountPaid: row.amount_paid ?? 0,
    status: row.status || 'pending',
    dueDate: row.due_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapStockMovement(row: any): StockMovement {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    type: row.type,
    quantity: row.quantity ?? 0,
    balanceAfter: row.balance_after ?? 0,
    reason: row.reason,
    referenceId: row.reference_id,
    createdAt: row.created_at,
    createdBy: row.created_by,
  }
}

function mapShopSettings(row: any): ShopSettings {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    email: row.email,
    currency: row.currency || 'KES',
    receiptFooter: row.receipt_footer,
    receiptPrefix: row.receipt_prefix,
    lowStockThreshold: row.low_stock_threshold ?? 5,
    mpesaSendMoneyPhone: row.mpesa_send_money_phone,
    mpesaPaybillNumber: row.mpesa_paybill_number,
    mpesaPaybillAccount: row.mpesa_paybill_account,
    bankPaybillNumber: row.bank_paybill_number,
    bankPaybillAccount: row.bank_paybill_account,
    mpesaPochiPhone: row.mpesa_pochi_phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ========== PRODUCTS ==========

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const rows = await api.getProducts() as any[]
      return rows.map(mapProduct)
    },
  })
}

export function useProduct(id: string) {
  return useQuery<Product | null>({
    queryKey: ['product', id],
    queryFn: async () => {
      const row = await api.getProductById(id) as any
      return row ? mapProduct(row) : null
    },
    enabled: !!id,
  })
}

export function useProductByBarcode(barcode: string) {
  return useQuery<Product | null>({
    queryKey: ['product', 'barcode', barcode],
    queryFn: async () => {
      const row = await api.getProductByBarcode(barcode) as any
      return row ? mapProduct(row) : null
    },
    enabled: !!barcode,
  })
}

export function useSearchProducts(query: string) {
  return useQuery<Product[]>({
    queryKey: ['products', 'search', query],
    queryFn: async () => {
      const rows = await api.searchProducts(query) as any[]
      return rows.map(mapProduct)
    },
    enabled: query.length > 0,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (product: Partial<Product>) => api.createProduct(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      api.updateProduct(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product', id] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// ========== CATEGORIES ==========

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const rows = await api.getCategories() as any[]
      return rows.map(mapCategory)
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (category: Partial<Category>) => api.createCategory(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      api.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

// ========== SALES ==========

export function useSales(limit: number = 100) {
  return useQuery<Sale[]>({
    queryKey: ['sales', limit],
    queryFn: async () => {
      const rows = await api.getSales(undefined, limit) as any[]
      return rows.map(mapSale)
    },
  })
}

export function useSale(id: string) {
  return useQuery<Sale | null>({
    queryKey: ['sale', id],
    queryFn: async () => {
      const row = await api.getSaleById(id) as any
      return row ? mapSale(row) : null
    },
    enabled: !!id,
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sale: {
      items: any[]
      subtotal: number
      discountAmount: number
      totalAmount: number
      paymentMethod: string
      note?: string
    }) => api.createSale(sale),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// ========== HELD SALES ==========

export function useHeldSales() {
  return useQuery<HeldSale[]>({
    queryKey: ['heldSales'],
    queryFn: async () => {
      const rows = await api.getHeldSales() as any[]
      return rows.map((row: any): HeldSale => ({
        id: row.id,
        name: row.name,
        cartItems: typeof row.cart_items === 'string' ? JSON.parse(row.cart_items) : (row.cart_items || []),
        paymentMethod: row.payment_method || 'cash',
        createdAt: row.created_at,
      }))
    },
  })
}

export function useCreateHeldSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sale: { name?: string; cartItems: CartItem[]; paymentMethod: string }) =>
      api.createHeldSale(sale),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heldSales'] })
    },
  })
}

export function useDeleteHeldSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteHeldSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heldSales'] })
    },
  })
}

export function useRestoreHeldSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.restoreHeldSale(id) as Promise<HeldSale | null>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heldSales'] })
    },
  })
}

// ========== INVENTORY ==========

export function useAdjustStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      productId,
      quantityChange,
      reason,
    }: {
      productId: string
      quantityChange: number
      reason: string
    }) => api.adjustStock(productId, quantityChange, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] })
    },
  })
}

export function useStockMovements(productId?: string, limit: number = 100) {
  return useQuery<StockMovement[]>({
    queryKey: ['stockMovements', productId, limit],
    queryFn: async () => {
      const rows = await api.getStockMovements(productId, limit) as any[]
      return rows.map(mapStockMovement)
    },
  })
}

// ========== SHOP SETTINGS ==========

export function useShopSettings() {
  return useQuery<ShopSettings | null>({
    queryKey: ['shopSettings'],
    queryFn: async () => {
      const row = await api.getShopSettings() as any
      return row ? mapShopSettings(row) : null
    },
  })
}

export function useUpdateShopSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (settings: Partial<ShopSettings>) => api.updateShopSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopSettings'] })
    },
  })
}

// ========== CUSTOMERS ==========

export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const rows = await api.getCustomers() as any[]
      return rows.map(mapCustomer)
    },
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Customer>) => api.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Customer> }) =>
      api.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

// ========== DEBTS ==========

export function useDebts() {
  return useQuery<Debt[]>({
    queryKey: ['debts'],
    queryFn: async () => {
      const rows = await api.getDebts() as any[]
      return rows.map(mapDebt)
    },
  })
}

export function useDebtSummary() {
  return useQuery<{ total: number; count: number }>({
    queryKey: ['debtSummary'],
    queryFn: () => api.getDebtSummary() as Promise<{ total: number; count: number }>,
  })
}

export function useCreateDebt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { customerId?: string; amount: number; saleId?: string; dueDate?: string; notes?: string }) =>
      api.createDebt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['debtSummary'] })
    },
  })
}

export function useRecordDebtPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ debtId, amount, paymentMethod, reference }: {
      debtId: string; amount: number; paymentMethod: string; reference?: string
    }) => api.recordDebtPayment(debtId, amount, paymentMethod, reference || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['debtSummary'] })
    },
  })
}
