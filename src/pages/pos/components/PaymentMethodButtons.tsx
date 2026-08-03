import React from 'react'
import { Banknote, CreditCard, Wifi, Phone } from 'lucide-react'
import type { PaymentMethod } from '../hooks/useCheckout'

interface PaymentMethodButtonsProps {
  paymentMethods: { v: PaymentMethod; label: string }[]
  method: PaymentMethod
  onMethodChange: (m: PaymentMethod) => void
}

const ICONS: Record<string, React.ElementType> = { Banknote, Clock: CreditCard, Wifi, CreditCard, Phone }

const PaymentMethodButtons: React.FC<PaymentMethodButtonsProps> = ({ paymentMethods, method, onMethodChange }) => (
  <div className="grid grid-cols-2 gap-3">
    {paymentMethods.map(({ v, label }) => {
      const Icon = ICONS[label] || CreditCard
      const isMpesa = ['sendMoney', 'mpesaPaybill', 'bankPaybill', 'pochi'].includes(v)
      const colors = method === v
        ? isMpesa ? 'bg-green-50 dark:bg-green-950/40 border-green-500 text-green-700 dark:text-green-300'
          : v === 'cash' ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300'
          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-700 dark:text-amber-300'
        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
      return (
        <button key={v} onClick={() => onMethodChange(v)}
          className={`min-h-[56px] rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.96] ${colors}`}>
          <Icon size={20} />{label}
        </button>
      )
    })}
  </div>
)

export default PaymentMethodButtons
