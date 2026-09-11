import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { api } from '../../../lib/api'

export interface ExpenseRow {
  id: string
  amount: number
  category: string
  note: string
  date: string
  status: 'pending' | 'approved' | 'paid'
  paid_at: string | null
  created_at: string
}

export function useExpenses(month?: string) {
  return useQuery<ExpenseRow[]>({
    queryKey: ['expenses', month],
    queryFn: () => api.getExpenses() as Promise<ExpenseRow[]>,
  })
}

export function useExpenseSummary(month: string) {
  return useQuery({
    queryKey: ['expenseSummary', month],
    queryFn: () => api.getExpenseSummary(month) as Promise<{ total: number; byCategory: Record<string, number>; pendingCount: number }>,
    enabled: !!month,
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { amount: number; category?: string; note?: string; date: string; vendor?: string }) =>
      api.createExpense(data) as Promise<ExpenseRow>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenseSummary'] })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenseSummary'] })
    },
  })
}

export function useApproveExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.approveExpense(id) as Promise<ExpenseRow>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenseSummary'] })
    },
  })
}

export function useExpenseStats() {
  const { data: expenses = [] } = useExpenses()
  return useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + e.amount, 0)
    const byCategory: Record<string, number> = {}
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount
    }
    return { total, byCategory, pendingCount: 0 }
  }, [expenses])
}

export function useMarkExpensePaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.markExpensePaid(id) as Promise<ExpenseRow>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['expenseSummary'] })
    },
  })
}

export interface RecurringExpenseRow {
  id: string; shop_id: string; category: string; amount: number
  frequency: 'daily' | 'weekly' | 'monthly'
  next_due_date: string; is_active: number; created_at: string
}

export function useRecurringExpenses() {
  return useQuery<RecurringExpenseRow[]>({
    queryKey: ['recurringExpenses'],
    queryFn: () => api.getRecurringExpenses() as Promise<RecurringExpenseRow[]>,
  })
}

export function useCreateRecurringExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { amount: number; category?: string; frequency: string; nextDueDate: string }) =>
      api.createRecurringExpense(data) as Promise<RecurringExpenseRow>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringExpenses'] })
    },
  })
}

export function useDeleteRecurringExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteRecurringExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringExpenses'] })
    },
  })
}
