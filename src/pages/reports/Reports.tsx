import React, { useEffect, useState } from 'react'
import { BarChart3, Calendar, Download, RefreshCw, Search } from 'lucide-react'
import { useSales, useTotalDebtCollected } from '../../hooks/useDatabase'
import { useTranslation } from '../../lib/useTranslation'
import { DateFilter, PaymentFilter, useReportsState } from './hooks/useReportsState'
import SaleDetailModal from './components/SaleDetailModal'
import ExportModal from './components/ExportModal'
import ReportsCharts from './components/ReportsCharts'
import ReportsStatsCards from './components/ReportsStatsCards'
import ReportsSaleList from './components/ReportsSaleList'

const PAGE_SIZE = 50
const todayIso = () => new Date().toISOString().slice(0, 10)
const monthAgoIso = () => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

const CustomRangeBar: React.FC<{ from: string; to: string; fromLabel: string; toLabel: string; onChange: (next: { from: string; to: string }) => void }> = ({ from, to, fromLabel, toLabel, onChange }) => (
  <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-bg-secondary px-4 py-2 dark:border-slate-700">
    <Calendar size={14} className="text-brand-orange" />
    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
      {fromLabel}
      <input type="date" value={from} max={to || undefined} onChange={(event) => onChange({ from: event.target.value, to })} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
    </label>
    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
      {toLabel}
      <input type="date" value={to} min={from || undefined} onChange={(event) => onChange({ from, to: event.target.value })} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
    </label>
  </div>
)

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
  const [displayedCount, setDisplayedCount] = useState(PAGE_SIZE)

  const dateFilters: { value: DateFilter; label: string }[] = [
    { value: 'today', label: t('rep.today') },
    { value: 'week', label: t('rep.thisWeek') },
    { value: 'month', label: t('rep.thisMonth') },
    { value: 'all', label: t('rep.allTime') },
    { value: 'custom', label: t('rep.customRange') },
  ]
  const paymentFilters: { value: PaymentFilter; label: string }[] = [
    { value: 'all', label: t('label.name') === 'Name' ? 'All' : t('label.name') /* fallback */ },
    { value: 'cash', label: t('rep.cash') },
    { value: 'mpesa', label: t('pos.mpesa') },
    { value: 'debt', label: t('rep.debt') },
  ]
  paymentFilters[0].label = t('deb.all')

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
        <ReportsCharts stats={stats} filteredSales={filteredSales} />
        <ReportsStatsCards stats={stats} debtCollected={debtCollected?.totalCollected || 0} />
      </section>

      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-bg-secondary px-4 py-2 dark:border-slate-700">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input placeholder={t('rep.searchSales')} value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs font-semibold text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-slate-100 bg-bg-secondary px-4 py-2 dark:border-slate-700">
        {dateFilters.map((filter) => (
          <button key={filter.value} onClick={() => setDateFilter(filter.value)} className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${dateFilter === filter.value ? 'bg-brand-orange text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}>
            {filter.value === 'custom' && <Calendar size={11} />}
            {filter.label}
          </button>
        ))}
      </div>

      {dateFilter === 'custom' && <CustomRangeBar from={customRange.from} to={customRange.to} fromLabel={t('label.date')} toLabel={t('label.date')} onChange={setCustomRange} />}

      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-slate-100 bg-bg-secondary px-4 py-2 dark:border-slate-700">
        {paymentFilters.map((filter) => (
          <button key={filter.value} onClick={() => setPaymentFilter(filter.value)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${paymentFilter === filter.value ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}>
            {filter.label}
          </button>
        ))}
      </div>

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
              {hasMore && <button onClick={() => setDisplayedCount((prev) => prev + PAGE_SIZE)} className="rounded-lg bg-brand-orange px-4 py-2 text-xs font-bold text-white hover:bg-orange-600">Load More</button>}
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