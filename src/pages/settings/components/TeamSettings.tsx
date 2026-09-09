import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Plus, Pencil, Trash2, X } from 'lucide-react'
import { useAuth } from '../../../lib/auth-context'
import type { ShopUser } from '../../../../electron/preload/types'

interface InviteResult { code: string }

export default function TeamSettings() {
  const { can, user: authUser } = useAuth()
  const [users, setUsers] = useState<ShopUser[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<ShopUser | null>(null)
  const [err, setErr] = useState('')
  const [invite, setInvite] = useState<InviteResult | null>(null)
  const [f, setF] = useState({ name: '', pin: '', pin2: '', role: 'cashier' })

  const isOwner = can('team')

  const shopId = (authUser as ShopUser | null)?.shop_id ?? ''

  const load = useCallback(async () => {
    if (!shopId) return
    setLoading(true)
    try { setUsers(await window.electronAPI.db.getUsers(shopId) as ShopUser[]) } finally { setLoading(false) }
  }, [shopId])

  useEffect(() => { load() }, [load])

  const submit = async () => {
    setErr('')
    if (!f.name.trim()) { setErr('Name required'); return }
    if (!/^\d{4}$/.test(f.pin)) { setErr('PIN must be 4 digits'); return }
    if (modal === 'add' && f.pin !== f.pin2) { setErr('PINs do not match'); return }
    if (modal === 'edit' && editTarget) {
      const newPin = (document.getElementById('e-pin') as HTMLInputElement)?.value
      if (newPin && !/^\d{4}$/.test(newPin)) { setErr('PIN must be 4 digits'); return }
      await window.electronAPI.db.updateUser(editTarget.id, { name: f.name.trim(), role: f.role, pin: newPin || undefined })
      setModal(null); setEditTarget(null)
    } else {
      const r = await window.electronAPI.db.createInvite({ shopId, employeeName: f.name.trim(), role: f.role, createdBy: authUser?.id ?? '' })
      setInvite(r as InviteResult)
      setModal(null)
    }
    setF({ name: '', pin: '', pin2: '', role: 'cashier' })
    load()
  }

  const startAdd = () => { setF({ name: '', pin: '', pin2: '', role: 'cashier' }); setErr(''); setModal('add') }
  const startEdit = (u: ShopUser) => { setF({ name: u.name, pin: '', pin2: '', role: u.role }); setErr(''); setEditTarget(u); setModal('edit') }

  if (!isOwner) return <p className="p-6 text-center text-sm text-slate-400">No permission.</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Team</h2>
        <div className="flex gap-2">
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /></button>
          <button onClick={startAdd} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-orange text-white text-xs font-semibold"><Plus size={13} /> Add</button>
        </div>
      </div>

      {err && <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">{err}</p>}

      {invite && (
        <div className="flex items-center gap-2 p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl text-xs">
          <span className="text-green-600 font-semibold">Code:</span>
          <span className="font-bold tracking-widest text-green-700">{invite.code}</span>
          <span className="text-green-500 flex-1">24h</span>
          <button onClick={() => setInvite(null)}><X size={13} className="text-green-500" /></button>
        </div>
      )}

      {users.map(u => (
        <div key={u.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
          <div className="w-7 h-7 rounded-full bg-brand-orange/10 flex items-center justify-center">
            <span className="text-xs font-bold text-brand-orange">{u.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{u.name}</p>
            <p className="text-slate-400 uppercase tracking-wide">{u.role}</p>
          </div>
          <button onClick={() => startEdit(u)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil size={13} className="text-slate-400" /></button>
          {u.id !== authUser?.id && (
            <button onClick={() => { if (confirm(`Remove ${u.name}?`)) window.electronAPI.db.deleteUser(u.id).then(load) }} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={13} className="text-red-400" /></button>
          )}
        </div>
      ))}

      {(modal === 'add' || modal === 'edit') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <h3 className="text-sm font-bold mb-3">{modal === 'add' ? 'Add Employee' : `Edit ${editTarget?.name}`}</h3>
            <div className="space-y-2.5">
              <input value={f.name} onChange={e => setF(f => ({ ...f, name: e.target.value }))} placeholder="Full name"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs" />
              <select value={f.role} onChange={e => setF(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs">
                <option value="cashier">Cashier</option><option value="manager">Manager</option>
              </select>
              {modal === 'add' ? (
                <>
                  <input value={f.pin} onChange={e => setF(f => ({ ...f, pin: e.target.value }))} placeholder="4-digit PIN" maxLength={4}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs" />
                  <input value={f.pin2} onChange={e => setF(f => ({ ...f, pin2: e.target.value }))} placeholder="Confirm PIN" maxLength={4}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs" />
                </>
              ) : (
                <input id="e-pin" placeholder="New PIN (leave blank to keep)" maxLength={4}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs" />
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setModal(null); setEditTarget(null) }}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold">Cancel</button>
              <button onClick={submit}
                className="flex-1 py-2 rounded-xl bg-brand-orange text-white text-xs font-semibold">
                {modal === 'add' ? 'Generate' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
