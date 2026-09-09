import React from 'react'
import { usePrimaryStatus } from '../hooks/usePrimaryStatus'

const variantClasses = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  muted: 'bg-slate-50 text-slate-500 border-slate-200',
}

const dotClasses = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  muted: 'bg-slate-400',
}

/** Compact Primary Device authority status badge for the header. */
const PrimaryStatusIndicator: React.FC = () => {
  const { data } = usePrimaryStatus()

  if (!data) return null

  return (
    <div
      title={`Primary Device: ${data.label} — ${data.canMutate ? 'Stock operations allowed' : 'Stock operations blocked'}`}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${variantClasses[data.variant]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClasses[data.variant]} ${data.variant === 'warning' ? 'animate-pulse' : ''}`} />
      <span>{data.label}</span>
    </div>
  )
}

export default PrimaryStatusIndicator
