import React, { useState, useEffect } from 'react'
import { Store } from 'lucide-react'
import { useTranslation } from '../../../lib/useTranslation'

const About: React.FC = () => {
  const { t } = useTranslation()
  const [version, setVersion] = useState('')
  const platform = window.electronAPI.app.getPlatform()

  useEffect(() => {
    window.electronAPI.app.getVersion().then(setVersion)
  }, [])

  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-20 h-20 bg-brand-orange rounded-3xl flex items-center justify-center shadow-lg shadow-orange-200">
          <Store size={40} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800">Soostori POS</h2>
          <p className="text-sm text-slate-400">{t('set.posDesktopApp')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-slate-50 rounded-xl">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">{t('set.version')}</p>
          <p className="text-lg font-black text-slate-700 mt-1">{version || '1.0.0'}</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">{t('set.platform')}</p>
          <p className="text-lg font-black text-slate-700 mt-1 capitalize">{platform}</p>
        </div>
      </div>

      <div className="p-4 bg-orange-50 rounded-xl">
        <p className="text-sm font-semibold text-brand-orange">
          {t('set.builtWithElectron')}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {t('set.offlineFirstSQLite')}
        </p>
      </div>

      <div className="text-xs text-slate-400 space-y-1">
        <p>{t('set.copyrightSoostori')}</p>
        <p>{t('set.poweredBySoostori')}</p>
      </div>
    </div>
  )
}

export default About
