import { useSession } from '@/store/SessionContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Session } from '@/types'

function statusBadge(session: Session) {
  if (session.evaluation) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Complete</Badge>
  return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">In Progress</Badge>
}

interface HomeScreenProps {
  onNew: () => void
  onLoad: (id: string) => void
}

export function HomeScreen({ onNew, onLoad }: HomeScreenProps) {
  const { repository } = useSession()
  const sessions = repository.list()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Interview Sessions</h1>
          <p className="text-sm text-slate-400 mt-1">Resume a past session or start a new one</p>
        </div>
        <Button onClick={onNew} className="bg-indigo-600 hover:bg-indigo-700">
          + New Interview
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 py-16 text-center">
          <p className="text-slate-400">No sessions yet.</p>
          <p className="text-sm text-slate-500 mt-1">Click "New Interview" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-100">
                    {session.candidateName || 'Unnamed Candidate'}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-sm text-slate-400">{session.role}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Last updated: {new Date(session.updatedAt).toLocaleDateString()} · Step{' '}
                  {session.currentStep} of 4
                </div>
              </div>
              <div className="flex items-center gap-3">
                {statusBadge(session)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLoad(session.id)}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  {session.evaluation ? 'View →' : 'Resume →'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
