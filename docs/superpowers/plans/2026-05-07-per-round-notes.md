# KAN-4: Per-round Interview Notes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single notes textarea in Step 3 (Live Session) with a tabbed interface that gives Gate Keepers a dedicated notes input per interview round, condensing all notes into a single string before sending to the evaluator API.

**Architecture:** Add `roundNotes: Record<string, string>` to the `Session` type and a `SET_ROUND_NOTE` reducer action so per-round notes persist via `LocalStorageSessionRepository` automatically. `SessionStep.tsx` becomes a tabbed UI — one tab per plan round — that dispatches `SET_ROUND_NOTE` on keystroke and condenses all notes into the existing `notes: string` field when "Complete Interview" is clicked. No backend changes required.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite, Vitest, shadcn/ui `Textarea` + `Button` components.

---

## File Map

| File | Change |
|------|--------|
| `src/web/src/types/index.ts` | Add `roundNotes: Record<string, string>` to `Session` interface |
| `src/web/src/App.tsx` | Add `roundNotes: {}` to the session object in `handleNew` (line ~35) |
| `src/web/src/store/sessionReducer.ts` | Add `SET_ROUND_NOTE` action type and reducer case |
| `src/web/src/store/sessionReducer.test.ts` | Add `roundNotes: {}` to `baseSession`; add two new test cases |
| `src/web/src/pages/SessionStep.tsx` | Replace single-textarea layout with tabbed per-round UI |

---

## Task 1: Add `roundNotes` to the `Session` type and update call-sites

**Files:**
- Modify: `src/web/src/types/index.ts`
- Modify: `src/web/src/App.tsx`
- Modify: `src/web/src/store/sessionReducer.test.ts`

- [ ] **Step 1: Add `roundNotes` to the `Session` interface**

Open `src/web/src/types/index.ts`. The `Session` interface currently ends with:
```ts
  notes: string
  evaluation?: EvaluationResult
}
```
Change it to:
```ts
  notes: string
  roundNotes?: Record<string, string>
  evaluation?: EvaluationResult
}
```

The field is optional (`?`) so that existing sessions deserialized from localStorage (which predate this field) remain valid — the component handles `undefined` with `?? {}`.

- [ ] **Step 2: Add `roundNotes: {}` to the session factory in `App.tsx`**

Open `src/web/src/App.tsx`. Find `handleNew` (around line 26). The session object literal currently ends with `notes: ''`. Add `roundNotes: {}` after it:

```ts
  function handleNew() {
    const session: Session = {
      id: crypto.randomUUID(),
      candidateName: '',
      role: 'Software Engineer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 1,
      resumeText: '',
      notes: '',
      roundNotes: {},
    }
    dispatch({ type: 'CREATE_SESSION', session })
    setView('wizard')
  }
```

- [ ] **Step 3: Run the existing tests — they must all pass**

```bash
cd src/web && npm test
```

Expected: all existing tests pass. Because `roundNotes` is optional, no changes to the existing `baseSession` fixture are needed.

- [ ] **Step 4: Commit**

```bash
git add src/web/src/types/index.ts src/web/src/App.tsx
git commit -m "feat: add roundNotes field to Session type"
```

---

## Task 2: Add `SET_ROUND_NOTE` action to the reducer

**Files:**
- Modify: `src/web/src/store/sessionReducer.test.ts`
- Modify: `src/web/src/store/sessionReducer.ts`

- [ ] **Step 1: Write the failing tests**

Add these two test cases inside the `describe('sessionReducer', ...)` block in `src/web/src/store/sessionReducer.test.ts`, after the existing `SET_NOTES` test:

