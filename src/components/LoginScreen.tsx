import React, { useState, useEffect, useCallback } from 'react'
import { Shield, User } from 'lucide-react'
import { useTranslation } from '../lib/useTranslation'
import { LoginNumPad } from './LoginNumPad'
import type { ShopUser } from '../../electron/preload/types'

interface LoginScreenProps {
  onLogin: (user: ShopUser, sessionId: string, deviceId: string) => void
}

type Screen = 'select' | 'pin' | 'forgot'

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { t } = useTranslation()
  const [screen, setScreen] = useState<Screen>('select')
  const [users, setUsers] = useState<ShopUser[]>([])
  const [selectedUser, setSelectedUser] = useState<ShopUser | null>(null)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [att, setAtt] = useState(0)
  const [shk, setShk] = useState(false)
  const [loading, setLoading] = useState(false)

  const sh = () => { setShk(true); setTimeout(() => setShk(false), 500) }

  const getDeviceId = (): string => {
    let id = localStorage.getItem('deviceId')
    if (!id) {
      id = `POS-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
      localStorage.setItem('deviceId', id)
    }
    return id
  }

  useEffect(() => {
    window.electronAPI.db.getShop().then(shop => {
      if (!shop) return
      return window.electronAPI.db.getUsers()
    }).then(allUsers => {
      if (allUsers) setUsers(allUsers.filter((u: ShopUser) => u.is_active === 1))
    }).catch(() => {})
  }, [])

  const handleLogin = useCallback(async () => {
    if (!selectedUser || pin.length !== 4) return
    setLoading(true)
    setErr('')
    try {
      const deviceId = getDeviceId()
      const result = await window.electronAPI.db.login(selectedUser.id, pin, deviceId)
      onLogin(result.user, result.sessionId, deviceId)
    } catch {
      setAtt(a => a + 1)
      setPin('')
      setErr(att >= 2 ? 'Too many attempts.' : 'Invalid PIN. Try again.')
      sh()
    } finally {
      setLoading(false)
    }
  }, [selectedUser, pin, att, onLogin])

  const num = (d: string) => {
    if (pin.length >= 4) return
    const n = pin + d; setPin(n); setErr('')
    if (n.length === 4) handleLogin()
  }

  const back = () => setPin(p => p.slice(0, -1))

  const Dots = ({ c, n }: { c: number; n: number }) => (
    <div className="flex gap-4">{Array.from({ length: c }, (_, i) => (
      <div key={i} className={`w-4 h-4 rounded-full ${i < n ? 'bg-brand-orange' : 'bg-slate-300 dark:bg-slate-600'}`} />
    ))}</div>
  )

  const Title = ({ t: title, p }: { t: string; p: string }) => (
    <div className="text-center"><h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{title}</h2><p className="text-sm text-slate-500 mt-1">{p}</p></div>
  )

  const overlay = (children: React.ReactNode, shake = false) => (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm ${shake ? 'animate-shake' : ''}`}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl w-full max-w-sm flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center"><Shield size={28} className="text-brand-orange" /></div>
        {children}
      </div>
    </div>
  )

  if (screen === 'select') return overlay(<>
    <Title t="Who's logging in?" p="Select your name" />
    <div className="w-full space-y-2 max-h-64 overflow-y-auto">
      {users.length === 0 ? (
        <div className="text-center text-sm text-slate-400 py-8"><User size={32} className="mx-auto mb-2 opacity-30" /><p>No users found</p><p className="text-xs mt-1">Run the Setup Wizard first</p></div>
      ) : users.map(user => (
        <button key={user.id} onClick={() => { setSelectedUser(user); setScreen('pin'); setPin(''); setErr('') }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors text-left">
          <div className="w-9 h-9 rounded-full bg-brand-orange/10 flex items-center justify-center"><User size={18} className="text-brand-orange" /></div>
          <div><p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p><p className="text-[10px] uppercase tracking-wider text-slate-400">{user.role}</p></div>
        </button>
      ))}
    </div>
  </>)

  if (screen === 'forgot') return overlay(<>
    <Title t="Forgot PIN?" p="Contact your shop owner or manager to reset your PIN" />
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
        <User size={24} className="text-slate-400" />
      </div>
      <p className="text-sm text-slate-500">Your PIN can only be reset by an administrator with owner or manager access.</p>
    </div>
    <button onClick={() => setScreen('select')} className="text-sm text-brand-orange hover:text-orange-600 transition-colors font-semibold">
      Back to login
    </button>
  </>)

  return overlay(<>
    <Title t={selectedUser?.name ?? 'Enter PIN'} p="Enter your 4-digit PIN" />
    <Dots c={4} n={pin.length} />
    {err && <p className={`text-xs ${att >= 3 ? 'text-red-600 font-semibold' : 'text-red-500'}`}>{err}</p>}
    <LoginNumPad onDigit={num} onBack={back} disabled={loading} />
    {att < 3 && <button onClick={() => setScreen('forgot')} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">Forgot PIN?</button>}
  </>, shk)
}

export default LoginScreen
