import React, { useState } from 'react'
import { useTranslation } from '../../../lib/useTranslation'

interface Props {
  onJoined?: () => void
}

export default function InvitationPanel({ onJoined }: Props) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const handleSubmit = async () => {
    setErr('')
    if (!code.trim()) { setErr('Code required'); return }
    if (!name.trim()) { setErr('Name required'); return }
    if (!/^\d{4}$/.test(pin)) { setErr('PIN must be 4 digits'); return }
    if (pin !== pin2) { setErr('PINs do not match'); return }
    setLoading(true)
    try {
      // Get canonical device UUID from main process
      const { deviceId } = await window.electronAPI.db.getDeviceId() as { deviceId: string }
      localStorage.setItem('deviceId', deviceId)

      // Accept invitation — creates employee, returns shopId
      const acceptResult = await window.electronAPI.db.acceptInvite(code.trim(), name.trim(), pin, deviceId) as { userId: string; shopId: string }

      // Register this device with the shop (uses canonical UUID)
      await window.electronAPI.db.registerDevice({
        deviceId,
        shopId: acceptResult.shopId,
        deviceName: 'POS',
        employeeId: acceptResult.userId,
      })

      // Create pairing request so owner can approve
      await window.electronAPI.db.requestPairing({
        shopId: acceptResult.shopId,
        deviceId,
        requestedBy: acceptResult.userId,
        deviceName: 'POS',
      })

      onJoined?.()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 p-4 max-w-xs mx-auto">
      <h2 className="text-sm font-bold text-center">Join a Shop</h2>
      <p className="text-xs text-slate-500 text-center">Enter the 6-digit invitation code from your shop owner.</p>
      <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        maxLength={6} placeholder="______"
        className="w-full text-center text-2xl font-bold tracking-[0.3em] py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700" />
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"
        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
      <input value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        maxLength={4} placeholder="4-digit PIN" type="password"
        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
      <input value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, '').slice(0, 4))}
        maxLength={4} placeholder="Confirm PIN" type="password"
        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm" />
      {err && <p className="text-xs text-red-500 text-center">{err}</p>}
      <button onClick={handleSubmit} disabled={loading}
        className="w-full py-2.5 rounded-xl bg-brand-orange text-white text-sm font-semibold disabled:opacity-50">
        {loading ? 'Joining...' : 'Join Shop'}
      </button>
    </div>
  )
}