```ts
  it('SET_ROUND_NOTE merges a note into roundNotes without affecting other fields', () => {
    const withSession = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const state = sessionReducer(withSession, {
      type: 'SET_ROUND_NOTE',
      roundName: 'Technical',
      note: 'Strong answers',
    })
    expect(state.current?.roundNotes).toEqual({ Technical: 'Strong answers' })
    expect(state.current?.notes).toBe('')
  })

  it('SET_ROUND_NOTE preserves existing round notes when adding a new one', () => {
    const withFirst = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const withTechnical = sessionReducer(withFirst, {
      type: 'SET_ROUND_NOTE',
      roundName: 'Technical',
      note: 'Strong answers',
    })
    const state = sessionReducer(withTechnical, {
      type: 'SET_ROUND_NOTE',
      roundName: 'Behavioral',
      note: 'Good examples',
    })
    expect(state.current?.roundNotes).toEqual({ Technical: 'Strong answers', Behavioral: 'Good examples' })
  })
```

- [ ] **Step 2: Run to confirm the tests fail**

```bash
cd src/web && npm test
```

Expected: the two new tests fail with a TypeScript error — `SET_ROUND_NOTE` is not a valid action type yet.

- [ ] **Step 3: Add the action type and reducer case to `sessionReducer.ts`**

Open `src/web/src/store/sessionReducer.ts`. Replace the entire file with:

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

    default:
      return state
  }
}
```

- [ ] **Step 4: Run the tests — all must pass**

```bash
cd src/web && npm test
```

Expected: all tests pass, including the two new `SET_ROUND_NOTE` cases.

- [ ] **Step 5: Commit**

```bash
git add src/web/src/store/sessionReducer.ts src/web/src/store/sessionReducer.test.ts
git commit -m "feat: add SET_ROUND_NOTE action to session reducer (KAN-4)"
```

---

## Task 3: Replace `SessionStep` with the tabbed per-round UI

**Files:**
- Modify: `src/web/src/pages/SessionStep.tsx`

- [ ] **Step 1: Replace `SessionStep.tsx` with the new tabbed implementation**

Overwrite `src/web/src/pages/SessionStep.tsx` entirely:

```tsx
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

      <div className="flex border-b border-slate-700">
        {rounds.map((r, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              i === activeTab
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-indigo-400">{round.name}</span>
          <span className="text-xs text-slate-500">· {round.durationMinutes} min</span>
        </div>

        <div className="space-y-1">
          {round.questions.map((q, j) => (
            <div key={j} className="flex gap-2 text-sm text-slate-400">
              <span className="shrink-0 text-slate-600">•</span>
              <span>{q}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</p>
          <Textarea
            value={roundNotes[round.name] ?? ''}
            onChange={(e) =>
              dispatch({ type: 'SET_ROUND_NOTE', roundName: round.name, note: e.target.value })
            }
            placeholder={`Capture your observations for ${round.name}...`}
            className="h-40 resize-none border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-600"
          />
          <p className="text-xs text-slate-500">Notes are saved automatically.</p>
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
```

- [ ] **Step 2: Verify the TypeScript build passes**

```bash
cd src/web && npm run build
```

Expected: build completes with no errors. Fix any TypeScript errors before continuing.

- [ ] **Step 3: Run the full test suite**

```bash
cd src/web && npm test
```

Expected: all tests pass.

- [ ] **Step 4: Start the dev servers and manually test**

In one terminal:
```bash
dotnet run --project src/InterviewAssistant.Api
```

In another terminal:
```bash
cd src/web && npm run dev
```

Open `http://localhost:5173`. Run through the full wizard:
1. Upload a resume PDF and complete Step 1 (Analyze)
2. Generate a plan and complete Step 2 (Plan)
3. On Step 3 (Live Session): verify tabs appear — one per round from the plan
4. Click each tab: confirm the correct round name, duration, and questions are shown
5. Type notes in one tab, switch to another — confirm notes are not shared between tabs
6. Refresh the page — confirm notes survive (localStorage persistence)
7. Click "Complete Interview →" — confirm you land on Step 4 (Evaluation)
8. Open DevTools → Network → find the `POST /api/interview/evaluate` request — confirm the `notes` payload contains the `[Round Name]\n<text>` format for each round you typed in

- [ ] **Step 5: Commit**

```bash
git add src/web/src/pages/SessionStep.tsx
git commit -m "feat: replace single notes textarea with tabbed per-round notes in Step 3"
```
