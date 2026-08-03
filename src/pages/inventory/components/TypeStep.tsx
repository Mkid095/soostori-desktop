import { Layers, Box } from 'lucide-react'
import type { ProductFormMode } from '../hooks/useProductForm'

interface TypeStepProps {
  mode: ProductFormMode
  onModeChange: (mode: ProductFormMode) => void
}

export const TypeStep: React.FC<TypeStepProps> = ({ mode, onModeChange }) => {
  const types = [
    {
      value: 'loose' as const,
      label: 'Loose Item',
      labelSw: 'Bidhaa Moja',
      icon: Layers,
      desc: 'Single items sold individually',
      descSw: 'Single item (kawaida)',
      descSub: 'Units sold one by one',
    },
    {
      value: 'bulk' as const,
      label: 'Bulk / Box',
      labelSw: 'Box / Kijumbo',
      icon: Box,
      desc: 'Items sold in groups or boxes',
      descSw: 'Items sold as sets or boxes',
      descSub: 'Priced and sold as complete packages',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
          Product Type / Aina ya Bidhaa
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Is this a Single/Loose Item or a Box/Bulk Item?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {types.map(({ value, label, labelSw, icon: Icon, desc, descSw, descSub }) => (
          <button
            key={value}
            type="button"
            onClick={() => onModeChange(value)}
            className={`relative p-5 rounded-2xl border-2 transition-all text-left ${
              mode === value
                ? 'border-brand-orange bg-orange-50 dark:bg-orange-900/20 shadow-lg shadow-orange-200 dark:shadow-orange-900/30'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
              mode === value
                ? 'bg-brand-orange text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
            }`}>
              <Icon size={24} />
            </div>
            <p className={`font-bold text-base mb-0.5 ${
              mode === value ? 'text-brand-orange' : 'text-slate-700 dark:text-slate-200'
            }`}>
              {label}
            </p>
            <p className={`text-xs font-semibold mb-2 ${
              mode === value ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'
            }`}>
              {labelSw}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">{desc}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{descSw}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">{descSub}</p>

            {mode === value && (
              <div className="absolute top-3 right-3 w-5 h-5 bg-brand-orange rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
