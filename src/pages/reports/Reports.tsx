import React, { useEffect, useState } from 'react'
import { AlertCircle, Banknote, BarChart3, CreditCard, Download, RefreshCw, Search, Smartphone } from 'lucide-react'
import { useSales, useTotalDebtCollected } from '../../hooks/useDatabase'
import { formatCurrency } from '../../lib/formatting-currency'
import { DateFilter, PaymentFilter, useReportsState } from './hooks/useReportsState'
import SaleDetailModal from './components/SaleDetailModal'
import ExportModal from './components/ExportModal'
import ReportsCharts from './components/ReportsCharts'

const dateFilters: { value: DateFilter; label: string }[] = [{ value: 'today', label: 'Today' }, { value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }, { value: 'all', label: 'All Time' }]
const paymentFilters: { value: PaymentFilter; label: string }[] = [{ value: 'all', label: 'All' }, { value: 'cash', label: 'Cash' }, { value: 'mpesa', label: 'M-Pesa' }, { value: 'debt', label: 'Debt' }]
const methodMeta = (method: string) => method === 'cash' ? { label: 'Cash', icon: Banknote, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' } : method === 'mpesa' || method === 'mobile_money' ? { label: 'M-Pesa', icon: Smartphone, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40' } : method === 'debt' ? { label: 'Debt', icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' } : { label: method, icon: CreditCard, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800' }

const Reports: React.FC = () => {
  const { data: allSales = [], isLoading } = useSales(500)
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState<string | null>(null)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const { filteredSales, stats } = useReportsState(allSales, dateFilter, paymentFilter, search)
  const { data: debtCollected } = useTotalDebtCollected()
  useEffect(() => { window.dispatchEvent(new CustomEvent('soostori:app:reportsDate', { detail: { value: dateFilter } })) }, [dateFilter])
  return <div className="flex h-full flex-col overflow-hidden bg-bg-primary transition-colors duration-200">
    <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-bg-secondary px-4 py-2.5 dark:border-slate-700"><div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-orange text-white"><BarChart3 size={14} /></div><div><h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">Sales Reports</h1><p className="text-[10px] text-slate-400">{stats.count} sales</p></div></div><button onClick={() => setIsExportOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-2 text-xs font-bold text-white hover:bg-orange-600"><Download size={14} />Export</button></header>
    <section className="shrink-0 border-b border-slate-100 bg-bg-secondary px-4 py-3 dark:border-slate-700">
      <ReportsCharts stats={stats} filteredSales={filteredSales} />
      <div className="mt-3 grid grid-cols-5 gap-2">
        <div className="rounded-lg bg-brand-orange/10 p-2 text-center dark:bg-brand-orange/20">
          <p className="text-[9px] font-bold uppercase text-brand-orange">Total</p>
          <p className="text-sm font-black tabular-nums text-brand-orange">{formatCurrency(stats.total)}</p>
        </div>
        {([['Cash', stats.cashTotal, 'emerald'], ['M-Pesa', stats.mpesaTotal, 'green'], ['Debt Sales', stats.debtTotal, 'amber']] as [string, number, string][]).map(([label, amount, color]) => (
          <div key={label} className={`rounded-lg bg-${color}-50 p-2 text-center dark:bg-${color}-950/40`}>
            <p className={`text-[9px] font-bold uppercase text-${color}-600 dark:text-${color}-400`}>{label}</p>
            <p className={`text-sm font-black tabular-nums text-${color}-700 dark:text-${color}-300`}>{formatCurrency(Number(amount))}</p>
          </div>
        ))}
        <div className="rounded-lg bg-violet-50 p-2 text-center dark:bg-violet-950/40">
          <p className="text-[9px] font-bold uppercase text-violet-600 dark:text-violet-400">Debt Collected</p>
          <p className="text-sm font-black tabular-nums text-violet-700 dark:text-violet-300">{formatCurrency(debtCollected?.totalCollected || 0)}</p>
        </div>
      </div>
    </section>
    <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-bg-secondary px-4 py-2 dark:border-slate-700"><div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} /><input placeholder="Search sales..." value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs font-semibold text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" /></div></div>
    <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-slate-100 bg-bg-secondary px-4 py-2 dark:border-slate-700">{dateFilters.map((filter) => <button key={filter.value} onClick={() => setDateFilter(filter.value)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-bold ${dateFilter === filter.value ? 'bg-brand-orange text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{filter.label}</button>)}</div>
    <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-slate-100 bg-bg-secondary px-4 py-2 dark:border-slate-700">{paymentFilters.map((filter) => <button key={filter.value} onClick={() => setPaymentFilter(filter.value)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-bold ${paymentFilter === filter.value ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-800' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>{filter.label}</button>)}</div>
    <div className="flex-1 overflow-y-auto">{isLoading ? <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-brand-orange" /></div> : filteredSales.length === 0 ? <div className="py-20 text-center text-sm font-bold text-slate-400">No sales found</div> : filteredSales.map((sale) => { const meta = methodMeta(sale.paymentMethod); const Icon = meta.icon; return <button key={sale.id} onClick={() => setSelectedSale(sale.id)} className="flex w-full items-center gap-3 border-b border-slate-100 bg-bg-secondary px-4 py-3 text-left dark:border-slate-700"><div className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.bg}`}><Icon size={14} className={meta.color} /></div><div className="min-w-0 flex-1"><div className="flex justify-between"><b className="text-sm text-slate-800 dark:text-slate-100">{formatCurrency(sale.totalAmount)}</b><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.bg} ${meta.color}`}>{meta.label}</span></div><p className="truncate text-[10px] text-slate-400">{sale.items_summary || 'No items'}</p></div><div className="text-right text-[10px] text-slate-400"><p>{new Date(sale.createdAt).toLocaleDateString()}</p><p>{new Date(sale.createdAt).toLocaleTimeString()}</p></div></button> })}</div>
    {selectedSale && <SaleDetailModal saleId={selectedSale} onClose={() => setSelectedSale(null)} />}{isExportOpen && <ExportModal sales={allSales} onClose={() => setIsExportOpen(false)} />}
  </div>
}
export default Reports
