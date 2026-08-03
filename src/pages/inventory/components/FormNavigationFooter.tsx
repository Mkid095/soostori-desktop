import { ChevronLeft, ChevronRight, Save, RefreshCw } from 'lucide-react'

interface FormNavigationFooterProps {
  step: number
  totalSteps: number
  isSaving: boolean
  isValid: boolean
  isEditing: boolean
  canGoNext: boolean
  onBack: () => void
  onCancel: () => void
  onNext: () => void
}

export const FormNavigationFooter: React.FC<FormNavigationFooterProps> = ({
  step, totalSteps, isSaving, isValid, isEditing, canGoNext, onBack, onCancel, onNext,
}) => {
  const isLastStep = step === totalSteps - 1

  return (
    <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
      {step > 0 ? (
        <button type="button" onClick={onBack}
          className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full font-bold
            hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2">
          <ChevronLeft size={16} />
          Back
        </button>
      ) : (
        <button type="button" onClick={onCancel}
          className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full font-bold
            hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
          Cancel
        </button>
      )}
      {isLastStep ? (
        <button type="submit" disabled={isSaving || !isValid}
          className="flex-1 py-4 bg-brand-orange text-white rounded-full font-bold
            hover:bg-orange-600 disabled:opacity-50 transition-colors
            flex items-center justify-center gap-2 shadow-lg shadow-orange-200 dark:shadow-orange-900/30">
          {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          {isSaving ? 'Saving...' : isEditing ? 'Update Product' : 'Register Product'}
        </button>
      ) : (
        <button type="button" onClick={onNext} disabled={!canGoNext}
          className="flex-1 py-4 bg-brand-orange text-white rounded-full font-bold
            hover:bg-orange-600 disabled:opacity-50 transition-colors
            flex items-center justify-center gap-2 shadow-lg shadow-orange-200 dark:shadow-orange-900/30">
          Next
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  )
}
