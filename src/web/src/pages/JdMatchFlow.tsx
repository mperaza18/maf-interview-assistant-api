import { Stepper } from '@/components/Stepper'
import { JdUploadStep } from '@/components/JdUploadStep'
import { JdAnalysisPanel } from '@/components/JdAnalysisPanel'
import { useJdMatch } from '@/store/JdMatchContext'

const JD_STEPS: Array<[number, string]> = [
  [1, 'Upload JD'],
  [2, 'Analyze'],
  [3, 'Match Candidates'],
]

export function JdMatchFlow() {
  const { state } = useJdMatch()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New JD Match</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a job description PDF — SmartFitter parses it, scores it, and ranks your candidates.
        </p>
      </div>
      <Stepper currentStep={state.currentStep} steps={JD_STEPS} />
      {state.currentStep === 1 && <JdUploadStep />}
      {state.currentStep === 2 && <JdAnalysisPanel />}
    </div>
  )
}
