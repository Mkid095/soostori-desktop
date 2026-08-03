import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Debt } from '../lib/types'

interface DebtDbRow {
  id: string
  customer_id: string | null
  customer_name: string | null
  customer_phone: string | null
  sale_id: string | null
  amount: number | null
  amount_paid: number | null
  status: string | null
  due_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

function mapDebt(row: DebtDbRow): Debt {
  return {
    id: row.id,
    customerId: row.customer_id ?? undefined,
    customerName: row.customer_name ?? undefined,
    customerPhone: row.customer_phone ?? undefined,
    saleId: row.sale_id ?? undefined,
    amount: row.amount ?? 0,
    amountPaid: row.amount_paid ?? 0,
    status: (row.status || 'pending') as Debt['status'],
    dueDate: row.due_date ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function useDebts() {
  return useQuery<Debt[]>({
    queryKey: ['debts'],
    queryFn: async () => {
      const rows = await api.getDebts() as DebtDbRow[]
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
    mutationFn: (data: {
      customerId?: string
      amount: number
      saleId?: string
      dueDate?: string
      notes?: string
    }) => api.createDebt(data),
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
      debtId: string
      amount: number
      paymentMethod: string
      reference?: string
    }) => api.recordDebtPayment(debtId, amount, paymentMethod, reference || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      queryClient.invalidateQueries({ queryKey: ['debtSummary'] })
    },
  })
}
