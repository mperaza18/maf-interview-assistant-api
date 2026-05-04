import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/store/SessionContext'
import { evaluate } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorBanner } from '@/components/ErrorBanner'

function recommendationColor(rec: string): string {
  const lower = rec.toLowerCase()
  if (lower.includes('no hire') || lower.includes('reject')) return 'text-red-400'
  if (lower.includes('strong hire') || lower.includes('hire')) return 'text-emerald-400'
  return 'text-amber-400'
}

interface EvaluationStepProps {
  onBackToHome: () => void
}

export function EvaluationStep({ onBackToHome }: EvaluationStepProps) {
  const { state, dispatch } = useSession()
  const session = state.current
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    if (!session?.evaluation && session?.profile && session?.plan) {
      calledRef.current = true
      setLoading(true)
      evaluate(session.profile, session.plan, session.notes)
        .then((evaluation) => dispatch({ type: 'SET_EVALUATION', evaluation }))
        .catch((err) => setError(err instanceof Error ? err.message : 'Evaluation failed.'))
        .finally(() => setLoading(false))
    }
  }, [])

  if (!session) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Evaluation Results</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'SET_STEP', step: 3 })}
          className="text-slate-400 hover:text-slate-200"
        >
          ← Back
        </Button>
      </div>

      {loading && <LoadingSpinner label="Evaluating candidate..." />}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {session.evaluation && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-center">
              <div className="text-4xl font-extrabold text-indigo-400">
                {session.evaluation.overallScore}
              </div>
              <div className="text-xs text-slate-400 mt-1">Overall Score</div>
            </div>
            <div className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-1">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Recommendation
              </div>
              <div className={`text-xl font-bold ${recommendationColor(session.evaluation.recommendation)}`}>
                {session.evaluation.recommendation}
              </div>
              <p className="text-sm text-slate-400">{session.evaluation.summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-400">
                ✓ Strengths
              </div>
              <ul className="space-y-1">
                {session.evaluation.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="shrink-0 text-emerald-600">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-amber-400">
                ⚠ Risks
              </div>
              <ul className="space-y-1">
                {session.evaluation.risks.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="shrink-0 text-amber-600">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {session.evaluation.followUps.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Follow-up Questions
              </div>
              <ul className="space-y-1">
                {session.evaluation.followUps.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="shrink-0 text-slate-600">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={onBackToHome}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              ← Back to Sessions
            </Button>
            <Button onClick={onBackToHome} className="bg-indigo-600 hover:bg-indigo-700">
              + New Interview
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
