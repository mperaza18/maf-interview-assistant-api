import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useSession } from '@/store/SessionContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDeleteDialog } from '@/components/ui/ConfirmDeleteDialog'
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
        <Button onClick={onNew} className="bg-indigo-600 hover:bg-indigo-700">
          + New Interview
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/50 py-16 text-center">
          <p className="text-muted-foreground">No sessions yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Click "New Interview" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {session.candidateName || 'Unnamed Candidate'}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-sm text-muted-foreground">{session.role}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last updated: {new Date(session.updatedAt).toLocaleDateString()} · Step{' '}
                  {session.currentStep} of 4
                </div>
              </div>
              <div className="flex items-center gap-2">
                {statusBadge(session)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLoad(session.id)}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  {session.evaluation ? 'View →' : 'Resume →'}
                </Button>
                <button
                  aria-label="Delete session"
                  onClick={(e) => { e.stopPropagation(); setPendingDeleteId(session.id) }}
                  className="rounded p-1 text-muted-foreground opacity-100 transition-opacity hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
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
