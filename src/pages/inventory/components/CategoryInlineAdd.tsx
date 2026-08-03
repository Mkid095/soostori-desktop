import { Check } from 'lucide-react'

interface CategoryInlineAddProps {
  name: string
  color: string
  addingCategory: boolean
  onNameChange: (v: string) => void
  onColorChange: (c: string) => void
  onAdd: () => void
  onCancel: () => void
}

const PRESET_COLORS = [
  { value: '#F97316', label: 'Orange' },
  { value: '#22C55E', label: 'Green' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#A855F7', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#06B6D4', label: 'Cyan' },
]

export const CategoryInlineAdd: React.FC<CategoryInlineAddProps> = ({
  name, color, addingCategory,
  onNameChange, onColorChange, onAdd, onCancel,
}) => {
  return (
    <div className="mt-2.5 rounded-xl border border-border-color dark:border-slate-600 overflow-hidden bg-slate-50 dark:bg-slate-700/30">
      {/* Panel header */}
      <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700/50 border-b border-border-color dark:border-slate-600 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400">
          New Category
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-bold transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Panel body */}
      <div className="p-3 space-y-3">
        {/* Name input */}
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Category name..."
          autoFocus
          className="w-full bg-white dark:bg-slate-800 border border-border-color
            dark:border-slate-600 rounded-lg py-2.5 px-3 text-sm font-semibold
            text-text-primary dark:text-slate-100 placeholder-slate-400
            focus:border-brand-orange focus:ring-2 focus:ring-orange-100
            dark:focus:ring-orange-900/30 outline-none"
        />

        {/* Color picker */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-400 mb-2">
            Color
          </p>
          <div className="flex gap-2">
            {PRESET_COLORS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                title={label}
                onClick={() => onColorChange(value)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                style={{ backgroundColor: value }}
              >
                {color === value && (
                  <Check size={13} className="text-white font-bold drop-shadow-sm" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onAdd}
            disabled={!name.trim() || addingCategory}
            className="flex-1 py-2.5 bg-brand-orange text-white rounded-xl text-sm font-bold
              hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors shadow-sm shadow-orange-200/60 dark:shadow-orange-900/20"
          >
            {addingCategory ? 'Adding...' : 'Add Category'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold
              text-slate-500 dark:text-slate-400 hover:bg-slate-200
              dark:hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
