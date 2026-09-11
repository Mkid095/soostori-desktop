/**
 * useCustomers.ts — React Query hooks for Phase 10 customer operations.
 *
 * - Create / edit / delete / search customers
 * - Attach customer to a sale
 * - Customer purchase history
 * - All operations are offline-first (SQLite via IPC)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Customer } from '../lib/types'

interface CustomerDbRow {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  id_number: string | null
  is_active: number | null
  idempotency_key: string | null
  version: number
  created_at: string
  updated_at: string
}

function mapCustomer(row: CustomerDbRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    address: row.address ?? undefined,
    notes: row.notes ?? undefined,
    idNumber: row.id_number ?? undefined,
    isActive: !!row.is_active,
    idempotencyKey: row.idempotency_key ?? undefined,
    version: row.version ?? 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useCustomers() {
  return useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const rows = await api.getCustomers() as CustomerDbRow[]
      return rows.map(mapCustomer)
    },
  })
}

export function useCustomer(id: string | null) {
  return useQuery<Customer | null>({
    queryKey: ['customers', id],
    queryFn: async () => {
      if (!id) return null
      const row = await api.getCustomer(id) as CustomerDbRow | null
      return row ? mapCustomer(row) : null
    },
    enabled: !!id,
  })
}

export function useSearchCustomers(query: string) {
  return useQuery<Customer[]>({
    queryKey: ['customers', 'search', query],
    queryFn: async () => {
      const rows = await api.searchCustomers(query) as CustomerDbRow[]
      return rows.map(mapCustomer)
    },
  })
}

interface PurchaseHistoryResult {
  sales: Array<{
    id: string
    total_amount: number
    payment_method: string
    created_at: string
    items_summary: string | null
    status: string
  }>
  summary: { total: number; count: number }
}

export function useCustomerPurchaseHistory(customerId: string | null) {
  return useQuery<PurchaseHistoryResult | null>({
    queryKey: ['customers', 'history', customerId],
    queryFn: async () => {
      if (!customerId) return null
      return await api.getCustomerPurchaseHistory(customerId) as PurchaseHistoryResult
    },
    enabled: !!customerId,
  })
}

// ── Mutations ───────────────────────────────────────────────────────────────

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<Customer> & { idempotencyKey?: string }) =>
      api.createCustomer(data, data.idempotencyKey),
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

export function useAttachCustomerToSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ saleId, customerId }: { saleId: string; customerId: string }) =>
      api.attachCustomerToSale(saleId, customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
