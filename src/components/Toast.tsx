import React, { useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface ToastProps {
  id: string
  message: string
  variant: ToastVariant
  onDismiss: (id: string) => void
}

const variantConfig = {
  success: {
    icon: CheckCircle,
    classes: 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-100',
    iconClasses: 'text-emerald-500 dark:text-emerald-400',
  },
  error: {
    icon: XCircle,
    classes: 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-800 dark:text-red-100',
    iconClasses: 'text-red-500 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-100',
    iconClasses: 'text-amber-500 dark:text-amber-400',
  },
  info: {
    icon: Info,
    classes: 'bg-blue-50 dark:bg-blue-950/80 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-100',
    iconClasses: 'text-blue-500 dark:text-blue-400',
  },
}

const Toast: React.FC<ToastProps> = ({ id, message, variant, onDismiss }) => {
  const config = variantConfig[variant]
  const Icon = config.icon

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 4000)
    return () => clearTimeout(timer)
  }, [id, onDismiss])

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${config.classes} animate-slide-up`}>
      <Icon size={18} className={config.iconClasses} />
      <span className="text-sm font-medium flex-1">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export default Toast
