import React from 'react'
import { X } from 'lucide-react'

interface SettingsModalProps {
  title: string
  subtitle?: string
  icon: React.ReactNode
  onClose: () => void
  children: React.ReactNode
}

const SettingsModal: React.FC<SettingsModalProps> = ({ title, subtitle, icon, onClose, children }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
    <div className="bg-white dark:bg-bg-secondary w-full max-w-md rounded-2xl shadow-xl max-h-[85vh] flex flex-col animate-scale-in transition-colors duration-200">
      <div className="shrink-0 px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-orange flex items-center justify-center text-white">
            {icon}
          </div>
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <X size={20} className="text-slate-400 dark:text-slate-500" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>
    </div>
  </div>
)

export default SettingsModal
