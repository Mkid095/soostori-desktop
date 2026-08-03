import React from 'react'
import { CreditCard, Banknote, Smartphone, AlertCircle, RefreshCw } from 'lucide-react'
import { useSale, useShopSettings } from '../../../hooks/useDatabase'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'
import ReceiptHeader from './ReceiptHeader'

interface ReceiptData {
  shopName: string
  shopAddress?: string
  shopPhone?: string
  receiptNumber: string
  date: string
  items: { name: string; quantity: number; unitPrice: number; total: number; variation?: string }[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  footerMessage?: string
}

const SaleDetailModal: React.FC<{ saleId: string; onClose: () => void }> = ({ saleId, onClose }) => {
  const { t } = useTranslation()
  const { data: sale, isLoading } = useSale(saleId)
  const { data: shopSettings } = useShopSettings()
  const cashLabel = t('rep.cash')
  const mpesaLabel = t('pos.mpesa')
  const debtLabel = t('rep.debt')

  const methodMeta = (m: string) => {
    if (m === 'cash') return { label: cashLabel, icon: Banknote, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' }
    if (m === 'mpesa' || m === 'mobile_money') return { label: mpesaLabel, icon: Smartphone, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40' }
    if (m === 'debt') return { label: debtLabel, icon: AlertCircle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' }
    return { label: m, icon: CreditCard, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800' }
  }

  const handlePrint = () => {
    if (!sale) return
    const receiptData: ReceiptData = {
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
    }
    window.electronAPI?.hw.printReceipt(receiptData)
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-bg-secondary w-full max-w-md rounded-2xl shadow-xl p-8 flex items-center justify-center transition-colors duration-200">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-orange" />
        </div>
      </div>
    )
  }

  if (!sale) return null

  const m = methodMeta(sale.paymentMethod)
  const Icon = m.icon

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-bg-secondary w-full max-w-md rounded-2xl shadow-xl max-h-[85vh] flex flex-col animate-scale-in transition-colors duration-200">
        <ReceiptHeader
          date={new Date(sale.createdAt).toLocaleString()}
          title={t('rep.saleReceipt')}
          printTitle={t('pos.printReceipt')}
          onPrint={handlePrint}
          onClose={onClose}
        />

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className={`flex items-center gap-2 p-3 rounded-xl ${m.bg}`}>
            <Icon size={16} className={m.color} />
            <span className={`font-bold text-sm ${m.color}`}>{m.label}</span>
            <span className="ml-auto font-black text-lg text-slate-800 dark:text-slate-100">{formatCurrency(sale.totalAmount)}</span>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">{t('rep.items')}</p>
            <div className="space-y-2">
              {(sale.items || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-700 dark:text-slate-200 truncate">{item.productName}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                  </div>
                  <span className="font-bold text-sm text-slate-700 dark:text-slate-200 ml-3">{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl transition-colors duration-200">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{t('label.subtotal')}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t('label.discount')}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">-{formatCurrency(sale.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
              <span className="font-bold text-slate-800 dark:text-slate-100">{t('label.total')}</span>
              <span className="font-black text-lg text-brand-orange">{formatCurrency(sale.totalAmount)}</span>
            </div>
          </div>

          {sale.note && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl transition-colors duration-200">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase mb-1">{t('deb.note')}</p>
              <p className="text-sm italic text-amber-800 dark:text-amber-200">{sale.note}</p>
            </div>)}
          {sale.customerIdNumber && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl transition-colors duration-200">
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1">Customer ID</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{sale.customerIdNumber}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SaleDetailModal
