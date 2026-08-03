import React, { useState } from 'react'
import { X } from 'lucide-react'
import type { Product } from '../../../lib/types'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useTranslation } from '../../../lib/useTranslation'
import type { TranslationKey } from '../../../lib/i18n'

interface PriceSelectionDialogProps {
  product: Product
  onSelect: (unitPrice: number, quantity: number) => void
  onCancel: () => void
}

const PriceOptionButton: React.FC<{
  label: string
  price: number
  selected: boolean
  onClick: () => void
}> = ({ label, price, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
      selected
        ? 'border-brand-orange bg-orange-50 dark:bg-orange-950/40 shadow-sm'
        : 'border-border-color dark:border-slate-600 bg-bg-card dark:bg-slate-800 hover:border-orange-300 dark:hover:border-orange-700'
    }`}
  >
    <span className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
      selected ? 'border-brand-orange' : 'border-slate-300 dark:border-slate-500'
    }`}>
      {selected && <span className="w-2 h-2 rounded-full bg-brand-orange" />}
    </span>
    <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-100">{label}</span>
    <span className="text-sm font-black text-brand-orange">{formatCurrency(price)}</span>
  </button>
)

const PriceSelectionDialog: React.FC<PriceSelectionDialogProps> = ({ product, onSelect, onCancel }) => {
  const { t } = useTranslation()
  const [selectedPrice, setSelectedPrice] = useState<number>(product.sellingPrice)

  const handleConfirm = () => onSelect(selectedPrice, 1)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-bg-card dark:bg-slate-900 rounded-2xl shadow-xl border border-border-color dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-color dark:border-slate-700">
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-100">{t('pos.selectPrice' as TranslationKey)}</h2>
          <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-3">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 truncate">{product.name}</p>
        </div>

        <div className="px-5 pb-4 space-y-2.5">
          <PriceOptionButton
            label={t('pos.sellIndividually' as TranslationKey)}
            price={product.sellingPrice}
            selected={selectedPrice === product.sellingPrice}
            onClick={() => setSelectedPrice(product.sellingPrice)}
          />
          {product.groupPrices?.map((gp, idx) => (
            <PriceOptionButton
              key={idx}
              label={`Buy ${gp.minQuantity} for ${formatCurrency(gp.price)}`}
              price={gp.price}
              selected={selectedPrice === gp.price}
              onClick={() => setSelectedPrice(gp.price)}
            />
          ))}
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-border-color dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            {t('action.cancel' as TranslationKey)}
          </button>
          <button onClick={handleConfirm}
            className="flex-1 py-3 rounded-xl bg-brand-orange text-white text-sm font-bold hover:bg-orange-600 shadow-md shadow-orange-200/60 dark:shadow-orange-900/40 transition-colors">
            {t('action.confirm' as TranslationKey)}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PriceSelectionDialog
