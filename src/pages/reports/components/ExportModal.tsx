import React, { useMemo, useState } from 'react'
import { Calendar, Download, FileText, X } from 'lucide-react'
import type { Sale } from '../../../lib/types'
import { formatCurrency } from '../../../lib/formatting-currency'

type ExportFormat = 'pdf' | 'csv'
type ExportPeriod = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom'

interface ExportModalProps {
  sales: Sale[]
  onClose: () => void
}

const periods: { value: ExportPeriod; label: string; color: string }[] = [
  { value: 'today', label: 'Today', color: 'text-brand-orange' },
  { value: 'week', label: 'This Week', color: 'text-blue-600 dark:text-blue-400' },
  { value: 'month', label: 'This Month', color: 'text-emerald-600 dark:text-emerald-400' },
  { value: 'year', label: 'This Year', color: 'text-purple-600 dark:text-purple-400' },
  { value: 'all', label: 'All Time', color: 'text-slate-600 dark:text-slate-300' },
  { value: 'custom', label: 'Custom Range', color: 'text-brand-orange' },
]

const dateKey = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)

const ExportModal: React.FC<ExportModalProps> = ({ sales, onClose }) => {
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [period, setPeriod] = useState<ExportPeriod>('today')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const filteredSales = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (period === 'week') start.setDate(start.getDate() - 6)
    if (period === 'month') start.setDate(1)
    if (period === 'year') start.setMonth(0, 1)
    return sales.filter((sale) => {
      const key = dateKey(sale.createdAt)
      if (!key) return false
      if (period === 'all') return true
      if (period === 'custom') return (!from || key >= from) && (!to || key <= to)
      return new Date(`${key}T00:00:00`) >= start
    })
  }, [from, period, sales, to])

  const downloadCsv = () => {
    const rows = filteredSales.map((sale) => {
      const date = new Date(sale.createdAt)
      return [date.toLocaleDateString(), date.toLocaleTimeString(), sale.items_summary ?? '', sale.subtotal, sale.discountAmount, sale.totalAmount, sale.paymentMethod, sale.note ?? ''].map(escapeCsv).join(',')
    })
    const csv = ['Date,Time,Items,Subtotal,Discount,Total,Payment,Note', ...rows].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `sales-report-${dateKey(new Date().toISOString())}.csv`
    link.click()
    URL.revokeObjectURL(url)
    onClose()
  }

  const printPdf = async () => {
    const total = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0)
    const rows = filteredSales.map((sale) => `<tr><td>${escapeHtml(new Date(sale.createdAt).toLocaleString())}</td><td>${escapeHtml(sale.items_summary ?? 'No items')}</td><td>${escapeHtml(sale.paymentMethod)}</td><td>${formatCurrency(sale.totalAmount)}</td></tr>`).join('')
    const html = `<html><head><title>Sales Report</title><style>body{font:14px Arial;color:#172033;padding:28px}h1{margin:0 0 4px;color:#ea580c}p{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:22px}th,td{text-align:left;padding:9px 6px;border-bottom:1px solid #e2e8f0}th{font-size:11px;text-transform:uppercase;color:#64748b}.total{text-align:right;font-size:18px;font-weight:bold;margin-top:18px}</style></head><body><h1>Sales Report</h1><p>${period === 'custom' ? `${from || 'Start'} to ${to || 'End'}` : periods.find((item) => item.value === period)?.label} · ${filteredSales.length} sales</p><table><thead><tr><th>Date</th><th>Items</th><th>Payment</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><div class="total">Total Revenue: ${formatCurrency(total)}</div></body></html>`
    await window.electronAPI?.hw.printViaSystemDialog(html)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/50 backdrop-blur-sm p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="export-report-title">
      <div className="w-full max-w-lg rounded-t-2xl bg-white shadow-xl dark:bg-bg-secondary sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700"><h2 id="export-report-title" className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><FileText size={18} className="text-brand-orange" />Export Report</h2><button onClick={onClose} aria-label="Close export dialog" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19} /></button></div>
        <div className="space-y-4 p-5"><div className="flex rounded-full bg-slate-100 p-1 dark:bg-slate-800">{(['pdf', 'csv'] as ExportFormat[]).map((item) => <button key={item} onClick={() => setFormat(item)} className={`flex-1 rounded-full py-2 text-xs font-bold uppercase ${format === item ? 'bg-white text-brand-orange shadow-sm dark:bg-slate-700' : 'text-slate-500 dark:text-slate-400'}`}>{item}</button>)}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{periods.map((item) => <button key={item.value} onClick={() => setPeriod(item.value)} className={`rounded-xl border p-3 text-left transition-colors ${period === item.value ? 'border-brand-orange bg-orange-50 dark:bg-orange-950/30' : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'}`}><Calendar size={17} className={item.color} /><span className="mt-2 block text-xs font-bold text-slate-700 dark:text-slate-200">{item.label}</span></button>)}</div>
          {period === 'custom' && <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold text-slate-500 dark:text-slate-400">From<input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" /></label><label className="text-xs font-bold text-slate-500 dark:text-slate-400">To<input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" /></label></div>}
          <p className="text-center text-xs text-slate-500 dark:text-slate-400">{filteredSales.length} sales in selected range</p><button onClick={() => { if (format === 'csv') downloadCsv(); else void printPdf() }} disabled={period === 'custom' && from > to && Boolean(from && to)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange py-3 text-sm font-bold text-white shadow-sm hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"><Download size={17} />Download {format.toUpperCase()}</button>
        </div>
      </div>
    </div>
  )
}

export default ExportModal
