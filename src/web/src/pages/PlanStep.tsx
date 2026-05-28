import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from '@/store/SessionContext'
import { generatePlan, revisePlan } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorBanner } from '@/components/ErrorBanner'
import { CandidateChips } from '@/components/ui/CandidateChips'

function resolveCategory(name: string): { color: string; icon: string } {
  const n = name.toLowerCase()
  if (/experience|background|behavioral/.test(n)) return { color: '#6c47ff', icon: '◎' }
  if (/system|design|architecture/.test(n)) return { color: '#14abab', icon: '⬡' }
  if (/values|culture|fit/.test(n)) return { color: '#e9ad1c', icon: '◇' }
  return { color: '#22c467', icon: '●' }
}

export function PlanStep() {
  const { state, dispatch } = useSession()
  const session = state.current
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [revising, setRevising] = useState(false)
  const calledRef = useRef(false)
  const roundsRef = useRef<HTMLDivElement>(null)

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
      roundsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revision failed. Please try again.')
    } finally {
      setRevising(false)
    }
  }

  const totalMinutes = session.plan?.rounds.reduce((sum, r) => sum + r.durationMinutes, 0) ?? 0
  const totalQuestions = session.plan?.rounds.reduce((sum, r) => sum + r.questions.length, 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Interview Plan</h2>
            {session.plan && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground/80">
                {totalMinutes} min total
              </span>
            )}
          </div>
          {session.plan && session.profile && (
            <CandidateChips
              role={session.role}
              yearsExperience={session.profile.yearsExperience}
              topSkills={session.profile.coreSkills}
            />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}
          className="text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Button>
      </div>

      {loading && <LoadingSpinner label="Generating interview plan..." />}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {session.plan && (
        <>
          {/* Metadata card */}
          <div className="rounded-xl border border-border bg-card/80 px-6 py-4 flex items-center gap-0">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Target Role</p>
              <p className="text-[15px] font-semibold text-white mt-1 truncate">{session.role}</p>
            </div>
            <div className="w-px h-12 bg-border mx-6 shrink-0" />
            <div className="shrink-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Difficulty</p>
              <span className="mt-1 inline-block bg-amber-900/50 text-amber-400 text-xs font-semibold px-3 py-1 rounded-md">
                {session.plan.level}
              </span>
            </div>
            <div className="w-px h-12 bg-border mx-6 shrink-0" />
            <div className="shrink-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Questions</p>
              <p className="text-[15px] font-semibold text-white mt-1">{totalQuestions} questions</p>
            </div>
          </div>

          {/* Section cards — one per round with left-border accent */}
          <div ref={roundsRef} className="space-y-3">
            {session.plan.rounds.map((round, i) => {
              const { color, icon } = resolveCategory(round.name)
              return (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card/80 p-5 border-l-[3px]"
                  style={{ borderLeftColor: color }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm" style={{ color }}>{icon}</span>
                    <span className="text-sm font-semibold" style={{ color }}>{round.name}</span>
                    <span className="text-xs text-muted-foreground">({round.durationMinutes} min)</span>
                  </div>
                  <ol className="space-y-2">
                    {round.questions.map((q, j) => (
                      <li key={j} className="flex gap-3 text-sm">
                        <span className="shrink-0 text-muted-foreground/60 w-4">{j + 1}.</span>
                        <span className="text-muted-foreground">{q}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )
            })}
          </div>

          {/* Revise bar */}
          <div className="rounded-lg border border-indigo-500/40 bg-gradient-to-br from-indigo-950/60 to-card/80 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">✦ Revise Plan</p>
            <div className="flex gap-2">
              <Input
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder='Revise plan, e.g. "add more system design questions"'
                className="border-border bg-card text-foreground placeholder:text-muted-foreground"
                onKeyDown={(e) => e.key === 'Enter' && handleRevise()}
              />
              <Button
                onClick={handleRevise}
                disabled={!feedback.trim() || revising}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
              >
                {revising ? 'Revising...' : 'Revise'}
              </Button>
            </div>
          </div>

          {/* Bottom CTAs */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              className="border-border text-muted-foreground hover:bg-card hover:text-foreground"
              disabled
            >
              Edit Questions
            </Button>
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
