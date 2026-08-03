import React, { useState, useCallback } from 'react'
import { Shield, Delete } from 'lucide-react'

const ADMIN_KEY = '849562'
interface LoginScreenProps { onLogin: () => void }
type Screen = 'pin' | 'forgot' | 'reset'

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [s, setS] = useState<Screen>('pin')
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [att, setAtt] = useState(0)
  const [ak, setAk] = useState('')
  const [np, setNp] = useState('')
  const [cp, setCp] = useState('')
  const [re, setRe] = useState('')
  const [shk, setShk] = useState(false)

  const sh = () => { setShk(true); setTimeout(() => setShk(false), 500) }
  const doLogin = useCallback(async () => {
    await window.electronAPI.db.recordLogin()
    localStorage.setItem('lastLoginDate', new Date().toDateString())
    onLogin()
  }, [onLogin])
  const vp = useCallback(async (e: string) => {
    const { valid } = await window.electronAPI.db.verifyPin(e)
    if (valid) { await doLogin() }
    else { setAtt(a => a + 1); setPin(''); setErr(att + 1 >= 3 ? 'Too many attempts. Call admin.' : 'Wrong PIN. Try again.'); sh() }
  }, [att, doLogin])
  const num = (d: string) => {
    if (s === 'pin') {
      if (pin.length >= 4) return
      const n = pin + d; setPin(n); setErr('')
      if (n.length === 4) vp(n)
    } else if (s === 'reset') {
      if (cp.length === 4) return
      if (cp || np.length === 4) {
        const n = cp + d; setCp(n)
        if (n.length === 4) {
          if (np !== n) { setRe('PINs do not match'); setCp(''); sh(); return }
          window.electronAPI.db.setPin(np).then(() => { setS('pin'); setPin(''); setNp(''); setCp(''); setAtt(0); doLogin() })
        }
      } else if (np.length < 4) { setNp(n => n + d); setRe('') }
    }
  }
  const back = () => {
    if (s === 'pin') setPin(p => p.slice(0, -1))
    else if (s === 'reset') { if (cp) setCp(c => c.slice(0, -1)); else setNp(n => n.slice(0, -1)) }
  }
  const akd = (d: string) => { if (ak.length < 6) { const n = ak + d; setAk(n); if (n === ADMIN_KEY) { setS('reset'); setAk(''); setRe('') } } }
  const Dots = ({ c, n }: { c: number; n: number }) => (
    <div className="flex gap-4">{Array.from({ length: c }, (_, i) => (
      <div key={i} className={`w-4 h-4 rounded-full ${i < n ? 'bg-brand-orange' : 'bg-slate-300 dark:bg-slate-600'}`} />
    ))}</div>
  )
  const Btn = ({ on, ch }: { on: () => void; ch: React.ReactNode }) => (
    <button onClick={on} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all flex items-center justify-center">
      {ch}
    </button>
  )
  const Bks = ({ onD, onB }: { onD: (d: string) => void; onB: () => void }) => (
    <div className="grid grid-cols-3 gap-3 w-64">
      {([['1',0],['2',1],['3',2],['4',3],['5',4],['6',5],['7',6],['8',7],['9',8],['',9,'del',onB],['0',10],['',11]] as [string, number, string | undefined, (() => void) | undefined][]).map(([d,i,ic,on]) =>
        d ? <Btn key={i} on={() => onD(d)} ch={d} />
          : ic === 'del' && on ? <Btn key={i} on={on} ch={<Delete size={20} className="text-slate-500" />} />
            : <div key={i} />
      )}
    </div>
  )
  const overlay = (children: React.ReactNode, shake = false) => (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm ${shake ? 'animate-shake' : ''}`}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl w-full max-w-sm flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center"><Shield size={28} className="text-brand-orange" /></div>
        {children}
      </div>
    </div>
  )
  const Title = ({ t, p }: { t: string; p: string }) => <div className="text-center"><h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t}</h2><p className="text-sm text-slate-500 mt-1">{p}</p></div>

  if (s === 'forgot') return overlay(<>
    <Title t="Admin Verification" p="Enter 6-digit admin key" />
    <Dots c={6} n={ak.length} />
    <Bks onD={akd} onB={() => setAk(k => k.slice(0, -1))} />
    {ak.length > 0 && ak !== ADMIN_KEY && <p className="text-xs text-red-500">Invalid admin key</p>}
    <button onClick={() => { setS('pin'); setAk('') }} className="text-sm text-slate-400 hover:text-slate-600">Back to PIN</button>
  </>)

  if (s === 'reset') {
    const step = cp.length === 4 ? 'c' : np.length === 4 ? 'x' : 'n'
    return overlay(<>
      <Title t={step === 'c' ? 'Confirm New PIN' : 'Set New PIN'} p={step === 'c' ? 'Re-enter your PIN' : 'Enter a new 4-digit PIN'} />
      <Dots c={4} n={step === 'c' ? cp.length : np.length} />
      {re && <p className="text-xs text-red-500">{re}</p>}
      <Bks onD={num} onB={back} />
      <button onClick={() => { setS('pin'); setNp(''); setCp(''); setRe('') }} className="text-sm text-slate-400 hover:text-slate-600">Cancel</button>
    </>)
  }

  return overlay(<>
    <Title t="Enter PIN" p="Enter your 4-digit PIN to continue" />
    <Dots c={4} n={pin.length} />
    {err && <p className={`text-xs ${att >= 3 ? 'text-red-600 font-semibold' : 'text-red-500'}`}>{err}</p>}
    <Bks onD={num} onB={back} />
    {att < 3 && <button onClick={() => setS('forgot')} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">Forgot PIN?</button>}
  </>, shk)
}

export default LoginScreen
