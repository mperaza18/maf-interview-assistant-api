import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useSession } from '@/store/SessionContext'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
import type { Session } from '@/types'

function statusBadge(session: Session) {
  if (session.evaluation)
    return <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">Complete</span>
  return <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">In Progress</span>
}

interface HomeScreenProps {
  onNew: () => void
  onLoad: (id: string) => void
  onNewJdMatch: () => void
}

export function HomeScreen({ onNew, onLoad, onNewJdMatch }: HomeScreenProps) {
  const { dispatch, repository } = useSession()
  const [sessions, setSessions] = useState(() => repository.list())
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const pendingSession = sessions.find(s => s.id === pendingDeleteId) ?? null

  function handleDelete(id: string) {
    repository.delete(id)
    setSessions(prev => prev.filter(s => s.id !== id))
    dispatch({ type: 'DELETE_SESSION', id })
    setPendingDeleteId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Interview Sessions</h1>
          <p className="text-sm text-muted-foreground mt-1">Resume a past session or start a new one</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onNewJdMatch}
            className="border-indigo-500/40 text-indigo-400 hover:text-indigo-300"
          >
            + New JD Match
          </Button>
          <Button onClick={onNew} className="bg-indigo-600 hover:bg-indigo-700">
            + New Interview
          </Button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/50 py-16 text-center">
          <p className="text-muted-foreground">No sessions yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Start a new interview or JD match to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="group flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="truncate font-medium text-foreground">
                    {session.candidateName || 'Unnamed Candidate'}
                  </span>
                  <span className="shrink-0 text-muted-foreground">·</span>
                  <span className="shrink-0 text-sm text-muted-foreground">{session.role}</span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  Last updated: {new Date(session.updatedAt).toLocaleDateString()} · Step{' '}
                  {session.currentStep} of 4
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  aria-label="Delete session"
                  onClick={(e) => { e.stopPropagation(); setPendingDeleteId(session.id) }}
                  className="flex items-center justify-center rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={16} />
                </button>
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

      <ConfirmDeleteDialog
        open={pendingDeleteId !== null}
        candidateName={pendingSession?.candidateName}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => handleDelete(pendingDeleteId!)}
      />
    </div>
  )
}
