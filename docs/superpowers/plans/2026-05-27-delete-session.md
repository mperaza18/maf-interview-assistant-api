# Delete Session Functionality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a trash icon button to each session card on the HomeScreen that opens a confirmation dialog before permanently deleting the session from state and localStorage.

**Architecture:** `DELETE_SESSION` action added to the session reducer handles clearing the active session if the deleted id matches. `HomeScreen` owns local sessions state for optimistic UI updates, calls `repository.delete()` directly, and dispatches `DELETE_SESSION`. A new `ConfirmDeleteDialog` component built on Base UI's Dialog handles accessible focus trapping, Escape key, and theme tokens.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, `@base-ui/react/dialog`, `lucide-react`

---

## File Map

| Action | File |
|---|---|
| Modify | `src/web/src/store/sessionReducer.ts` |
| Create | `src/web/src/components/ui/ConfirmDeleteDialog.tsx` |
| Modify | `src/web/src/pages/HomeScreen.tsx` |

---

## Task 1: Add DELETE_SESSION to the session reducer

**Files:**
- Modify: `src/web/src/store/sessionReducer.ts`

- [ ] **Step 1: Replace the full contents of `sessionReducer.ts`**

The only changes are: add `| { type: 'DELETE_SESSION'; id: string }` to the `SessionAction` union, and add its `case` before `default`.

```ts
import type { EvaluationResult, InterviewPlan, ResumeProfile, SeniorityAssessment, Session } from '../types'

export type SessionAction =
  | { type: 'CREATE_SESSION'; session: Session }
  | { type: 'LOAD_SESSION'; session: Session }
  | { type: 'SET_PROFILE'; profile: ResumeProfile; seniority: SeniorityAssessment }
  | { type: 'SET_PLAN'; plan: InterviewPlan }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'SET_ROUND_NOTE'; roundName: string; note: string }
  | { type: 'SET_EVALUATION'; evaluation: EvaluationResult }
  | { type: 'SET_STEP'; step: 1 | 2 | 3 | 4 }
  | { type: 'CLEAR_SESSION' }
  | { type: 'DELETE_SESSION'; id: string }

export interface SessionState {
  current: Session | null
}

export const initialState: SessionState = { current: null }

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'CREATE_SESSION':
    case 'LOAD_SESSION':
      return { current: action.session }

    case 'SET_PROFILE':
      if (!state.current) return state
      return {
        current: {
          ...state.current,
          profile: action.profile,
          seniority: action.seniority,
          candidateName: action.profile.candidateName,
        },
      }

    case 'SET_PLAN':
      if (!state.current) return state
      return { current: { ...state.current, plan: action.plan } }

    case 'SET_NOTES':
      if (!state.current) return state
      return { current: { ...state.current, notes: action.notes } }

    case 'SET_ROUND_NOTE':
      if (!state.current) return state
      return {
        current: {
          ...state.current,
          roundNotes: { ...state.current.roundNotes, [action.roundName]: action.note },
        },
      }

    case 'SET_EVALUATION':
      if (!state.current) return state
      return { current: { ...state.current, evaluation: action.evaluation } }

    case 'SET_STEP':
      if (!state.current) return state
      return { current: { ...state.current, currentStep: action.step } }

    case 'CLEAR_SESSION':
      return { current: null }

    case 'DELETE_SESSION':
      if (state.current?.id === action.id) return { current: null }
      return state

    default:
      return state
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run from `src/web/`:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/web/src/store/sessionReducer.ts
git commit -m "feat: add DELETE_SESSION action to session reducer"
```

---

## Task 2: Create ConfirmDeleteDialog component

**Files:**
- Create: `src/web/src/components/ui/ConfirmDeleteDialog.tsx`

- [ ] **Step 1: Create the file with the following content**

```tsx
import { Dialog } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDeleteDialogProps {
  open: boolean
  candidateName: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDeleteDialog({ open, candidateName, onCancel, onConfirm }: ConfirmDeleteDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background p-6 shadow-lg">
          <Dialog.Title className="mb-2 text-lg font-semibold text-foreground">
            Delete session?
          </Dialog.Title>
          <Dialog.Description className="mb-6 text-sm text-muted-foreground">
            This will permanently remove{' '}
            <strong className="text-foreground">{candidateName || 'this session'}</strong>.
          </Dialog.Description>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="destructive" aria-label="Delete session" onClick={onConfirm}>
              Delete
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

**Why Base UI Dialog:** It handles focus trapping within `.Popup`, restores focus to the trigger element on close, and closes on Escape — all without additional code. `onOpenChange(false)` fires for both Escape and backdrop clicks, which routes to `onCancel`.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/web/src/components/ui/ConfirmDeleteDialog.tsx
git commit -m "feat: add ConfirmDeleteDialog component"
```

---

## Task 3: Update HomeScreen with delete functionality

**Files:**
- Modify: `src/web/src/pages/HomeScreen.tsx`

- [ ] **Step 1: Replace the full contents of `HomeScreen.tsx`**

Changes from original:
- Import `useState` from react, `Trash2` from lucide-react, `ConfirmDeleteDialog`
- Destructure `state` and `dispatch` from `useSession()` in addition to `repository`
- Replace direct `repository.list()` with `useState(() => repository.list())` for optimistic updates
- Add `pendingDeleteId` state and `handleDelete` function
- Add `group` class to each card wrapper
- Add trash icon button to each card (always visible on mobile, hover-only on desktop)
- Render `ConfirmDeleteDialog` at the bottom

```tsx
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
        candidateName={pendingSession?.candidateName ?? ''}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => { if (pendingDeleteId) handleDelete(pendingDeleteId) }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/web/src/pages/HomeScreen.tsx
git commit -m "feat: add delete session button and confirmation dialog to HomeScreen"
```

---

## Task 4: Smoke test in the browser

**Files:** none — verification only

- [ ] **Step 1: Start the dev server**

From `src/web/`:
```bash
npm run dev
```
Navigate to `http://localhost:5173`.

- [ ] **Step 2: Verify delete icon behavior**

Create at least one session (click "+ New Interview", fill in the analyze step). Navigate back to the home screen.

Check:
- On mobile viewport (< 768px): trash icon is always visible on the card
- On desktop viewport (≥ 768px): trash icon is hidden, appears on card hover

- [ ] **Step 3: Verify confirmation dialog**

Click the trash icon on a session card.

Check:
- Dialog opens with the candidate name displayed
- Clicking "Cancel" closes the dialog; session remains in the list
- Pressing Escape closes the dialog; session remains in the list
- Clicking "Delete" removes the card from the list immediately
- Page refresh: deleted session is gone (localStorage was updated)

- [ ] **Step 4: Verify theme compliance**

Toggle dark/light mode via the theme toggle in the navbar.

Check:
- Dialog panel background, text, and border all update correctly with the theme
- Trash icon color uses muted/destructive tokens (no hardcoded colors)

- [ ] **Step 5: Commit if any fixes were needed**

If the smoke test required any adjustments, commit them:
```bash
git add -p
git commit -m "fix: <describe what was fixed>"
```
