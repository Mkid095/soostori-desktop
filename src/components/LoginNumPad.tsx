import React from 'react'
import { Delete } from 'lucide-react'

interface LoginNumPadProps {
  onDigit: (d: string) => void
  onBack: () => void
  disabled?: boolean
}

export const LoginNumPad: React.FC<LoginNumPadProps> = ({ onDigit, onBack, disabled }) => {
  const Btn = ({ on, ch }: { on: () => void; ch: React.ReactNode }) => (
    <button
      onClick={on}
      disabled={disabled}
      className="h-14 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
    >
      {ch}
    </button>
  )

  return (
    <div className="grid grid-cols-3 gap-3 w-64">
      {([['1', 0], ['2', 1], ['3', 2], ['4', 3], ['5', 4], ['6', 5], ['7', 6], ['8', 7], ['9', 8], ['', 9, 'del', onBack], ['0', 10], ['', 11]] as [string, number, string | undefined, (() => void) | undefined][]).map(([d, i, ic, on]) =>
        d ? <Btn key={i} on={() => onDigit(d)} ch={d} />
          : ic === 'del' && on ? <Btn key={i} on={on} ch={<Delete size={20} className="text-slate-500" />} />
            : <div key={i} />
      )}
    </div>
  )
}
