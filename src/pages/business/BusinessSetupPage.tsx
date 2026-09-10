/**
 * BusinessSetupPage.tsx — Phase 07: Business Setup form page.
 *
 * Fields: business name, type, country, currency, owner name, owner phone, owner email.
 * Gate: owner role or business.admin capability.
 * On submit: calls businessSetup() via IPC → cloud.
 * Success: shows business card with ID + default category.
 */

import React, { useState } from 'react'
import { X, Building2, CheckCircle, AlertCircle } from 'lucide-react'
import { FormField } from '../../components/shared/FormField'
import { useAuth } from '../../lib/auth-context'

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Retail Shop' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'salon', label: 'Salon / Beauty' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'other', label: 'Other' },
]

const COUNTRIES = [
  { value: 'KE', label: 'Kenya (KE)' },
  { value: 'TZ', label: 'Tanzania (TZ)' },
  { value: 'UG', label: 'Uganda (UG)' },
]

const CURRENCIES = [
  { value: 'KES', label: 'KES — Kenyan Shilling' },
  { value: 'TZS', label: 'TZS — Tanzanian Shilling' },
  { value: 'UGX', label: 'UGX — Ugandan Shilling' },
]

interface BusinessSetupResult {
  businessId: string
  ownerMembershipId: string
  defaultCategoryId: string
}

interface Props {
  onClose: () => void
  onSuccess?: (result: BusinessSetupResult) => void
}

const BusinessSetupPage: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { can, user } = useAuth()
  const isOwner = user?.role === 'owner'
  const canSetup = isOwner || can('business.admin')

  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('retail')
  const [country, setCountry] = useState('KE')
  const [currency, setCurrency] = useState('KES')
  const [ownerName, setOwnerName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<BusinessSetupResult | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!canSetup) {
      setError('You do not have permission to set up a business.')
      return
    }
    if (businessName.trim().length < 2) {
      setError('Business name must be at least 2 characters.')
      return
    }
    if (!ownerName.trim()) {
      setError('Owner name is required.')
      return
    }
    if (!ownerPhone.trim()) {
      setError('Owner phone is required.')
      return
    }

    setLoading(true)
    try {
      const res = await window.electronAPI.db.businessSetup({
        businessName: businessName.trim(),
        businessType: businessType as BusinessSetupResult['businessId'] extends string ? 'retail' | 'wholesale' | 'supermarket' | 'restaurant' | 'salon' | 'pharmacy' | 'other' : never,
        country,
        currency,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        ownerEmail: ownerEmail.trim() || undefined,
      })
      setResult(res)
      onSuccess?.(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create business. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="flex flex-col h-full bg-bg-primary">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-color shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <CheckCircle size={18} className="text-emerald-500" />
            </div>
            <h2 className="text-base font-bold text-text-primary">Business Created</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 flex flex-col gap-4">
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Business ID</p>
              <p className="text-sm font-mono text-emerald-800 dark:text-emerald-200 break-all">{result.businessId}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Default Category ID</p>
              <p className="text-sm font-mono text-emerald-800 dark:text-emerald-200 break-all">{result.defaultCategoryId}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Owner Membership ID</p>
              <p className="text-sm font-mono text-emerald-800 dark:text-emerald-200 break-all">{result.ownerMembershipId}</p>
            </div>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 pt-1 border-t border-emerald-200 dark:border-emerald-800">
              A default "Uncategorized" category has been created so you can start adding products immediately.
            </p>
          </div>
          <button
            onClick={onClose}
            className="mt-4 w-full py-2.5 rounded-xl bg-brand-orange text-white font-semibold hover:bg-orange-600 active:scale-[0.98] transition-all text-sm"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  if (!canSetup) {
    return (
      <div className="flex flex-col h-full bg-bg-primary">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-color shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
              <AlertCircle size={18} className="text-red-500" />
            </div>
            <h2 className="text-base font-bold text-text-primary">Access Denied</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-sm text-text-muted">You need owner or business.admin permission to set up a new business.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-color shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center">
            <Building2 size={18} className="text-brand-orange" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Set Up Business</h2>
            <p className="text-[10px] text-text-muted">Create a new business on this device</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <X size={18} className="text-slate-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        <FormField label="Business Name" required hint="Min. 2 characters">
          <input
            type="text"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            placeholder="e.g. Kim's Convenience Store"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-bg-primary dark:bg-slate-800 text-sm text-text-primary placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition-all"
            minLength={2}
          />
        </FormField>

        <FormField label="Business Type" required>
          <select
            value={businessType}
            onChange={e => setBusinessType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-bg-primary dark:bg-slate-800 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition-all"
          >
            {BUSINESS_TYPES.map(bt => (
              <option key={bt.value} value={bt.value}>{bt.label}</option>
            ))}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Country" required>
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-bg-primary dark:bg-slate-800 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition-all"
            >
              {COUNTRIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Currency" required>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-bg-primary dark:bg-slate-800 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition-all"
            >
              {CURRENCIES.map(cu => (
                <option key={cu.value} value={cu.value}>{cu.label}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Owner Details</p>

          <div className="space-y-4">
            <FormField label="Owner Full Name" required>
              <input
                type="text"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder="e.g. John Kamau"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-bg-primary dark:bg-slate-800 text-sm text-text-primary placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition-all"
              />
            </FormField>

            <FormField label="Owner Phone" required hint="E.164 format, e.g. +254746269657">
              <input
                type="tel"
                value={ownerPhone}
                onChange={e => setOwnerPhone(e.target.value)}
                placeholder="+254..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-bg-primary dark:bg-slate-800 text-sm text-text-primary placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition-all"
              />
            </FormField>

            <FormField label="Owner Email" hint="Optional">
              <input
                type="email"
                value={ownerEmail}
                onChange={e => setOwnerEmail(e.target.value)}
                placeholder="owner@example.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-bg-primary dark:bg-slate-800 text-sm text-text-primary placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-orange/40 transition-all"
              />
            </FormField>
          </div>
        </div>

        <div className="pt-2 pb-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-orange text-white font-semibold hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {loading ? 'Creating Business...' : 'Create Business'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default BusinessSetupPage
