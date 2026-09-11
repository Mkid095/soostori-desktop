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
  useRecentSales,
  useRefundSale,
  useVoidSale,
} from './useSales'

export {
  useHeldSales,
  useCreateHeldSale,
  useDeleteHeldSale,
  useRestoreHeldSale,
} from './useHeldSales'

export {
  useAdjustStock,
  useReceiveStock,
  useTransferStock,
  useCountStock,
  useStockMovements,
  useLowStockProducts,
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
  useCustomerDebts,
} from './useDebts'

export {
  useDashboard,
  useDashboardSales,
  useDashboardStock,
  useDashboardDebt,
} from './useDashboard'
