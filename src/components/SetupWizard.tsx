import React, { useState } from 'react'
import { StepIndicator } from './shared/StepIndicator'
import { ShopDetailsStep, OwnerAccountStep } from './SetupWizardSteps'
import { useTranslation } from '../lib/useTranslation'

interface SetupWizardProps {
  onComplete: () => void
}

const STEPS = [
  { number: 0, label: 'Shop Details', labelSw: 'Maelezo ya Duka' },
  { number: 1, label: 'Owner Account', labelSw: 'Akaunti ya Mmiliki' },
]

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shopName, setShopName] = useState('')
  const [currency, setCurrency] = useState('KES')
  const [ownerName, setOwnerName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')

  const handleNext = () => {
    if (step === 0) {
      if (!shopName.trim()) { setError(t('error.required')); return }
      setError(''); setStep(1)
    }
  }

  const handleBack = () => { if (step > 0) setStep(s => s - 1) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError('')
    if (!ownerName.trim()) { setError(t('error.required')); return }
    if (!/^\d{4}$/.test(pin)) { setPinError(t('wizard.invalidPin')); return }
    if (pin !== confirmPin) { setPinError(t('wizard.pinMismatch')); return }
    setLoading(true); setError('')
    try {
      await window.electronAPI.db.createShop({ name: shopName.trim(), currency, ownerName: ownerName.trim(), ownerPin: pin })
      setStep(2)
    } catch { setError(t('error.saveFailed')) }
    finally { setLoading(false) }
  }

  if (step === 2) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 shadow-2xl w-full max-w-sm flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('wizard.setupComplete')}</h2>
          <p className="text-sm text-slate-500 mt-2">{t('wizard.setupCompleteHint')}</p>
        </div>
        <button onClick={onComplete} className="w-full py-3 rounded-xl bg-brand-orange text-white font-semibold hover:bg-orange-600 active:scale-95 transition-all">
          {t('wizard.goToLogin')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        <StepIndicator steps={STEPS} currentStep={step} />
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {step === 0 && (
            <ShopDetailsStep
              shopName={shopName} currency={currency} error={error}
              onShopNameChange={setShopName} onCurrencyChange={setCurrency}
            />
          )}
          {step === 1 && (
            <OwnerAccountStep
              ownerName={ownerName} pin={pin} confirmPin={confirmPin}
              error={error} pinError={pinError} loading={loading}
              onOwnerNameChange={setOwnerName} onPinChange={setPin} onConfirmPinChange={setConfirmPin}
            />
          )}
          {error && step === 0 && <p className="text-xs text-red-500 font-semibold text-center">{error}</p>}
          {error && step === 1 && !pinError && <p className="text-xs text-red-500 font-semibold text-center">{error}</p>}
          <div className="flex gap-3 mt-2">
            {step === 1 && (
              <button type="button" onClick={handleBack}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                {t('action.back')}
              </button>
            )}
            {step === 0 && (
              <button type="button" onClick={handleNext}
                className="flex-1 py-2.5 rounded-xl bg-brand-orange text-white text-sm font-semibold hover:bg-orange-600 active:scale-95 transition-all">
                {t('action.next')}
              </button>
            )}
            {step === 1 && (
              <button type="submit" disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-brand-orange text-white text-sm font-semibold hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50">
                {loading ? '...' : t('action.finish')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default SetupWizard
