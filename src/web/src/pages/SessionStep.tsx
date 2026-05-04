import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useSession } from '@/store/SessionContext'

export function SessionStep() {
  const { state, dispatch } = useSession()
  const session = state.current

  if (!session) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Live Interview Session</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Use the questions below as a guide. Capture your notes as the interview progresses.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}
          className="text-slate-400 hover:text-slate-200"
        >
          ← Back
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Interview Questions
          </h3>
          {session.plan?.rounds.map((round, i) => (
            <div key={i} className="rounded-lg border border-slate-700 bg-slate-800 p-3 space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-indigo-400">{round.name}</span>
                <span className="text-xs text-slate-500">· {round.durationMinutes} min</span>
              </div>
              {round.questions.map((q, j) => (
                <div key={j} className="flex gap-2 text-sm text-slate-400">
                  <span className="shrink-0 text-slate-600">•</span>
                  <span>{q}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Interviewer Notes
          </h3>
          <Textarea
            value={session.notes}
            onChange={(e) => dispatch({ type: 'SET_NOTES', notes: e.target.value })}
            placeholder="Type your observations and notes here as the interview progresses..."
            className="h-64 resize-none border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500">Notes are saved automatically.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => dispatch({ type: 'SET_STEP', step: 4 })}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          Complete Interview →
        </Button>
      </div>
    </div>
  )
}
