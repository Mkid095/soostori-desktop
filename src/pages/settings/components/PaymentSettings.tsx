import React, { useState, useEffect } from 'react'
import { RefreshCw, Save } from 'lucide-react'
import { useShopSettings, useUpdateShopSettings } from '../../../hooks/useDatabase'

interface PaymentSettingsProps {
  onClose: () => void
}

type PaymentType = 'sendMoney' | 'mpesaPaybill' | 'bankPaybill' | 'pochi'

const PAYMENT_TYPES: { value: PaymentType; label: string; hint: string }[] = [
  { value: 'sendMoney', label: 'Send Money (Phone Number)', hint: 'Customer sends money to your phone number' },
  { value: 'mpesaPaybill', label: 'M-Pesa Paybill', hint: 'Customer pays via M-Pesa paybill number + account' },
  { value: 'bankPaybill', label: 'Bank Paybill', hint: 'Customer pays via bank paybill number + account' },
  { value: 'pochi', label: 'Pochi La Biashara (Phone)', hint: 'Customer pays via Pochi to your phone number' },
]

const PaymentSettings: React.FC<PaymentSettingsProps> = ({ onClose }) => {
  const { data: settings, isLoading } = useShopSettings()
  const updateSettings = useUpdateShopSettings()
  const [paymentType, setPaymentType] = useState<PaymentType>('sendMoney')
  const [phone, setPhone] = useState('')
  const [paybillNumber, setPaybillNumber] = useState('')
  const [paybillAccount, setPaybillAccount] = useState('')

  useEffect(() => {
    if (settings) {
      setPaymentType(settings.mpesaSendMoneyPhone ? 'sendMoney' : settings.mpesaPaybillNumber ? 'mpesaPaybill' : settings.bankPaybillNumber ? 'bankPaybill' : settings.mpesaPochiPhone ? 'pochi' : 'sendMoney')
      setPhone(settings.mpesaSendMoneyPhone || settings.mpesaPochiPhone || '')
      setPaybillNumber(settings.mpesaPaybillNumber || settings.bankPaybillNumber || '')
      setPaybillAccount(settings.mpesaPaybillAccount || settings.bankPaybillAccount || '')
    }
  }, [settings])

  const handleTypeChange = (type: PaymentType) => { setPaymentType(type); setPhone(''); setPaybillNumber(''); setPaybillAccount('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateSettings.mutateAsync({
      mpesaSendMoneyPhone: paymentType === 'sendMoney' ? phone : '',
      mpesaPaybillNumber: paymentType === 'mpesaPaybill' ? paybillNumber : '',
      mpesaPaybillAccount: paymentType === 'mpesaPaybill' ? paybillAccount : '',
      bankPaybillNumber: paymentType === 'bankPaybill' ? paybillNumber : '',
      bankPaybillAccount: paymentType === 'bankPaybill' ? paybillAccount : '',
      mpesaPochiPhone: paymentType === 'pochi' ? phone : '',
    })
    onClose()
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-brand-orange" /></div>

  const renderFields = () => {
    if (paymentType === 'sendMoney') return <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Your Phone Number</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none" placeholder="e.g. 0741234567" required /></div>
    if (paymentType === 'mpesaPaybill') return <><div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Paybill Number</label><input type="text" value={paybillNumber} onChange={(e) => setPaybillNumber(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none" placeholder="e.g. 123456" required /></div><div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Account Number</label><input type="text" value={paybillAccount} onChange={(e) => setPaybillAccount(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none" placeholder="e.g. BUSINESS001" required /></div></>
    if (paymentType === 'bankPaybill') return <><div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Bank Paybill Number</label><input type="text" value={paybillNumber} onChange={(e) => setPaybillNumber(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none" placeholder="e.g. 123456" required /></div><div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Account Number</label><input type="text" value={paybillAccount} onChange={(e) => setPaybillAccount(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none" placeholder="e.g. BUSINESS001" required /></div></>
    if (paymentType === 'pochi') return <div><label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pochi Phone Number</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none" placeholder="e.g. 0741234567" required /></div>
    return null
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="p-4 bg-green-50 rounded-xl text-sm text-slate-600">Select one payment method. Only the method you choose will appear at checkout for customers.</div>
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Payment Method</label>
        <select value={paymentType} onChange={(e) => handleTypeChange(e.target.value as PaymentType)} className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none">
          {PAYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <p className="text-xs text-slate-400 mt-1">{PAYMENT_TYPES.find((t) => t.value === paymentType)?.hint}</p>
      </div>
      {renderFields()}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-full font-bold hover:bg-slate-200">Cancel</button>
        <button type="submit" disabled={updateSettings.isPending} className="flex-1 py-4 bg-brand-orange text-white rounded-full font-bold hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
          {updateSettings.isPending ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}

export default PaymentSettings
