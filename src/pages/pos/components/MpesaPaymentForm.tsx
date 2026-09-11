/**
 * MpesaPaymentForm.tsx — Phone + amount form for STK payment request.
 *
 * Pure UI: phone input field, amount display, Send button.
 * No business logic — all STK operations are deferred to MpesaSTKPoller.
 */

import { useState } from 'react'
import { Phone, Loader2 } from 'lucide-react'
import { formatCurrency } from '../../../lib/formatting-currency'
import type { ShopSettings } from '../../../lib/types'
import type { PollerPhase } from './MpesaSTKPoller'

interface Props {
  method: 'sendMoney' | 'mpesaPaybill'
  shopSettings?: ShopSettings | null
  total: number
  phase: PollerPhase
  onSendRequest: (phone: string) => void
}

const MpesaPaymentForm: React.FC<Props> = ({
  method,
  shopSettings,
  total,
  phase,
  onSendRequest,
}) => {
  const [phone, setPhone] = useState(
    () => shopSettings?.mpesaSendMoneyPhone ?? '',
  )

  const isDisabled = phase === 'polling' || phase === 'completed'
  const canSend = phone.trim().length > 0 && phase === 'idle'

  function handleSend(): void {
    if (!phone.trim()) return
    onSendRequest(phone.trim())
  }

  return (
    <>
      {/* Phone number */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-green-200 dark:border-green-800 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <Phone size={14} className="text-green-500 shrink-0" />
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="07XX XXX XXX"
            disabled={isDisabled}
            className="flex-1 text-lg font-semibold bg-transparent outline-none text-green-800 dark:text-green-200 placeholder:text-green-300 disabled:opacity-60"
          />
        </div>
        {method === 'mpesaPaybill' && shopSettings?.mpesaPaybillNumber && (
          <div className="border-t border-green-200 dark:border-green-800 px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-green-600 dark:text-green-400">Paybill</span>
            <span className="text-sm font-bold text-green-700 dark:text-green-300">{shopSettings.mpesaPaybillNumber}</span>
          </div>
        )}
        {method === 'mpesaPaybill' && shopSettings?.mpesaPaybillAccount && (
          <div className="border-t border-green-200 dark:border-green-800 px-4 py-2 flex items-center justify-between">
            <span className="text-xs text-green-600 dark:text-green-400">Account</span>
            <span className="text-sm font-bold text-green-700 dark:text-green-300">{shopSettings.mpesaPaybillAccount}</span>
          </div>
        )}
      </div>

      {/* Amount */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center border border-green-200 dark:border-green-800">
        <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Customer Pays</p>
        <p className="text-2xl font-black text-green-700 dark:text-green-300">{formatCurrency(total)}</p>
      </div>

      {/* Send Payment Request button */}
      {phase === 'idle' && (
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-base hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-200 dark:shadow-green-900/40 transition-colors"
        >
          Send Payment Request
        </button>
      )}

      {/* Sending spinner */}
      {phase === 'sending' && (
        <div className="flex items-center justify-center py-4 gap-2 text-green-600 dark:text-green-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm font-medium">Sending request...</span>
        </div>
      )}
    </>
  )
}

export default MpesaPaymentForm
