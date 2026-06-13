import { useSession } from '@/store/SessionContext'
import { Stepper } from '@/components/Stepper'
import { HomeScreen } from '@/pages/HomeScreen'
import { AnalyzeStep } from '@/pages/AnalyzeStep'
import { PlanStep } from '@/pages/PlanStep'
import { SessionStep } from '@/pages/SessionStep'
import { EvaluationStep } from '@/pages/EvaluationStep'
import type { Session } from '@/types'

export function InterviewsPage() {
  const { state, dispatch, repository } = useSession()

  function handleNew() {
    const session: Session = {
      id: crypto.randomUUID(),
      candidateName: '',
      role: 'Software Engineer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 1,
      resumeText: '',
      notes: '',
      roundNotes: {},
    }
    dispatch({ type: 'CREATE_SESSION', session })
  }

  function handleLoad(id: string) {
    const session = repository.load(id)
    if (session) {
      dispatch({ type: 'LOAD_SESSION', session })
    }
  }

  if (!state.current) {
    return <HomeScreen onNew={handleNew} onLoad={handleLoad} />
  }

  const step = state.current.currentStep

  return (
    <div className="space-y-8">
      <Stepper
        currentStep={step}
        onStepClick={(s) => dispatch({ type: 'SET_STEP', step: s as 1 | 2 | 3 | 4 })}
      />
      <div>
        {step === 1 && <AnalyzeStep />}
        {step === 2 && <PlanStep />}
        {step === 3 && <SessionStep />}
        {step === 4 && <EvaluationStep onBackToHome={() => dispatch({ type: 'CLEAR_SESSION' })} />}
      </div>
    </div>
  )
}
