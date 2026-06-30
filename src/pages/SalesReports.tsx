import React, { useState, useMemo } from 'react'
import {
  BarChart3, RefreshCw, Search, X, Check, Clock,
  CreditCard, Banknote, Smartphone, AlertCircle,
  ChevronDown, ChevronUp, Filter,
} from 'lucide-react'
import { useSales, useSale } from '../hooks/useDatabase'
import { formatCurrency } from '../lib/utils'

type DateFilter = 'today' | 'week' | 'month' | 'all'
type PaymentFilter = 'all' | 'cash' | 'mpesa' | 'debt'

// ========== SALE DETAIL MODAL ==========
const SaleDetailModal: React.FC<{ saleId: string; onClose: () => void }> = ({ saleId, onClose }) => {
  const { data: sale, isLoading } = useSale(saleId)

  const methodLabel = (m: string) => {
    if (m === 'cash') return { label: 'Cash', icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50' }
    if (m === 'mpesa' || m === 'mobile_money') return { label: 'M-Pesa', icon: Smartphone, color: 'text-green-600', bg: 'bg-green-50' }
    if (m === 'debt') return { label: 'Debt', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' }
    return { label: m, icon: CreditCard, color: 'text-slate-600', bg: 'bg-slate-50' }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-orange" />
        </div>
      </div>
    )
  }

  if (!sale) return null

  const m = methodLabel(sale.paymentMethod)
  const Icon = m.icon

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl max-h-[85vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-orange flex items-center justify-center text-white">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Sale Receipt</h2>
              <p className="text-xs text-slate-400">{new Date(sale.createdAt).toLocaleString()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Payment method badge */}
          <div className={`flex items-center gap-2 p-3 rounded-xl ${m.bg}`}>
            <Icon size={16} className={m.color} />
            <span className={`font-bold text-sm ${m.color}`}>{m.label}</span>
            <span className="ml-auto font-black text-lg text-slate-800">{formatCurrency(sale.totalAmount)}</span>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Items</p>
            <div className="space-y-2">
              {(sale.items || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-700 truncate">{item.productName}</p>
                    <p className="text-xs text-slate-400">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                  </div>
                  <span className="font-bold text-sm text-slate-700 ml-3">{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 p-3 bg-slate-50 rounded-xl">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold text-slate-700">{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Discount</span>
                <span className="font-semibold text-emerald-600">-{formatCurrency(sale.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
              <span className="font-bold text-slate-800">Total</span>
              <span className="font-black text-lg text-brand-orange">{formatCurrency(sale.totalAmount)}</span>
            </div>
          </div>

          {sale.note && (
            <div className="p-3 bg-amber-50 rounded-xl">
              <p className="text-xs font-bold text-amber-700 uppercase mb-1">Note</p>
              <p className="text-sm text-amber-800">{sale.note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ========== SALES REPORTS PAGE ==========
const SalesReports: React.FC = () => {
  const { data: allSales = [], isLoading } = useSales(500)
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState<string | null>(null)

  const filteredSales = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    return allSales.filter((s) => {
      // Date filter
      const saleDate = new Date(s.createdAt)
      if (dateFilter === 'today' && saleDate < today) return false
      if (dateFilter === 'week' && saleDate < new Date(today.getTime() - 7 * 86400000)) return false
      if (dateFilter === 'month' && saleDate < new Date(today.getFullYear(), today.getMonth(), 1)) return false

      // Payment filter
      if (paymentFilter === 'cash' && s.paymentMethod !== 'cash') return false
      if (paymentFilter === 'mpesa' && s.paymentMethod !== 'mpesa' && s.paymentMethod !== 'mobile_money') return false
      if (paymentFilter === 'debt' && s.paymentMethod !== 'debt') return false

      // Search
      if (search) {
        const q = search.toLowerCase()
        const matchesItems = s.items_summary?.toLowerCase().includes(q)
        const matchesId = s.id.toLowerCase().includes(q)
        if (!matchesItems && !matchesId) return false
      }

      return true
    })
  }, [allSales, dateFilter, paymentFilter, search])

  const stats = useMemo(() => {
    const total = filteredSales.reduce((s, sale) => s + sale.totalAmount, 0)
    const count = filteredSales.length
    const cashTotal = filteredSales.filter(s => s.paymentMethod === 'cash').reduce((s, sale) => s + sale.totalAmount, 0)
    const mpesaTotal = filteredSales.filter(s => s.paymentMethod === 'mpesa' || s.paymentMethod === 'mobile_money').reduce((s, sale) => s + sale.totalAmount, 0)
    const debtTotal = filteredSales.filter(s => s.paymentMethod === 'debt').reduce((s, sale) => s + sale.totalAmount, 0)
    return { total, count, cashTotal, mpesaTotal, debtTotal }
  }, [filteredSales])

  const dateFilters: { value: DateFilter; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'all', label: 'All Time' },
  ]

  const paymentFilters: { value: PaymentFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'cash', label: 'Cash' },
    { value: 'mpesa', label: 'M-Pesa' },
    { value: 'debt', label: 'Debt' },
  ]

  const methodLabel = (m: string) => {
    if (m === 'cash') return { label: 'Cash', icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50' }
    if (m === 'mpesa' || m === 'mobile_money') return { label: 'M-Pesa', icon: Smartphone, color: 'text-green-600', bg: 'bg-green-50' }
    if (m === 'debt') return { label: 'Debt', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' }
    return { label: m, icon: CreditCard, color: 'text-slate-600', bg: 'bg-slate-50' }
  }

  return (
    <div className="h-full bg-soft-yellow flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 py-2.5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-orange rounded-lg flex items-center justify-center text-white">
            <BarChart3 size={14} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-800">Sales Reports</h1>
            <p className="text-[10px] text-slate-400">{stats.count} sales</p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-brand-orange rounded-xl p-3 text-white">
            <p className="text-[10px] font-bold opacity-80 uppercase">Total Revenue</p>
            <p className="text-lg font-black mt-0.5">{formatCurrency(stats.total)}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-emerald-600 uppercase">Cash</p>
            <p className="text-lg font-black text-emerald-700 mt-0.5">{formatCurrency(stats.cashTotal)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-green-600 uppercase">M-Pesa</p>
            <p className="text-lg font-black text-green-700 mt-0.5">{formatCurrency(stats.mpesaTotal)}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-amber-600 uppercase">Debt</p>
            <p className="text-lg font-black text-amber-700 mt-0.5">{formatCurrency(stats.debtTotal)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input type="text" placeholder="Search sales..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-8 pr-3 text-xs font-semibold focus:border-brand-orange outline-none"
          />
        </div>
      </div>

      <div className="bg-white border-b border-slate-100 px-4 py-2 flex gap-1.5 shrink-0 overflow-x-auto">
        {dateFilters.map(df => (
          <button key={df.value} onClick={() => setDateFilter(df.value)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${
              dateFilter === df.value ? 'bg-brand-orange text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}>
            {df.label}
          </button>
        ))}
      </div>

      <div className="bg-white border-b border-slate-100 px-4 py-2 flex gap-1.5 shrink-0">
        {paymentFilters.map(pf => (
          <button key={pf.value} onClick={() => setPaymentFilter(pf.value)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors ${
              paymentFilter === pf.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}>
            {pf.label}
          </button>
        ))}
      </div>

      {/* Sales list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-orange" />
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <BarChart3 size={36} className="mb-2 opacity-40" />
            <p className="font-bold text-sm">No sales found</p>
            <p className="text-xs mt-0.5">Try adjusting the filters</p>
          </div>
        ) : (
          <div>
            {filteredSales.map((sale) => {
              const m = methodLabel(sale.paymentMethod)
              const Icon = m.icon
              return (
                <button
                  key={sale.id}
                  onClick={() => setSelectedSale(sale.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.bg}`}>
                    <Icon size={14} className={m.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800">{formatCurrency(sale.totalAmount)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${m.bg} ${m.color}`}>{m.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {sale.items_summary || 'No items'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-slate-400">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(sale.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Sale detail modal */}
      {selectedSale && (
        <SaleDetailModal saleId={selectedSale} onClose={() => setSelectedSale(null)} />
      )}
    </div>
  )
}

export default SalesReports
