import React, { useState, useEffect } from 'react'
import { RefreshCw, Save } from 'lucide-react'
import { useShopSettings, useUpdateShopSettings } from '../../../hooks/useDatabase'
import InputField from './SharedInput'

interface ShopSettingsFormProps {
  onClose: () => void
}

const ShopSettingsForm: React.FC<ShopSettingsFormProps> = ({ onClose }) => {
  const { data: settings, isLoading } = useShopSettings()
  const updateSettings = useUpdateShopSettings()

  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: '',
    currency: 'KES', receiptFooter: 'Thank you for shopping with us!',
    receiptPrefix: 'INV', lowStockThreshold: '5',
    mpesaPaybillNumber: '', mpesaAccountNumber: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name || '',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        currency: settings.currency || 'KES',
        receiptFooter: settings.receiptFooter || 'Thank you for shopping with us!',
        receiptPrefix: settings.receiptPrefix || 'INV',
        lowStockThreshold: String(settings.lowStockThreshold || 5),
        mpesaPaybillNumber: settings.mpesaPaybillNumber || '',
        mpesaAccountNumber: settings.mpesaPaybillAccount || '',
      })
    }
  }, [settings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await updateSettings.mutateAsync({
      name: form.name, address: form.address, phone: form.phone, email: form.email,
      currency: form.currency, receiptFooter: form.receiptFooter, receiptPrefix: form.receiptPrefix,
      lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
    })
    onClose()
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-brand-orange" /></div>

  const currencyOptions = [
    { value: 'KES', label: 'KES - Kenyan Shilling' },
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'TZS', label: 'TZS - Tanzanian Shilling' },
    { value: 'UGX', label: 'UGX - Ugandan Shilling' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField label="Shop Name *" name="name" value={form.name} onChange={handleChange} required placeholder="My Shop" fullWidth />
        <InputField label="Phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="+254 700 000 000" />
        <InputField label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="shop@example.com" />
        <InputField label="Currency" name="currency" value={form.currency} onChange={handleChange} options={currencyOptions} />
        <InputField label="Receipt Prefix" name="receiptPrefix" value={form.receiptPrefix} onChange={handleChange} placeholder="INV" />
        <InputField label="Low Stock Alert" name="lowStockThreshold" type="number" min={0} value={form.lowStockThreshold} onChange={handleChange} />
        <InputField label="Address" name="address" value={form.address} onChange={handleChange} placeholder="123 Main Street, City" fullWidth />
        <InputField label="Receipt Footer" name="receiptFooter" value={form.receiptFooter} onChange={handleChange} rows={2} placeholder="Thank you for shopping!" fullWidth />
        <InputField label="M-Pesa Paybill" name="mpesaPaybillNumber" value={form.mpesaPaybillNumber} onChange={handleChange} placeholder="e.g. 123456" />
        <InputField label="M-Pesa Account" name="mpesaAccountNumber" value={form.mpesaAccountNumber} onChange={handleChange} fullWidth />
      </div>
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

export default ShopSettingsForm
