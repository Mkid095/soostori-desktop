interface Step {
  number: number
  label: string
  labelSw: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <div className="px-5 pt-4">
      {/* Progress bar */}
      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-brand-orange transition-all duration-300 ease-out rounded-full"
          style={{ width: `${((currentStep) / (steps.length - 1)) * 100}%` }}
        />
      </div>

      {/* Step labels */}
      <div className="flex justify-between">
        {steps.map((step) => {
          const isCompleted = step.number < currentStep
          const isCurrent = step.number === currentStep

          return (
            <div
              key={step.number}
              className={`flex flex-col items-center ${
                step.number === 0 || step.number === steps.length - 1 ? '-ml-4' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isCompleted
                    ? 'bg-brand-orange text-white'
                    : isCurrent
                      ? 'bg-brand-orange text-white ring-4 ring-orange-100 dark:ring-orange-900/30'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <div className="mt-2 text-center hidden sm:block">
                <p className={`text-[10px] font-bold ${isCurrent ? 'text-brand-orange' : 'text-slate-400 dark:text-slate-500'}`}>
                  {step.label}
                </p>
                <p className="text-[9px] text-slate-300 dark:text-slate-600">
                  {step.labelSw}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
