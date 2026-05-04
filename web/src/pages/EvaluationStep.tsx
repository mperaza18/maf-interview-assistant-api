interface EvaluationStepProps {
  onBackToHome: () => void
}
export function EvaluationStep({ onBackToHome }: EvaluationStepProps) {
  return <div className="text-slate-400" onClick={onBackToHome}>EvaluationStep — coming in Task 12</div>
}
