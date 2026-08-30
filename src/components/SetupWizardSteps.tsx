import React from 'react'
import { Store } from 'lucide-react'
import { FormField } from './shared/FormField'
import { useTranslation } from '../lib/useTranslation'

interface ShopDetailsStepProps {
  shopName: string
  currency: string
  error: string
  onShopNameChange: (v: string) => void
  onCurrencyChange: (v: string) => void
}

const CURRENCIES = [
  { value: 'KES', label: 'KES - Kenyan Shilling' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'TZS', label: 'TZS - Tanzanian Shilling' },
  { value: 'UGX', label: 'UGX - Ugandan Shilling' },
]

export const ShopDetailsStep: React.FC<ShopDetailsStepProps> = ({ shopName, currency, error, onShopNameChange, onCurrencyChange }) => {
  const { t } = useTranslation()
  return (
    <>
      <div className="flex flex-col items-center gap-1 mb-2">
        <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center">
          <Store size={24} className="text-brand-orange" />
        </div>
        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">{t('wizard.step1of2')}</p>
      </div>
      <FormField label={t('wizard.shopName')} required error={shopName !== '' ? error : ''}>
        <input
          type="text"
          value={shopName}
          onChange={e => onShopNameChange(e.target.value)}
          placeholder="My Shop"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
        />
      </FormField>
      <FormField label={t('wizard.currency')} required>
        <select
          value={currency}
          onChange={e => onCurrencyChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
        >
          {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </FormField>
    </>
  )
}

interface OwnerAccountStepProps {
  ownerName: string
  pin: string
  confirmPin: string
  error: string
  pinError: string
  loading: boolean
  onOwnerNameChange: (v: string) => void
  onPinChange: (v: string) => void
  onConfirmPinChange: (v: string) => void
}

export const OwnerAccountStep: React.FC<OwnerAccountStepProps> = ({ ownerName, pin, confirmPin, error, pinError, loading, onOwnerNameChange, onPinChange, onConfirmPinChange }) => {
  const { t } = useTranslation()
  return (
    <>
      <div className="flex flex-col items-center gap-1 mb-2">
        <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center">
          <Store size={24} className="text-brand-orange" />
        </div>
        <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mt-1">{t('wizard.step2of2')}</p>
      </div>
      <FormField label={t('wizard.ownerName')} required error={ownerName !== '' ? error : ''}>
        <input
          type="text"
          value={ownerName}
          onChange={e => onOwnerNameChange(e.target.value)}
          placeholder="John Doe"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
        />
      </FormField>
      <FormField label={t('wizard.pin')} required>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={e => onPinChange(e.target.value.replace(/\D/g, ''))}
          placeholder="****"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50 tracking-widest"
        />
      </FormField>
      <FormField label={t('wizard.confirmPin')} required error={pinError || (confirmPin !== '' ? error : '')}>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={confirmPin}
          onChange={e => onConfirmPinChange(e.target.value.replace(/\D/g, ''))}
          placeholder="****"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50 tracking-widest"
        />
      </FormField>
    </>
  )
}
