import { cn } from '@/lib/utils'

const STEPS: [1 | 2 | 3 | 4, string][] = [
  [1, 'Resume Analysis'],
  [2, 'Interview Plan'],
  [3, 'Live Session'],
  [4, 'Evaluation'],
]

interface StepperProps {
  currentStep: 1 | 2 | 3 | 4
  onStepClick?: (step: 1 | 2 | 3 | 4) => void
}

export function Stepper({ currentStep, onStepClick }: StepperProps) {
  const circleBase = 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors'

  return (
    <div className="flex items-center">
      {STEPS.map(([step, label], i) => {
        const isCompleted = step < currentStep
        const isActive = step === currentStep
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              {isCompleted && onStepClick ? (
                <button
                  aria-label={`Go to step ${step}`}
                  onClick={() => onStepClick(step)}
                  className={cn(
                    circleBase,
                    'bg-indigo-500 text-white',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                  )}
                >
                  ✓
                </button>
              ) : (
                <div
                  className={cn(
                    circleBase,
                    isCompleted && 'bg-indigo-500 text-white',
                    isActive && 'bg-indigo-500 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950',
                    !isCompleted && !isActive && 'bg-slate-700 text-slate-400',
                  )}
                >
                  {isCompleted ? '✓' : step}
                </div>
              )}
              <span
                className={cn(
                  'text-xs hidden sm:block whitespace-nowrap',
                  isActive
                    ? 'text-slate-100 font-semibold'
                    : isCompleted
                      ? 'text-indigo-400 font-semibold'
                      : 'text-slate-500',
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-12 md:w-20 mx-2 mb-4 transition-colors',
                  step < currentStep ? 'bg-indigo-500' : 'bg-slate-700',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
