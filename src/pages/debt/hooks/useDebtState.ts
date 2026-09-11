import { useMemo, useCallback } from 'react'
import type { Customer, Debt } from '../../../lib/types'

type DebtPaymentInput = { debtId: string; amount: number; paymentMethod: string; reference?: string }
type CustomerInput = { name: string; phone?: string; idNumber?: string; email?: string; address?: string; notes?: string }
type DebtCreateInput = { customerId?: string; amount: number; saleId?: string; dueDate?: string; notes?: string }

export function useDebtState(
  debts: Debt[],
  customers: Customer[],
  search: string,
  statusFilter: 'all' | 'pending' | 'partial' | 'paid',
  recordPayment: { mutateAsync: (data: DebtPaymentInput) => Promise<unknown> },
  createCustomer: { mutateAsync: (data: CustomerInput) => Promise<unknown> },
  createDebt: { mutateAsync: (data: DebtCreateInput) => Promise<unknown> },
) {
  // Sort debts: overdue first, then by due date (soonest first), then newest first.
  // Overdue = has a dueDate that is in the past AND status is not 'paid'.
  const sortedDebts = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    return [...debts].sort((a, b) => {
      const aOutstanding = a.amount - (a.amountPaid || 0)
      const bOutstanding = b.amount - (b.amountPaid || 0)
      const aPaid = a.status === 'paid'
      const bPaid = b.status === 'paid'

      // Settled debts go to the bottom
      if (aPaid !== bPaid) return aPaid ? 1 : -1

      // Compute overdue status
      const aDue = a.dueDate ? new Date(a.dueDate) : null
      const bDue = b.dueDate ? new Date(b.dueDate) : null
      const aOverdue = aDue && !aPaid && aDue < now
      const bOverdue = bDue && !bPaid && bDue < now

      // Overdue debts bubble up
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1

      // Among non-overdue (or no due date): sort by due date ascending (soonest first)
      if (aDue && bDue) return aDue.getTime() - bDue.getTime()
      if (aDue) return -1  // debts with due dates before those without
      if (bDue) return 1

      // Finally sort by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [debts])

  const filteredDebts = useMemo(() => {
    return sortedDebts.filter(d => {
      const mS = !search ||
        (d.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.customerPhone || '').includes(search)
      const mF = statusFilter === 'all' || d.status === statusFilter
      return mS && mF
    })
  }, [sortedDebts, search, statusFilter])

  const filteredCustomers = useMemo(() => {
    if (!search) return customers
    return customers.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search)
    )
  }, [customers, search])

  const pending = debts.filter(d => d.status !== 'paid')

  const handlePayDebt = useCallback(async (payingDebt: Debt, amount: number, method: string) => {
    await recordPayment.mutateAsync({ debtId: payingDebt.id, amount, paymentMethod: method })
  }, [recordPayment])

  const handleSaveCustomer = useCallback(async (data: CustomerInput) => {
    await createCustomer.mutateAsync(data)
  }, [createCustomer])

  const handleRecordDebt = useCallback(async (customerId: string, amount: string) => {
    await createDebt.mutateAsync({ customerId, amount: parseFloat(amount), notes: '' })
  }, [createDebt])

  return {
    filteredDebts,
    filteredCustomers,
    pending,
    handlePayDebt,
    handleSaveCustomer,
    handleRecordDebt,
  }
}
