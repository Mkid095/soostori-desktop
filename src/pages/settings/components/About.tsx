import React, { useState, useEffect } from 'react'
import { Store } from 'lucide-react'

const About: React.FC = () => {
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
          <p className="text-sm text-slate-400">Point of Sale Desktop App</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-slate-50 rounded-xl">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Version</p>
          <p className="text-lg font-black text-slate-700 mt-1">{version || '1.0.0'}</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl">
          <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Platform</p>
          <p className="text-lg font-black text-slate-700 mt-1 capitalize">{platform}</p>
        </div>
      </div>

      <div className="p-4 bg-orange-50 rounded-xl">
        <p className="text-sm font-semibold text-brand-orange">
          Built with Electron + React
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Offline-first SQLite database
        </p>
      </div>

      <div className="text-xs text-slate-400 space-y-1">
        <p>© 2024 Soostori. All rights reserved.</p>
        <p>Powered by Soostori Technologies</p>
      </div>
    </div>
  )
}

export default About
