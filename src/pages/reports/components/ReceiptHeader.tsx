import React from 'react'
import { CreditCard, Printer, X } from 'lucide-react'

interface ReceiptHeaderProps {
  date: string
  title: string
  printTitle: string
  onPrint: () => void
  onClose: () => void
}

export const ReceiptHeader: React.FC<ReceiptHeaderProps> = ({ date, title, printTitle, onPrint, onClose }) => (
  <div className="shrink-0 px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-brand-orange flex items-center justify-center text-white">
        <CreditCard size={18} />
      </div>
      <div>
        <h2 className="font-bold text-slate-800 dark:text-slate-100">{title}</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">{date}</p>
      </div>
    </div>
    <button onClick={onPrint} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors" title={printTitle}>
      <Printer size={20} className="text-slate-400 dark:text-slate-500" />
    </button>
    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
      <X size={20} className="text-slate-400 dark:text-slate-500" />
    </button>
  </div>
)

export default ReceiptHeader