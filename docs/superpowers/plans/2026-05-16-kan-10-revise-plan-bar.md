# KAN-10 Revise Plan Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the "Revise Plan" input bar in PlanStep into a prominent gradient banner with a purple button and scroll-to-top-of-cards behavior on revision.

**Architecture:** All changes are contained to a single file — `src/web/src/pages/PlanStep.tsx`. The revise bar div is wrapped in a styled card, a label is added above the input row, the button style is updated to match primary CTAs, and a `useRef` is added to scroll the rounds container into view after each revision completes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest + Testing Library

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/web/src/pages/PlanStep.tsx` | Modify | Apply gradient card, label, purple button, scroll ref |
| `src/web/src/pages/PlanStep.test.tsx` | Create | Tests for new revise bar appearance and scroll behavior |

---

### Task 1: Write failing tests for the revise bar

**Files:**
- Create: `src/web/src/pages/PlanStep.test.tsx`

- [ ] **Step 1: Create the test file with all failing assertions**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Dispatch } from 'react'
import { SessionContext } from '@/store/SessionContext'
import { PlanStep } from './PlanStep'
import * as api from '@/api/interviewApi'
import type { Session, InterviewPlan } from '@/types'
import type { SessionAction, SessionState } from '@/store/sessionReducer'

const mockPlan: InterviewPlan = {
  role: 'Senior React Developer',
  level: 'Senior',
  summary: 'Focus on system design and coding.',
  rounds: [
    { name: 'System Design', durationMinutes: 20, questions: ['Design a caching layer'] },
    { name: 'Coding', durationMinutes: 30, questions: ['Implement a debounce utility'] },
  ],
  rubric: [],
}

const baseSession: Session = {
  id: 'test-id',
  candidateName: 'Jane Doe',
  role: 'Senior React Developer',
  createdAt: '2026-05-16T00:00:00.000Z',
  updatedAt: '2026-05-16T00:00:00.000Z',
  currentStep: 2,
  resumeText: 'Jane has 8 years of React experience.',
  notes: '',
  profile: {
    candidateName: 'Jane Doe',
    coreSkills: ['React'],
    roles: ['Senior Frontend Engineer'],
    notableProjects: [],
    redFlags: [],
  },
  seniority: { level: 'Senior', confidence: 0.9, rationale: 'strong' },
  plan: mockPlan,
}

function renderPlanStep(session: Session = baseSession) {
  const dispatch = vi.fn() as unknown as Dispatch<SessionAction>
  const state: SessionState = { current: session }
  const repository = { save: vi.fn(), load: vi.fn(), clear: vi.fn() } as any
  render(
    <SessionContext.Provider value={{ state, dispatch, repository }}>
      <PlanStep />
    </SessionContext.Provider>
  )
  return { dispatch }
}

beforeEach(() => vi.restoreAllMocks())

describe('PlanStep revise bar', () => {
  it('renders the "✦ Revise Plan" label', () => {
    renderPlanStep()
    expect(screen.getByText(/✦ Revise Plan/i)).toBeInTheDocument()
  })

  it('renders input with correct placeholder text', () => {
    renderPlanStep()
    expect(
      screen.getByPlaceholderText('Revise plan, e.g. "add more system design questions"')
    ).toBeInTheDocument()
  })

  it('Revise button is disabled when input is empty', () => {
    renderPlanStep()
    expect(screen.getByRole('button', { name: /^revise$/i })).toBeDisabled()
  })

  it('Revise button becomes enabled when input has text', () => {
    renderPlanStep()
    const input = screen.getByPlaceholderText('Revise plan, e.g. "add more system design questions"')
    fireEvent.change(input, { target: { value: 'add more system design questions' } })
    expect(screen.getByRole('button', { name: /^revise$/i })).not.toBeDisabled()
  })

  it('dispatches SET_PLAN with revised plan on successful revision', async () => {
    const revisedPlan: InterviewPlan = { ...mockPlan, summary: 'Updated with more system design.' }
    vi.spyOn(api, 'revisePlan').mockResolvedValue(revisedPlan)
    const { dispatch } = renderPlanStep()
    const input = screen.getByPlaceholderText('Revise plan, e.g. "add more system design questions"')
    fireEvent.change(input, { target: { value: 'add more system design questions' } })
    fireEvent.click(screen.getByRole('button', { name: /^revise$/i }))
    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PLAN', plan: revisedPlan })
    )
  })

  it('clears the input after successful revision', async () => {
    vi.spyOn(api, 'revisePlan').mockResolvedValue(mockPlan)
    renderPlanStep()
    const input = screen.getByPlaceholderText('Revise plan, e.g. "add more system design questions"')
    fireEvent.change(input, { target: { value: 'add more system design' } })
    fireEvent.click(screen.getByRole('button', { name: /^revise$/i }))
    await waitFor(() => expect((input as HTMLInputElement).value).toBe(''))
  })

  it('shows error banner on revision failure', async () => {
    vi.spyOn(api, 'revisePlan').mockRejectedValue(new Error('Revision failed. Please try again.'))
    renderPlanStep()
    const input = screen.getByPlaceholderText('Revise plan, e.g. "add more system design questions"')
    fireEvent.change(input, { target: { value: 'add more questions' } })
    fireEvent.click(screen.getByRole('button', { name: /^revise$/i }))
    await waitFor(() =>
      expect(screen.getByText(/revision failed/i)).toBeInTheDocument()
    )
  })
})
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd /Users/mikeperaza/Dev/maf-interview-assistant-api/src/web && npm test -- PlanStep
```

