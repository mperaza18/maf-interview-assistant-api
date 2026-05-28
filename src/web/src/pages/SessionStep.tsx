import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useSession } from '@/store/SessionContext'

export function SessionStep() {
  const { state, dispatch } = useSession()
  const session = state.current
  const [activeTab, setActiveTab] = useState(0)

  if (!session || !session.plan) return null

  const rounds = session.plan.rounds
  const round = rounds[activeTab]
  const roundNotes = session.roundNotes ?? {}

  if (!rounds.length || !round) return null

  function handleComplete() {
    const condensed = rounds
      .filter((r) => roundNotes[r.name]?.trim())
      .map((r) => `[${r.name}]\n${roundNotes[r.name].trim()}`)
      .join('\n\n')
    dispatch({ type: 'SET_NOTES', notes: condensed })
    dispatch({ type: 'SET_STEP', step: 4 })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Live Interview Session</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Use the questions below as a guide. Capture your notes as the interview progresses.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}
          className="text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Button>
      </div>

      <div className="flex border-b border-border" role="tablist">
        {rounds.map((r, i) => (
          <button
            key={r.name}
            type="button"
            role="tab"
            aria-selected={i === activeTab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              i === activeTab
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-indigo-400">{round.name}</span>
          <span className="text-xs text-muted-foreground">· {round.durationMinutes} min</span>
        </div>

        <div className="space-y-1">
          {round.questions.map((q, j) => (
            <div key={j} className="flex gap-2 text-sm text-muted-foreground">
              <span className="shrink-0 text-muted-foreground/60">•</span>
              <span>{q}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
          <Textarea
            value={roundNotes[round.name] ?? ''}
            onChange={(e) =>
              dispatch({ type: 'SET_ROUND_NOTE', roundName: round.name, note: e.target.value })
            }
            placeholder={`Capture your observations for ${round.name}...`}
            className="h-40 resize-none border-border bg-background text-foreground placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">Notes are saved automatically.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleComplete} className="bg-indigo-600 hover:bg-indigo-700">
          Complete Interview →
        </Button>
      </div>
    </div>
  )
}
