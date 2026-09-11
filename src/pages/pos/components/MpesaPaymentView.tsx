/**
 * MpesaPaymentView.tsx — M-Pesa payment dialog shell.
 *
 * Non-STK methods (bankPaybill/pochi): renders account details + manual confirm.
 * STK methods (sendMoney/mpesaPaybill): composes MpesaPaymentForm + MpesaSTKPoller.
 */

import { useState } from 'react'
import { CheckSquare, CheckCircle } from 'lucide-react'
import type { ShopSettings } from '../../../lib/types'
import { formatCurrency } from '../../../lib/formatting-currency'
import type { PaymentMethod } from '../hooks/useCheckout'
import MpesaPaymentForm from './MpesaPaymentForm'
import MpesaSTKPoller from './MpesaSTKPoller'
import type { PollerPhase } from './MpesaSTKPoller'

interface Props {
  method: PaymentMethod
  shopSettings?: ShopSettings | null
  total: number
  mpesaConfirmed: boolean
  setMpesaConfirmed: (v: boolean) => void
}

const POLL_INTERVAL_MS = 3_000

type STKPhase = 'idle' | 'sending' | 'polling' | 'completed' | 'failed'

const MpesaPaymentView: React.FC<Props> = ({
  method, shopSettings, total, mpesaConfirmed, setMpesaConfirmed,
}) => {
  const isSTK = method === 'sendMoney' || method === 'mpesaPaybill'

  // STK state
  const [phase, setPhase] = useState<STKPhase>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [stkId, setStkId] = useState('')
  const [checkoutRequestId, setCheckoutRequestId] = useState('')

  // ── Non-STK render (bankPaybill / pochi) ──────────────────────────────────
  if (!isSTK) {
    return (
      <div className="space-y-4 p-5 bg-green-50 dark:bg-green-950/40 rounded-2xl border border-green-100 dark:border-green-900/50">
        <p className="text-sm font-bold text-green-700 dark:text-green-400 text-center">
          {method === 'bankPaybill' ? 'Bank Paybill' : 'Pochi La Biashara'}
        </p>
        {method === 'bankPaybill' && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Bank Paybill</p>
            <p className="text-2xl font-black text-green-800 dark:text-green-300">{shopSettings?.bankPaybillNumber}</p>
            {shopSettings?.bankPaybillAccount && (
              <><p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-2">Account</p>
              <p className="text-xl font-black text-green-800 dark:text-green-300">{shopSettings.bankPaybillAccount}</p></>
            )}
          </div>
        )}
        {method === 'pochi' && shopSettings?.mpesaPochiPhone && (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Phone Number</p>
            <p className="text-2xl font-black text-green-800 dark:text-green-300">{shopSettings.mpesaPochiPhone}</p>
          </div>
        )}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 text-center border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">Customer Pays</p>
          <p className="text-2xl font-black text-green-700 dark:text-green-300">{formatCurrency(total)}</p>
        </div>
        {!mpesaConfirmed ? (
          <button onClick={() => setMpesaConfirmed(true)}
            className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-base hover:bg-green-600 flex items-center justify-center gap-2 shadow-lg shadow-green-200 dark:shadow-green-900/40">
            <CheckSquare size={20} />Received Payment
          </button>
        ) : (
          <div className="p-4 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl text-center border-2 border-emerald-300 dark:border-emerald-700">
            <CheckCircle size={32} className="mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Payment Confirmed</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(total)} received</p>
          </div>
        )}
      </div>
    )
  }

  // ── STK render (sendMoney / mpesaPaybill) ────────────────────────────────
  function handleSendRequest(phone: string): void {
    setPhase('sending')
    setErrorMsg('')
    window.electronAPI.db.mpesaStkPush(phone, total, shopSettings?.id ?? 'default')
      .then(result => {
        if (!result.success || !result.id || !result.checkoutRequestId) {
          setPhase('failed')
          setErrorMsg(result.error ?? 'Failed to send payment request.')
          return
        }
        setStkId(result.id)
        setCheckoutRequestId(result.checkoutRequestId)
        setPhase('polling')
      })
      .catch(err => {
        setPhase('failed')
        setErrorMsg(String(err))
      })
  }

  function handlePhaseChange(newPhase: PollerPhase, errMsg = ''): void {
    if (newPhase === 'completed') {
      setPhase('completed')
    } else if (newPhase === 'failed') {
      setPhase('failed')
      setErrorMsg(errMsg)
    } else {
      setPhase(newPhase)
    }
  }

  function handlePollerCompleted(): void {
    setMpesaConfirmed(true)
  }

  // Convert PollerPhase → STKPhase for form
  const formPhase: PollerPhase = phase === 'sending' ? 'idle' : phase === 'completed' || phase === 'failed' ? phase : phase

  return (
    <div className="space-y-4 p-5 bg-green-50 dark:bg-green-950/40 rounded-2xl border border-green-100 dark:border-green-900/50 transition-colors duration-200">
      <p className="text-sm font-bold text-green-700 dark:text-green-400 text-center">
        {method === 'mpesaPaybill' ? 'M-Pesa Paybill' : 'Send Money'}
      </p>

      <MpesaPaymentForm
        method={method}
        shopSettings={shopSettings}
        total={total}
        phase={formPhase}
        onSendRequest={handleSendRequest}
      />

      <MpesaSTKPoller stkId={stkId} checkoutRequestId={checkoutRequestId}
        phase={phase === 'sending' ? 'idle' : phase} errorMsg={errorMsg} total={total}
        mpesaConfirmed={mpesaConfirmed} onPhaseChange={handlePhaseChange} onCompleted={handlePollerCompleted} />
      {mpesaConfirmed && phase !== 'completed' && (
        <div className="p-4 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl text-center border-2 border-emerald-300 dark:border-emerald-700">
          <CheckCircle size={32} className="mx-auto mb-2 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Payment Confirmed</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(total)} received</p>
        </div>
      )}
    </div>
  )
}

export default MpesaPaymentView