Expected: Several failures — `"✦ Revise Plan"` label not found, placeholder text mismatch, and button enabled-state failures.

---

### Task 2: Implement the revise bar changes

**Files:**
- Modify: `src/web/src/pages/PlanStep.tsx`

- [ ] **Step 1: Add `roundsRef` — insert after the existing `calledRef` declaration on line 16**

Change this:
```tsx
const calledRef = useRef(false)
```

To this:
```tsx
const calledRef = useRef(false)
const roundsRef = useRef<HTMLDivElement>(null)
```

- [ ] **Step 2: Add scroll call in `handleRevise` — after `dispatch` and `setFeedback('')`**

Change this:
```tsx
dispatch({ type: 'SET_PLAN', plan: revised })
setFeedback('')
```

To this:
```tsx
dispatch({ type: 'SET_PLAN', plan: revised })
setFeedback('')
roundsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
```

- [ ] **Step 3: Attach `roundsRef` to the rounds container — line 71**

Change this:
```tsx
<div className="space-y-3">
  {session.plan.rounds.map((round, i) => (
```

To this:
```tsx
<div ref={roundsRef} className="space-y-3">
  {session.plan.rounds.map((round, i) => (
```

- [ ] **Step 4: Replace the revise bar block — lines 90–106**

Remove this:
```tsx
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
```

Replace with:
```tsx
<div className="rounded-lg border border-indigo-500/40 bg-gradient-to-br from-indigo-950/60 to-slate-800/80 p-4 space-y-3">
  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">✦ Revise Plan</p>
  <div className="flex gap-2">
    <Input
      value={feedback}
      onChange={(e) => setFeedback(e.target.value)}
      placeholder='Revise plan, e.g. "add more system design questions"'
      className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
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
```

---

### Task 3: Run tests and verify

**Files:**
- Test: `src/web/src/pages/PlanStep.test.tsx`

- [ ] **Step 1: Run the PlanStep tests**

```bash
cd /Users/mikeperaza/Dev/maf-interview-assistant-api/src/web && npm test -- PlanStep
```

Expected: All 7 tests PASS.

- [ ] **Step 2: Run the full test suite to check for regressions**

```bash
cd /Users/mikeperaza/Dev/maf-interview-assistant-api/src/web && npm test
```

Expected: All tests PASS with no regressions.

- [ ] **Step 3: Build to verify TypeScript compiles cleanly**

```bash
cd /Users/mikeperaza/Dev/maf-interview-assistant-api/src/web && npm run build
```

Expected: Build succeeds with no TypeScript errors.

---

### Task 4: Visual check and commit

- [ ] **Step 1: Start the API and dev server**

Terminal 1:
```bash
cd /Users/mikeperaza/Dev/maf-interview-assistant-api && dotnet run --project src/InterviewAssistant.Api
```

Terminal 2:
```bash
cd /Users/mikeperaza/Dev/maf-interview-assistant-api/src/web && npm run dev
```

Open `http://localhost:5173`, upload a resume, reach the Interview Plan step, and confirm:
- The "✦ Revise Plan" gradient banner is visible above the "Start Interview →" button
- The Revise button is indigo and disabled until text is typed
- Typing feedback and clicking Revise scrolls the page back to the first round card

- [ ] **Step 2: Commit**

```bash
git add src/web/src/pages/PlanStep.tsx src/web/src/pages/PlanStep.test.tsx docs/superpowers/specs/2026-05-16-kan-10-revise-plan-bar-design.md docs/superpowers/plans/2026-05-16-kan-10-revise-plan-bar.md
git commit -m "feat: resurface Revise Plan bar with gradient styling and scroll (KAN-10)"
```
