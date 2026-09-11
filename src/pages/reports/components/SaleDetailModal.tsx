import React, { useState } from 'react'
import { CreditCard, Banknote, Smartphone, AlertCircle, RefreshCw, Undo2, RotateCcw } from 'lucide-react'
import { useSale, useShopSettings } from '../../../hooks/useDatabase'
import { useRefundSale } from '../../../hooks/useSales'
import { useToast } from '../../../hooks/useToast'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'
import ReceiptHeader from './ReceiptHeader'
import SaleItemsList from './SaleItemsList'
import SaleTotals from './SaleTotals'

const methodMeta = (m: string) => {
  const configs = {
    cash:    { label: 'Cash',      icon: Banknote,    color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
    mpesa:  { label: 'M-Pesa',    icon: Smartphone,  color: 'text-green-600 dark:text-green-400',   bg: 'bg-green-50 dark:bg-green-950/40' },
    mobile_money: { label: 'M-Pesa', icon: Smartphone, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40' },
    debt:   { label: 'Debt',      icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  }
  return configs[m as keyof typeof configs] ?? { label: m, icon: CreditCard, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800' }
}

const RefundConfirmDialog: React.FC<{
  saleId: string
  amount: number
  paymentMethod: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}> = ({ amount, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-80 p-5">
        <div className="flex items-center gap-2 mb-4">
          <RotateCcw size={18} className="text-purple-500" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Refund Sale</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">Enter the reason for this refund. Stock will be restored.</p>
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Defective product"
          className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs mb-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-brand-orange"
          autoFocus
        />
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
            className="flex-1 py-2 rounded-lg bg-purple-500 text-white text-xs font-bold disabled:opacity-40"
          >Refund {formatCurrency(amount)}</button>
        </div>
      </div>
    </div>
  )
}

const SaleDetailModal: React.FC<{ saleId: string; onClose: () => void }> = ({ saleId, onClose }) => {
  const { t } = useTranslation()
  const { data: sale, isLoading, refetch } = useSale(saleId)
  const { data: shopSettings } = useShopSettings()
  const refundSale = useRefundSale()
  const { showToast } = useToast()
  const [showRefundConfirm, setShowRefundConfirm] = useState(false)

  const handlePrint = () => {
    if (!sale) return
    window.electronAPI?.hw.printReceipt({
      shopName: shopSettings?.name || 'My Shop',
      shopAddress: shopSettings?.address || '',
      shopPhone: shopSettings?.phone || '',
      receiptNumber: sale.id.slice(0, 8).toUpperCase(),
      date: new Date(sale.createdAt).toLocaleString(),
      items: (sale.items || []).map(item => ({
        name: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.totalPrice,
        variation: item.variationName,
      })),
      subtotal: sale.subtotal,
      discount: sale.discountAmount,
      total: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
    })
  }

  const handleRefundConfirm = async (reason: string) => {
    if (!sale) return
    try {
      await refundSale.mutateAsync({
        saleId: sale.id,
        refundAmount: sale.totalAmount,
        reason,
        paymentMethod: sale.paymentMethod === 'card' ? 'card'
          : sale.paymentMethod === 'mobile_money' ? 'mobile_money' : 'cash',
      })
      showToast('Refund processed', 'success')
      setShowRefundConfirm(false)
      refetch()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Refund failed', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-bg-secondary w-full max-w-md rounded-2xl shadow-xl p-8 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-orange" />
        </div>
      </div>
    )
  }

  if (!sale) return null

  const m = methodMeta(sale.paymentMethod)
  const Icon = m.icon
  const isRefunded = sale.status === 'refunded'
  const isRefundable = sale.status === 'completed'

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-bg-secondary w-full max-w-md rounded-2xl shadow-xl max-h-[85vh] flex flex-col animate-scale-in">
          <ReceiptHeader
            date={new Date(sale.createdAt).toLocaleString()}
            title={t('rep.saleReceipt')}
            printTitle={t('pos.printReceipt')}
            onPrint={handlePrint}
            onClose={onClose}
          />

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Payment method + total */}
            <div className={`flex items-center gap-2 p-3 rounded-xl ${m.bg}`}>
              <Icon size={16} className={m.color} />
              <span className={`font-bold text-sm ${m.color}`}>{m.label}</span>
              <span className="ml-auto font-black text-lg text-slate-800 dark:text-slate-100">
                {formatCurrency(sale.totalAmount)}
              </span>
            </div>

            {/* Line items */}
            {sale.items && sale.items.length > 0 && <SaleItemsList items={sale.items} />}

            {/* Totals */}
            <SaleTotals subtotal={sale.subtotal} discountAmount={sale.discountAmount} totalAmount={sale.totalAmount} />

            {/* Note */}
            {sale.note && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase mb-1">{t('deb.note')}</p>
                <p className="text-sm italic text-amber-800 dark:text-amber-200">{sale.note}</p>
              </div>
            )}

            {/* Customer ID */}
            {sale.customerIdNumber && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Customer ID</p>
                <p className="text-sm text-slate-700 dark:text-slate-200">{sale.customerIdNumber}</p>
              </div>
            )}

            {/* Refunded badge */}
            {isRefunded && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm font-bold text-red-700 dark:text-red-300">
                <Undo2 size={16} className="shrink-0" />
                This sale was refunded
              </div>
            )}
          </div>

          {/* Refund action */}
          {isRefundable && (
            <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 p-4">
              <button
                onClick={() => setShowRefundConfirm(true)}
                disabled={refundSale.isPending}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
              >
                {refundSale.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Undo2 size={14} />}
                {refundSale.isPending ? 'Processing...' : 'Refund Sale'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showRefundConfirm && (
        <RefundConfirmDialog
          saleId={sale.id}
          amount={sale.totalAmount}
          paymentMethod={sale.paymentMethod}
          onConfirm={handleRefundConfirm}
          onCancel={() => setShowRefundConfirm(false)}
        />
      )}
    </>
  )
}

export default SaleDetailModal
