import React from 'react'

interface InputFieldProps {
  label: string
  name?: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  placeholder?: string
  required?: boolean
  min?: number
  rows?: number
  options?: { value: string; label: string }[]
  className?: string
  fullWidth?: boolean
}

const InputField: React.FC<InputFieldProps> = ({
  label, name, type = 'text', value, onChange, placeholder, required, min, rows, options, className = '', fullWidth = false,
}) => {
  const baseClass = `w-full bg-white border border-slate-200 rounded-xl py-3 px-4 font-semibold text-slate-700 focus:border-brand-orange outline-none ${className}`
  const wrapperClass = fullWidth ? 'sm:col-span-2' : ''
  return (
    <div className={wrapperClass}>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
      {options ? (
        <select name={name} value={value} onChange={onChange} className={baseClass}>
          {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      ) : rows ? (
        <textarea name={name} value={value} onChange={onChange} rows={rows} className={`${baseClass} resize-none`} placeholder={placeholder} />
      ) : (
        <input name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} min={min} className={baseClass} />
      )}
    </div>
  )
}

export default InputField
