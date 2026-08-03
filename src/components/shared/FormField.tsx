import React from 'react'

interface FormFieldProps {
  label?: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: React.ReactNode
}

export const FormField: React.FC<FormFieldProps> = ({
  label, required, error, hint, className = '', children
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-500 font-semibold">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-[10px] text-text-muted dark:text-slate-500">{hint}</p>
      )}
    </div>
  )
}
