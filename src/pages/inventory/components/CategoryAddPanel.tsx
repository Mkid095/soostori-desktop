import { Plus, Loader2 } from 'lucide-react'
import { FormField } from '../../../components/shared/FormField'
import { CATEGORY_COLORS } from '../constants'

interface CategoryAddPanelProps {
  name: string
  color: string
  addingCategory: boolean
  onNameChange: (v: string) => void
  onColorChange: (c: string) => void
  onAdd: () => void
  onCancel: () => void
}

export const CategoryAddPanel: React.FC<CategoryAddPanelProps> = ({
  name, color, addingCategory,
  onNameChange, onColorChange, onAdd, onCancel
}) => {
  return (
    <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border-color dark:border-slate-700">
      <FormField label="New Category Name">
        <input type="text" value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Category name"
          className="w-full bg-white dark:bg-slate-800 border border-border-color
            dark:border-slate-600 rounded-lg py-2 px-3 text-sm font-semibold
            text-text-primary dark:text-slate-100 outline-none
            focus:border-brand-orange focus:ring-2 focus:ring-orange-100
            dark:focus:ring-orange-900/30" />
      </FormField>
      <div className="flex gap-1.5 my-2 flex-wrap">
        {CATEGORY_COLORS.map(c => (
          <button key={c} type="button" onClick={() => onColorChange(c)}
            className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-slate-800 dark:border-slate-200 scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700
            dark:text-slate-200 rounded-lg font-bold text-xs hover:bg-slate-300
            dark:hover:bg-slate-600">
          Cancel
        </button>
        <button type="button" onClick={onAdd}
          disabled={!name.trim() || addingCategory}
          className="flex-1 py-2 bg-brand-orange text-white rounded-lg font-bold text-xs
            disabled:opacity-50 flex items-center justify-center gap-1
            hover:bg-orange-600">
          {addingCategory ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Add Category
        </button>
      </div>
    </div>
  )
}
