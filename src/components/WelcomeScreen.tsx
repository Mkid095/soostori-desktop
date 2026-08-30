import React, { useState } from 'react'
import { Cloud, Users, Smartphone } from 'lucide-react'
import { useTranslation } from '../lib/useTranslation'

interface WelcomeScreenProps {
  onLoginWithAccount: () => void
  onJoinShop: () => void
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLoginWithAccount, onJoinShop }) => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      // Cloud authentication will be implemented when cloud sync contract is ready
      // For now, show that this requires internet
      await new Promise(resolve => setTimeout(resolve, 500))
      onLoginWithAccount()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-sm px-6 flex flex-col items-center gap-8">

        {/* Logo mark */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-brand-orange flex items-center justify-center shadow-lg shadow-orange-500/30">
            <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">Soostori POS</h1>
            <p className="text-slate-400 text-sm mt-0.5">Multi-terminal point of sale</p>
          </div>
        </div>

        {/* Production notice */}
        <div className="w-full bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-slate-300 text-sm leading-relaxed">
            Production installations require an online account.
            Your shop data is synced to the cloud and accessible from any device.
          </p>
        </div>

        {/* Action buttons */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-brand-orange text-white font-semibold hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Cloud size={20} />
            {loading ? 'Connecting...' : 'Login with Online Account'}
          </button>

          <button
            onClick={onJoinShop}
            disabled={loading}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-slate-700 text-slate-100 font-semibold hover:bg-slate-600 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Users size={20} />
            Join Existing Shop
          </button>
        </div>

        {/* Offline notice */}
        <p className="text-slate-500 text-xs text-center">
          An internet connection is required for first-time setup.
          <br />After provisioning, the app works fully offline.
        </p>

      </div>
    </div>
  )
}

export default WelcomeScreen
