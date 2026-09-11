/**
 * RecentSalesPanel.tsx — Last 10 completed sales sidebar panel for POS.
 * Shows sale summary, status badge, reprint receipt, void, and refund actions.
 */

import React, { useState } from 'react'
import { Clock, XCircle, RotateCcw, Printer, ChevronRight, AlertTriangle } from 'lucide-react'
import { useRecentSales, useVoidSale, useRefundSale } from '../../../hooks/useDatabase'
import { useShopSettings } from '../../../hooks/useDatabase'
import { useToast } from '../../../hooks/useToast'
import type { Sale } from '../../../lib/types'

interface Props {
  onClose: () => void
  onReprint: (sale: Sale) => void
}

const statusColor = (status: string) => {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  if (status === 'refunded') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  if (status === 'cancelled') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
}

const methodLabel = (m?: string) => {
  if (m === 'cash') return 'Cash'
  if (m === 'mobile_money') return 'M-Pesa'
  if (m === 'card') return 'Card'
  if (m === 'transfer') return 'Transfer'
  if (m === 'debt') return 'Debt'
  return m ?? '—'
}

const fmt = (cents: number) =>
  `KES ${(cents / 100).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

const VoidDialog: React.FC<{
  sale: Sale
  onConfirm: (reason: string) => void
  onCancel: () => void
}> = ({ sale, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-80 p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} className="text-red-500" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Void Sale</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">Enter the reason for voiding this sale. Stock will be restored.</p>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Wrong item scanned"
          className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs mb-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-orange"
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
            className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-bold disabled:opacity-40"
          >Void Sale</button>
        </div>
      </div>
    </div>
  )
}

const RefundDialog: React.FC<{
  sale: Sale
  onConfirm: (reason: string, paymentMethod: 'cash' | 'mobile_money' | 'card') => void
  onCancel: () => void
}> = ({ sale, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('')
  const [method, setMethod] = useState<'cash' | 'mobile_money' | 'card'>('cash')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-80 p-5">
        <div className="flex items-center gap-2 mb-4">
          <RotateCcw size={18} className="text-purple-500" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Refund Sale</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">Full refund of {fmt(sale.totalAmount)}. Enter reason and select refund method.</p>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Defective product"
          className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs mb-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-orange"
          autoFocus
        />
        <div className="flex gap-1.5 mb-4">
          {(['cash', 'mobile_money', 'card'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-colors ${method === m ? 'border-brand-orange bg-brand-orange/10 text-brand-orange' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}
            >
              {methodLabel(m)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim(), method)}
            disabled={!reason.trim()}
            className="flex-1 py-2 rounded-lg bg-purple-500 text-white text-xs font-bold disabled:opacity-40"
          >Refund</button>
        </div>
      </div>
    </div>
  )
}

const SaleRow: React.FC<{
  sale: Sale
  onReprint: (sale: Sale) => void
  onVoid: (sale: Sale) => void
  onRefund: (sale: Sale) => void
}> = ({ sale, onReprint, onVoid, onRefund }) => (
  <div className="flex items-center justify-between py-2.5 px-3 border-b border-slate-100 dark:border-slate-800 last:border-0 group hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{timeAgo(sale.createdAt)}</span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${statusColor(sale.status)}`}>{sale.status}</span>
      </div>
      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{fmt(sale.totalAmount)}</div>
      <div className="text-[10px] text-slate-400 dark:text-slate-500">{methodLabel(sale.paymentMethod)}</div>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={() => onReprint(sale)} title="Reprint receipt" className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
        <Printer size={12} />
      </button>
      {sale.status === 'completed' && (
        <>
          <button onClick={() => onVoid(sale)} title="Void" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400">
            <XCircle size={12} />
          </button>
          <button onClick={() => onRefund(sale)} title="Refund" className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-400">
            <RotateCcw size={12} />
          </button>
        </>
      )}
    </div>
  </div>
)

const RecentSalesPanel: React.FC<Props> = ({ onClose, onReprint }) => {
  const { data: sales = [], isLoading } = useRecentSales(10)
  const { data: shopSettings } = useShopSettings()
  const voidSale = useVoidSale()
  const refundSale = useRefundSale()
  const { showToast } = useToast()
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null)
  const [refundTarget, setRefundTarget] = useState<Sale | null>(null)

  const handleVoidConfirm = async (reason: string) => {
    if (!voidTarget) return
    try {
      await voidSale.mutateAsync({ saleId: voidTarget.id, reason })
      showToast('Sale voided', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Void failed', 'error')
    } finally {
      setVoidTarget(null)
    }
  }

  const handleRefundConfirm = async (reason: string, paymentMethod: 'cash' | 'mobile_money' | 'card') => {
    if (!refundTarget) return
    try {
      await refundSale.mutateAsync({
        saleId: refundTarget.id,
        refundAmount: refundTarget.totalAmount,
        reason,
        paymentMethod,
      })
      showToast('Refund processed', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Refund failed', 'error')
    } finally {
      setRefundTarget(null)
    }
  }

  const handleReprint = (sale: Sale) => {
    if (!window.electronAPI?.hw?.printReceipt) {
      showToast('Printer not connected', 'warning')
      return
    }
    const items = sale.items?.map(it => ({
      name: it.productName,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      total: it.totalPrice,
      variation: it.variationName,
    })) ?? []
    const receiptData = {
      shopName: shopSettings?.name ?? 'My Shop',
      shopAddress: shopSettings?.address,
      shopPhone: shopSettings?.phone,
      receiptNumber: sale.id,
      date: new Date(sale.createdAt).toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' }),
      items,
      subtotal: sale.subtotal,
      discount: sale.discountAmount,
      total: sale.totalAmount,
      paymentMethod: methodLabel(sale.paymentMethod),
      footerMessage: shopSettings?.receiptFooter,
    }
    window.electronAPI.hw.printReceipt(receiptData).catch(() => showToast('Print failed', 'error'))
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-40 w-72 bg-white dark:bg-slate-900 shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-brand-orange" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent Sales</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-4 h-4 border-2 border-brand-orange border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-24 text-slate-400">
              <Clock size={20} className="mb-1 opacity-30" />
              <p className="text-xs">No sales yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sales.map(sale => (
                <SaleRow
                  key={sale.id}
                  sale={sale}
                  onReprint={handleReprint}
                  onVoid={setVoidTarget}
                  onRefund={setRefundTarget}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {voidTarget && (
        <VoidDialog
          sale={voidTarget}
          onConfirm={handleVoidConfirm}
          onCancel={() => setVoidTarget(null)}
        />
      )}
      {refundTarget && (
        <RefundDialog
          sale={refundTarget}
          onConfirm={handleRefundConfirm}
          onCancel={() => setRefundTarget(null)}
        />
      )}
    </>
  )
}

export default RecentSalesPanel
