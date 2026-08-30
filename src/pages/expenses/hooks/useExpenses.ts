import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../../lib/api'

export interface ExpenseRow {
  id: string
  amount: number
  category: string
  note: string
  date: string
  created_at: string
}

export function useExpenses() {
  return useQuery<ExpenseRow[]>({
    queryKey: ['expenses'],
    queryFn: () => api.getExpenses() as Promise<ExpenseRow[]>,
  })
}

export function useExpenseStats() {
  const { data: expenses = [] } = useExpenses()
  const total = expenses.reduce((sum, e) => sum + e.amount, 0)
  const byCategory: Record<string, number> = {}
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount
  }
  return { total, byCategory }
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { amount: number; category: string; note?: string; date: string }) =>
      api.createExpense(data) as Promise<ExpenseRow>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}
