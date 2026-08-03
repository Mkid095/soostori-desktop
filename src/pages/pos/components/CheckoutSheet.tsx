import React, { useEffect } from 'react'
import { X, Pause, CheckCircle, Wifi, Loader2 } from 'lucide-react'
import type { CartItem, ShopSettings } from '../../../lib/types'
import { formatCurrency } from '../../../lib/formatting-currency'
import { useCheckout, type CheckoutPayload } from '../hooks/useCheckout'
import CartSummary from './CartSummary'
import PaymentMethodButtons from './PaymentMethodButtons'
import CashPaymentView from './CashPaymentView'
import MpesaPaymentView from './MpesaPaymentView'
import DebtPaymentView from './DebtPaymentView'
import { useCustomers } from '../../../hooks/useDatabase'
import { useTranslation } from '../../../lib/useTranslation'

interface CheckoutSheetProps {
  cart: CartItem[]
  onPay: (data: CheckoutPayload) => void
  onClose: () => void
  onHold: () => void
  isProcessing: boolean
  shopSettings?: ShopSettings | null
  saleAmount?: number
}

const CheckoutSheet: React.FC<CheckoutSheetProps> = ({
  cart, onPay, onClose, onHold, isProcessing, shopSettings, saleAmount = 0,
}) => {
  const { t } = useTranslation()
  const { data: customers = [] } = useCustomers()

  const { method, given, note, mpesaConfirmed, showThankYou,
    debtCustomerId, debtCustomerName, debtCustomerPhone, debtCustomerIdNumber, showNewCustomer,
    total, givenAmt, quickAmounts, canConfirm, paymentMethods,
    setGiven, setNote, setMpesaConfirmed, setDebtCustomerId,
    setDebtCustomerName, setDebtCustomerPhone, setDebtCustomerIdNumber, setShowNewCustomer,
    handleDebtCustomerSelect, handleConfirm, onMethodChange } = useCheckout(cart, shopSettings, isProcessing, onPay)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (showThankYou) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-bg-primary z-[9999] flex flex-col items-center justify-center animate-fade-in p-8 transition-colors duration-200">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-2">{t('pos.thankYou')}!</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">{t('pos.paymentReceived') || 'Your payment has been received.'}</p>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 mb-8 text-center border border-slate-100 dark:border-slate-700 transition-colors duration-200">
            <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold mb-1">{t('pos.amountPaid') || 'Amount Paid'}</p>
            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(saleAmount)}</p>
          </div>
          <button onClick={onClose} className="w-full py-4 bg-brand-orange text-white rounded-2xl font-black text-lg hover:bg-orange-600 shadow-lg shadow-orange-200 dark:shadow-orange-900/40 flex items-center justify-center gap-2 transition-colors">
            <CheckCircle size={20} />{t('pos.newSale')}
          </button>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">{t('pos.pressEscape') || 'Press Escape to close'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-bg-primary z-[9999] flex flex-col animate-fade-in overflow-hidden transition-colors duration-200">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-bg-secondary shrink-0 transition-colors duration-200">
        <h2 className="font-black text-slate-800 dark:text-slate-100 text-xl">{t('pos.checkout')}</h2>
        <div className="flex items-center gap-2">
          <button onClick={onHold} className="min-h-[44px] px-4 py-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl font-bold text-sm hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center gap-1.5 active:scale-[0.96] transition-[background-color,transform]">
            <Pause size={16} />{t('pos.hold')}
          </button>
          <button onClick={onClose} aria-label={t('action.close')} className="w-11 h-11 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} className="text-slate-400 dark:text-slate-500" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6"><CartSummary cart={cart} total={total} /></div>

          <div className="space-y-5">
            <PaymentMethodButtons paymentMethods={paymentMethods} method={method} onMethodChange={onMethodChange} />
            {method === 'cash' && <CashPaymentView given={given} setGiven={setGiven} total={total} givenAmt={givenAmt} change={givenAmt - total} quickAmounts={quickAmounts} />}
            {['sendMoney', 'mpesaPaybill', 'bankPaybill', 'pochi'].includes(method) && <MpesaPaymentView method={method} shopSettings={shopSettings} total={total} mpesaConfirmed={mpesaConfirmed} setMpesaConfirmed={setMpesaConfirmed} />}
            {method === 'debt' && <DebtPaymentView customers={customers} debtCustomerId={debtCustomerId} debtCustomerName={debtCustomerName} debtCustomerPhone={debtCustomerPhone} debtCustomerIdNumber={debtCustomerIdNumber} showNewCustomer={showNewCustomer} total={total} onSelect={handleDebtCustomerSelect} onNewName={setDebtCustomerName} onNewPhone={setDebtCustomerPhone} onNewIdNumber={setDebtCustomerIdNumber} onShowNew={() => { setShowNewCustomer(true); setDebtCustomerId('') }} onShowExisting={() => setShowNewCustomer(false)} />}
            {(method === 'debt' || ['sendMoney', 'mpesaPaybill', 'bankPaybill', 'pochi'].includes(method)) && (
              <textarea placeholder={t('label.notes')} value={note} onChange={e => setNote(e.target.value)} rows={2}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-3 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-brand-orange resize-none transition-colors duration-200" />
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-bg-secondary shrink-0 transition-colors duration-200">
        <button onClick={handleConfirm} disabled={!canConfirm}
          className="w-full min-h-[64px] py-5 bg-brand-orange text-white rounded-2xl font-black text-xl hover:bg-orange-600 disabled:opacity-40 shadow-lg shadow-orange-200 dark:shadow-orange-900/40 flex items-center justify-center gap-2 active:scale-[0.99] transition-[background-color,transform,box-shadow]">
          {isProcessing ? <Loader2 size={20} className="animate-spin" /> :
           !mpesaConfirmed && ['sendMoney', 'mpesaPaybill', 'bankPaybill', 'pochi'].includes(method) ? <Wifi size={20} /> :
           <CheckCircle size={20} />}
          {isProcessing ? t('pos.processing') || 'Processing...' :
           method === 'cash' ? `Receive ${formatCurrency(total)}` :
           ['sendMoney', 'mpesaPaybill', 'bankPaybill', 'pochi'].includes(method)
             ? (mpesaConfirmed ? t('pos.completeSale') : t('pos.confirmPayment') || 'Confirm Payment') : t('pos.recordDebt')}
        </button>
      </div>
    </div>
  )
}

export default CheckoutSheet
