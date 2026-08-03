import { Plus, Loader2, X } from 'lucide-react'

interface CategoryInlineAddProps {
  name: string
  color: string
  addingCategory: boolean
  onNameChange: (v: string) => void
  onColorChange: (c: string) => void
  onAdd: () => void
  onCancel: () => void
}

// 6 preset colors matching CATEGORY_COLORS
const PRESET_COLORS = [
  '#F97316', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#06B6D4',
]

export const CategoryInlineAdd: React.FC<CategoryInlineAddProps> = ({
  name, color, addingCategory,
  onNameChange, onColorChange, onAdd, onCancel,
}) => {
  return (
    <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border-color dark:border-slate-700">
      <div className="flex items-center gap-2 mb-2">
        {/* Color dot picker */}
        <div className="flex gap-1.5 shrink-0">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => onColorChange(c)}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${
                color === c ? 'border-slate-800 dark:border-slate-200 scale-125' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        {/* Name input */}
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Category name"
          className="flex-1 bg-white dark:bg-slate-800 border border-border-color
            dark:border-slate-600 rounded-lg py-1.5 px-2.5 text-sm font-semibold
            text-text-primary dark:text-slate-100 outline-none
            focus:border-brand-orange focus:ring-2 focus:ring-orange-100
            dark:focus:ring-orange-900/30"
        />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700
            dark:text-slate-200 rounded-lg font-bold text-xs hover:bg-slate-300
            dark:hover:bg-slate-600 flex items-center justify-center gap-1">
          <X size={12} /> Cancel
        </button>
        <button type="button" onClick={onAdd}
          disabled={!name.trim() || addingCategory}
          className="flex-1 py-1.5 bg-brand-orange text-white rounded-lg font-bold text-xs
            disabled:opacity-50 flex items-center justify-center gap-1 hover:bg-orange-600">
          {addingCategory ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Save
        </button>
      </div>
    </div>
  )
}
