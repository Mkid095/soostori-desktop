import type { Category } from '../../../lib/types'

interface CategoryChipsProps {
  categories: Category[]
  selected: string
  onSelect: (id: string) => void
}

export const CategoryChips: React.FC<CategoryChipsProps> = ({
  categories, selected, onSelect
}) => {
  return (
    <div className="px-4 py-1.5 bg-bg-secondary dark:bg-bg-secondary border-b border-slate-100 dark:border-slate-700 flex gap-1.5 overflow-x-auto shrink-0 transition-colors duration-200">
      <button onClick={() => onSelect('ALL')}
        className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${
          selected === 'ALL'
            ? 'bg-brand-orange text-white'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}>
        All
      </button>
      {categories.map((cat) => (
        <button key={cat.id} onClick={() => onSelect(cat.id)}
          className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-colors ${
            selected === cat.id ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
          style={selected === cat.id ? { backgroundColor: cat.color || '#F97316' } : {}}>
          {cat.name}
        </button>
      ))}
    </div>
  )
}
