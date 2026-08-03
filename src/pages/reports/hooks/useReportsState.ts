import { useMemo } from 'react'
import type { Sale } from '../../../lib/types'

export type DateFilter = 'today' | 'week' | 'month' | 'all'
export type PaymentFilter = 'all' | 'cash' | 'mpesa' | 'debt'

export interface ReportsStats {
  total: number
  count: number
  cashTotal: number
  mpesaTotal: number
  debtTotal: number
}

export function useReportsState(allSales: Sale[], dateFilter: DateFilter, paymentFilter: PaymentFilter, search: string) {
  const filteredSales = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    return allSales.filter((s) => {
      const saleDate = new Date(s.createdAt)
      if (dateFilter === 'today' && saleDate < today) return false
      if (dateFilter === 'week' && saleDate < new Date(today.getTime() - 7 * 86400000)) return false
      if (dateFilter === 'month' && saleDate < new Date(today.getFullYear(), today.getMonth(), 1)) return false

      if (paymentFilter === 'cash' && s.paymentMethod !== 'cash') return false
      if (paymentFilter === 'mpesa' && s.paymentMethod !== 'mpesa' && s.paymentMethod !== 'mobile_money') return false
      if (paymentFilter === 'debt' && s.paymentMethod !== 'debt') return false

      if (search) {
        const q = search.toLowerCase()
        const matchesItems = s.items_summary?.toLowerCase().includes(q)
        const matchesId = s.id.toLowerCase().includes(q)
        if (!matchesItems && !matchesId) return false
      }

      return true
    })
  }, [allSales, dateFilter, paymentFilter, search])

  const stats = useMemo<ReportsStats>(() => {
    const total = filteredSales.reduce((s, sale) => s + sale.totalAmount, 0)
    const count = filteredSales.length
    const cashTotal = filteredSales.filter(s => s.paymentMethod === 'cash').reduce((s, sale) => s + sale.totalAmount, 0)
    const mpesaTotal = filteredSales.filter(s => s.paymentMethod === 'mpesa' || s.paymentMethod === 'mobile_money').reduce((s, sale) => s + sale.totalAmount, 0)
    const debtTotal = filteredSales.filter(s => s.paymentMethod === 'debt').reduce((s, sale) => s + sale.totalAmount, 0)
    return { total, count, cashTotal, mpesaTotal, debtTotal }
  }, [filteredSales])

  return { filteredSales, stats }
}
