import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { ShopSettings } from '../lib/types'

interface ShopSettingsDbRow {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  currency: string | null
  receipt_footer: string | null
  receipt_prefix: string | null
  low_stock_threshold: number | null
  mpesa_send_money_phone: string | null
  mpesa_paybill_number: string | null
  mpesa_paybill_account: string | null
  bank_paybill_number: string | null
  bank_paybill_account: string | null
  mpesa_pochi_phone: string | null
  created_at: string
  updated_at: string
}

function mapShopSettings(row: ShopSettingsDbRow): ShopSettings {
  return {
    id: row.id,
    name: row.name,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    currency: row.currency ?? 'KES',
    receiptFooter: row.receipt_footer ?? undefined,
    receiptPrefix: row.receipt_prefix ?? undefined,
    lowStockThreshold: row.low_stock_threshold ?? 5,
    mpesaSendMoneyPhone: row.mpesa_send_money_phone ?? undefined,
    mpesaPaybillNumber: row.mpesa_paybill_number ?? undefined,
    mpesaPaybillAccount: row.mpesa_paybill_account ?? undefined,
    bankPaybillNumber: row.bank_paybill_number ?? undefined,
    bankPaybillAccount: row.bank_paybill_account ?? undefined,
    mpesaPochiPhone: row.mpesa_pochi_phone ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function useShopSettings() {
  return useQuery<ShopSettings | null>({
    queryKey: ['shopSettings'],
    queryFn: async () => {
      const row = await api.getShopSettings() as ShopSettingsDbRow | null
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
