import React from 'react'
import { CheckSquare, CheckCircle } from 'lucide-react'
import type { ShopSettings } from '../../../lib/types'
import { formatCurrency } from '../../../lib/formatting-currency'
import type { PaymentMethod } from '../hooks/useCheckout'

interface MpesaPaymentViewProps {
  method: PaymentMethod
  shopSettings?: ShopSettings | null
  total: number
  mpesaConfirmed: boolean
  setMpesaConfirmed: (v: boolean) => void
}

const MpesaPaymentView: React.FC<MpesaPaymentViewProps> = ({
  method, shopSettings, total, mpesaConfirmed, setMpesaConfirmed,
}) => {
  const label =
    method === 'sendMoney' ? 'Send Money to' :
    method === 'mpesaPaybill' ? 'M-Pesa Paybill' :
    method === 'bankPaybill' ? 'Bank Paybill' : 'Pochi La Biashara'

  return (
    <div className="space-y-4 p-5 bg-green-50 dark:bg-green-950/40 rounded-2xl border border-green-100 dark:border-green-900/50 transition-colors duration-200">
      <p className="text-sm font-bold text-green-700 dark:text-green-400 text-center">{label}</p>

      {method === 'sendMoney' && shopSettings?.mpesaSendMoneyPhone && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center border border-green-200 dark:border-green-800 transition-colors duration-200">
          <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Phone Number</p>
          <p className="text-2xl font-black text-green-800 dark:text-green-300">{shopSettings.mpesaSendMoneyPhone}</p>
        </div>
      )}

      {method === 'mpesaPaybill' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center border border-green-200 dark:border-green-800 transition-colors duration-200">
          <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Paybill Number</p>
          <p className="text-2xl font-black text-green-800 dark:text-green-300">{shopSettings?.mpesaPaybillNumber}</p>
          {shopSettings?.mpesaPaybillAccount && (
            <>
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1 mt-2">Account</p>
              <p className="text-xl font-black text-green-800 dark:text-green-300">{shopSettings.mpesaPaybillAccount}</p>
            </>
          )}
        </div>
      )}

      {method === 'bankPaybill' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center border border-green-200 dark:border-green-800 transition-colors duration-200">
          <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Paybill Number</p>
          <p className="text-2xl font-black text-green-800 dark:text-green-300">{shopSettings?.bankPaybillNumber}</p>
          {shopSettings?.bankPaybillAccount && (
            <>
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1 mt-2">Account</p>
              <p className="text-xl font-black text-green-800 dark:text-green-300">{shopSettings.bankPaybillAccount}</p>
            </>
          )}
        </div>
      )}

      {method === 'pochi' && shopSettings?.mpesaPochiPhone && (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center border border-green-200 dark:border-green-800 transition-colors duration-200">
          <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Phone Number</p>
          <p className="text-2xl font-black text-green-800 dark:text-green-300">{shopSettings.mpesaPochiPhone}</p>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center border border-green-200 dark:border-green-800 transition-colors duration-200">
        <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Customer Pays</p>
        <p className="text-2xl font-black text-green-700 dark:text-green-300">{formatCurrency(total)}</p>
      </div>

      {!mpesaConfirmed ? (
        <button
          onClick={() => setMpesaConfirmed(true)}
          className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-base hover:bg-green-600 flex items-center justify-center gap-2 shadow-lg shadow-green-200 dark:shadow-green-900/40 transition-colors"
        >
          <CheckSquare size={20} />
          I've Received the Payment
        </button>
      ) : (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl text-center border-2 border-emerald-300 dark:border-emerald-700 transition-colors">
          <CheckCircle size={32} className="mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Payment Confirmed!</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(total)} received</p>
        </div>
      )}
    </div>
  )
}

export default MpesaPaymentView
