import { Navigate, useNavigate } from 'react-router-dom'
import { useSession } from '@/store/SessionContext'
import { Stepper } from '@/components/Stepper'
import { AnalyzeStep } from '@/pages/AnalyzeStep'
import { PlanStep } from '@/pages/PlanStep'
import { SessionStep } from '@/pages/SessionStep'
import { EvaluationStep } from '@/pages/EvaluationStep'

export function InterviewsPage() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()

  if (!state.current) {
    return <Navigate to="/dashboard" replace />
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
        {step === 4 && <EvaluationStep onBackToHome={() => navigate('/dashboard')} />}
      </div>
    </div>
  )
}
