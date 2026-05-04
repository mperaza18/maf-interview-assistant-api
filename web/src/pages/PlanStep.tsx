import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from '@/store/SessionContext'
import { generatePlan, revisePlan } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorBanner } from '@/components/ErrorBanner'

export function PlanStep() {
  const { state, dispatch } = useSession()
  const session = state.current
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [revising, setRevising] = useState(false)
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    if (!session?.plan && session?.profile && session?.seniority) {
      calledRef.current = true
      setLoading(true)
      generatePlan(session.profile, session.seniority, session.role)
        .then((plan) => dispatch({ type: 'SET_PLAN', plan }))
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to generate plan.'))
        .finally(() => setLoading(false))
    }
  }, [])

  if (!session) return null

  async function handleRevise() {
    if (!feedback.trim() || !session?.plan) return
    setRevising(true)
    setError(null)
    try {
      const revised = await revisePlan(session.plan, feedback)
      dispatch({ type: 'SET_PLAN', plan: revised })
      setFeedback('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revision failed. Please try again.')
    } finally {
      setRevising(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Interview Plan</h2>
          {session.plan && (
            <p className="text-sm text-slate-400 mt-0.5">{session.plan.summary}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}
          className="text-slate-400 hover:text-slate-200"
        >
          ← Back
        </Button>
      </div>

      {loading && <LoadingSpinner label="Generating interview plan..." />}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {session.plan && (
        <>
          <div className="space-y-3">
            {session.plan.rounds.map((round, i) => (
              <div key={i} className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-100">{round.name}</span>
                  <span className="text-xs text-slate-500">· {round.durationMinutes} min</span>
                </div>
                <ul className="space-y-1">
                  {round.questions.map((q, j) => (
                    <li key={j} className="text-sm text-slate-400 flex gap-2">
                      <span className="shrink-0 text-slate-600">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder='Revise plan, e.g. "more system design questions"'
              className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
              onKeyDown={(e) => e.key === 'Enter' && handleRevise()}
            />
            <Button
              onClick={handleRevise}
              disabled={!feedback.trim() || revising}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 shrink-0"
            >
              {revising ? 'Revising...' : 'Revise'}
            </Button>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => dispatch({ type: 'SET_STEP', step: 3 })}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Start Interview →
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
