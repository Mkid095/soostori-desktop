import { useMemo, useCallback } from 'react'
import type { Customer, Debt } from '../../../lib/types'

export function useDebtState(
  debts: Debt[],
  customers: Customer[],
  search: string,
  statusFilter: 'all' | 'pending' | 'partial' | 'paid',
  recordPayment: { mutateAsync: (data: any) => Promise<any> },
  createCustomer: { mutateAsync: (data: any) => Promise<any> },
  createDebt: { mutateAsync: (data: any) => Promise<any> },
) {
  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      const mS = !search ||
        (d.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.customerPhone || '').includes(search)
      const mF = statusFilter === 'all' || d.status === statusFilter
      return mS && mF
    })
  }, [debts, search, statusFilter])

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

  const handleSaveCustomer = useCallback(async (data: { name: string; phone?: string }) => {
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
