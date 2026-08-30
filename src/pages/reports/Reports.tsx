import React, { useEffect, useState } from 'react'
import { BarChart3, Download, RefreshCw, Search } from 'lucide-react'
import { useSales, useTotalDebtCollected } from '../../hooks/useDatabase'
import { useExpenseStats } from '../expenses/hooks/useExpenses'
import { useTopProducts } from '../../hooks/useSales'
import { useTranslation } from '../../lib/useTranslation'
import { DateFilter, PaymentFilter, useReportsState } from './hooks/useReportsState'
import SaleDetailModal from './components/SaleDetailModal'
import ExportModal from './components/ExportModal'
import ReportsCharts from './components/ReportsCharts'
import ReportsStatsCards from './components/ReportsStatsCards'
import ReportsSaleList from './components/ReportsSaleList'
import ReportsFilters from './components/ReportsFilters'

const PAGE_SIZE = 50
const todayIso = () => new Date().toISOString().slice(0, 10)
const monthAgoIso = () => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

function getDateRange(filter: DateFilter, customRange: { from: string; to: string }): { start: string; end: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (filter === 'today') return { start: today.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) }
  if (filter === 'week') {
    const d = new Date(today.getTime() - 7 * 86400000)
    return { start: d.toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) }
  }
  if (filter === 'month') {
    return { start: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) }
  }
  if (filter === 'custom') return { start: customRange.from, end: customRange.to }
  return { start: '1970-01-01', end: today.toISOString().slice(0, 10) }
}

const Reports: React.FC = () => {
  const { t } = useTranslation()
  const { data: allSales = [], isLoading } = useSales()
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedSale, setSelectedSale] = useState<string | null>(null)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [customRange, setCustomRange] = useState({ from: monthAgoIso(), to: todayIso() })
  const { filteredSales, stats } = useReportsState(allSales, dateFilter, paymentFilter, search, customRange)
  const { data: debtCollected } = useTotalDebtCollected()
  const { total: expenseTotal } = useExpenseStats()
  const profit = Math.max(0, (stats.total || 0) - expenseTotal)
  const { start: topStart, end: topEnd } = getDateRange(dateFilter, customRange)
  const { data: topProducts = [] } = useTopProducts(topStart, topEnd)
  const [displayedCount, setDisplayedCount] = useState(PAGE_SIZE)

  const pagedSales = filteredSales.slice(0, displayedCount)
  const hasMore = displayedCount < filteredSales.length

  useEffect(() => { setDisplayedCount(PAGE_SIZE) }, [dateFilter, paymentFilter, search])
  useEffect(() => { window.dispatchEvent(new CustomEvent('soostori:app:reportsDate', { detail: { value: dateFilter } })) }, [dateFilter])

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg-primary transition-colors duration-200">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-bg-secondary px-4 py-2.5 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-orange text-white"><BarChart3 size={14} /></div>
          <div>
            <h1 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('rep.salesReports')}</h1>
            <p className="text-[10px] text-slate-400">{stats.count} {t('rep.salesCount')}</p>
          </div>
        </div>
        <button onClick={() => setIsExportOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-2 text-xs font-bold text-white hover:bg-orange-600">
          <Download size={14} />{t('rep.export')}
        </button>
      </header>

      <section className="shrink-0 space-y-3 border-b border-slate-100 bg-bg-secondary px-4 py-3 dark:border-slate-700">
        <ReportsCharts stats={stats} filteredSales={filteredSales} topProducts={topProducts} />
        <ReportsStatsCards stats={stats} debtCollected={debtCollected?.totalCollected || 0} profit={profit} />
      </section>

      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-bg-secondary px-4 py-2 dark:border-slate-700">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input placeholder={t('rep.searchSales')} value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs font-semibold text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
        </div>
      </div>

      <ReportsFilters
        dateFilter={dateFilter} onDateFilter={setDateFilter}
        paymentFilter={paymentFilter} onPaymentFilter={setPaymentFilter}
        customRange={customRange} onCustomRange={setCustomRange}
      />

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-brand-orange" /></div>
        ) : filteredSales.length === 0 ? (
          <div className="py-20 text-center text-sm font-bold text-slate-400">{t('rep.noSales')}</div>
        ) : (
          <>
            <ReportsSaleList sales={pagedSales} onSelect={setSelectedSale} />
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
              <p className="text-xs text-slate-400">{filteredSales.length} transaction{filteredSales.length !== 1 ? 's' : ''}</p>
              {hasMore && <button onClick={() => setDisplayedCount((p) => p + PAGE_SIZE)} className="rounded-lg bg-brand-orange px-4 py-2 text-xs font-bold text-white hover:bg-orange-600">Load More</button>}
            </div>
          </>
        )}
      </div>

      {selectedSale && <SaleDetailModal saleId={selectedSale} onClose={() => setSelectedSale(null)} />}
      {isExportOpen && <ExportModal sales={allSales} onClose={() => setIsExportOpen(false)} />}
    </div>
  )
}

export default Reports
