import React, { useCallback, useRef, useState } from 'react'
import { FileSpreadsheet, RefreshCw, Upload, X } from 'lucide-react'
import { useTranslation } from '../../../lib/useTranslation'
import { useBulkCreateProducts, useValidateImport } from '../../../hooks/useProducts'

interface CsvRow { name: string; barcode?: string; sku?: string; category?: string; costPrice?: number; sellingPrice: number; stockQuantity?: number; lowStockThreshold?: number }
interface Props { onClose: () => void; onImported?: () => void }

const parseCsv = (text: string): CsvRow[] => {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  return lines.slice(1).map(line => {
    const v = line.split(',').map(x => x.trim())
    const r: Record<string, string> = {}
    headers.forEach((h, i) => { r[h] = v[i] || '' })
    return { name: r.name || '', barcode: r.barcode || undefined, sku: r.sku || undefined, category: r.category || undefined,
      costPrice: r.costprice ? Number(r.costprice) : undefined, sellingPrice: Number(r.sellingprice) || 0,
      stockQuantity: r.stockquantity ? Number(r.stockquantity) : undefined, lowStockThreshold: r.lowstockthreshold ? Number(r.lowstockthreshold) : undefined }
  })
}

const PreviewTable: React.FC<{ rows: CsvRow[] }> = ({ rows }) => (
  <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
    <table className="w-full text-xs">
      <thead className="bg-slate-50 dark:bg-slate-800"><tr>
        <th className="px-2 py-1.5 text-left font-semibold text-slate-600 dark:text-slate-300">Name</th>
        <th className="px-2 py-1.5 text-left font-semibold text-slate-600 dark:text-slate-300">Barcode</th>
        <th className="px-2 py-1.5 text-right font-semibold text-slate-600 dark:text-slate-300">Cost</th>
        <th className="px-2 py-1.5 text-right font-semibold text-slate-600 dark:text-slate-300">Price</th>
        <th className="px-2 py-1.5 text-right font-semibold text-slate-600 dark:text-slate-300">Stock</th>
      </tr></thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
        {rows.slice(0, 5).map((r, i) => (
          <tr key={i} className="bg-white dark:bg-slate-800">
            <td className="px-2 py-1.5 text-slate-700 dark:text-slate-200">{r.name}</td>
            <td className="px-2 py-1.5 text-slate-500">{r.barcode || '—'}</td>
            <td className="px-2 py-1.5 text-right text-slate-500">{r.costPrice ?? '—'}</td>
            <td className="px-2 py-1.5 text-right text-slate-700 dark:text-slate-200">{r.sellingPrice}</td>
            <td className="px-2 py-1.5 text-right text-slate-500">{r.stockQuantity ?? 0}</td>
          </tr>
        ))}
      </tbody>
    </table>
    {rows.length > 5 && <p className="text-xs text-slate-400 px-2 py-1 bg-slate-50 dark:bg-slate-800">+{rows.length - 5} more</p>}
  </div>
)

const ImportProductsModal: React.FC<Props> = ({ onClose, onImported }) => {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<CsvRow[]>([])
  const [err, setErr] = useState('')
  const validation = useValidateImport(rows)
  const bulkCreate = useBulkCreateProducts()

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setErr('')
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) { setErr('Please select a .csv file'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const parsed = parseCsv(ev.target?.result as string)
      if (!parsed.length) { setErr('No valid products found in CSV'); return }
      setRows(parsed)
    }
    reader.readAsText(file)
  }, [])

  const handleConfirm = async () => {
    if (!validation.data) return
    try { await bulkCreate.mutateAsync(validation.data.new); onImported?.(); onClose() } catch { /* handled in mutation */ }
  }

  const result = validation.data
  const canConfirm = result && (result.new.length > 0 || result.updates.length > 0) && !bulkCreate.isPending

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/50 backdrop-blur-sm p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-t-2xl bg-white shadow-xl dark:bg-bg-secondary sm:rounded-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700 shrink-0">
          <h2 className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100"><FileSpreadsheet size={18} className="text-brand-orange" />{t('set.importProducts')}</h2>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          {!rows.length && (
            <button onClick={() => fileRef.current?.click()} className="w-full py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center gap-2 text-slate-500 hover:border-brand-orange hover:text-brand-orange transition-colors">
              <Upload size={28} /><span className="text-sm font-bold">{t('set.selectCsvFile')}</span>
              <span className="text-xs">name,barcode,sku,category,costPrice,sellingPrice,stockQuantity,lowStockThreshold</span>
            </button>
          )}
          {err && <p className="text-sm text-red-500">{err}</p>}
          {rows.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">{rows.length} products parsed from CSV</p>
              {validation.isFetching && <div className="flex items-center gap-2 text-sm text-slate-500"><RefreshCw size={14} className="animate-spin" />Checking duplicates...</div>}
              {result && (
                <div className="space-y-3">
                  {result.new.length > 0 && <div className="space-y-1"><div className="flex items-center gap-2"><span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">New ({result.new.length})</span></div><PreviewTable rows={result.new} /></div>}
                  {result.updates.length > 0 && <div className="space-y-1"><div className="flex items-center gap-2"><span className="text-sm font-bold text-blue-600 dark:text-blue-400">Update ({result.updates.length})</span></div><PreviewTable rows={result.updates} /></div>}
                  {result.duplicates.length > 0 && <div className="space-y-1"><div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-400">Skipped ({result.duplicates.length})</span></div><PreviewTable rows={result.duplicates} /></div>}
                  {!result.new.length && !result.updates.length && <p className="text-sm text-slate-500 text-center">{t('set.noProductsToImport')}</p>}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-slate-100 px-5 py-4 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:border-slate-300 transition-colors">{t('set.cancel')}</button>
          <button onClick={handleConfirm} disabled={!canConfirm} className="flex-1 py-3 rounded-xl bg-brand-orange text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {bulkCreate.isPending && <RefreshCw size={15} className="animate-spin" />}
            {t('set.confirmImport')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ImportProductsModal
