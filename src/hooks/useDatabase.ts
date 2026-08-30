// Re-export all hooks from domain-specific files for backward compatibility
export {
  useProducts,
  useProduct,
  useProductByBarcode,
  useSearchProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from './useProducts'

export {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from './useCategories'

export {
  useSales,
  useSale,
  useCreateSale,
  useTopProducts,
} from './useSales'

export {
  useHeldSales,
  useCreateHeldSale,
  useDeleteHeldSale,
  useRestoreHeldSale,
} from './useHeldSales'

export {
  useAdjustStock,
  useStockMovements,
} from './useInventory'

export {
  useShopSettings,
  useUpdateShopSettings,
} from './useSettings'

export {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from './useCustomers'

export {
  useDebts,
  useDebtSummary,
  useTotalDebtCollected,
  useCreateDebt,
  useRecordDebtPayment,
} from './useDebts'
