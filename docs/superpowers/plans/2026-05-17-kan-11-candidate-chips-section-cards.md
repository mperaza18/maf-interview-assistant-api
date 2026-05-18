# KAN-11: Candidate Chips, Duration Badge, and Section Card Accents — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plan summary paragraph with candidate chips, add a total duration badge to the page header, and split the unified round card into individual section cards with name-based left-border color accents and category icons.

**Architecture:** Two files change. A new `CandidateChips` component is created and tested in isolation. `PlanStep.tsx` is updated to add a `resolveCategory` utility, import `CandidateChips`, render the duration badge, and replace the single unified card with per-round cards.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest + Testing Library (happy-dom)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/web/src/components/ui/CandidateChips.tsx` | **Create** | Renders 3 inline chips: role (purple), years exp (surface), top skills (surface) |
| `src/web/src/components/ui/CandidateChips.test.tsx` | **Create** | Unit tests for CandidateChips in isolation |
| `src/web/src/pages/PlanStep.tsx` | **Modify** | Add `resolveCategory`, duration badge, `CandidateChips`, split cards |
| `src/web/src/pages/PlanStep.test.tsx` | **Modify** | Add tests for new header and section card behavior |

---

## Task 1: `CandidateChips` component (TDD)

**Files:**
- Create: `src/web/src/components/ui/CandidateChips.tsx`
- Create: `src/web/src/components/ui/CandidateChips.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/web/src/components/ui/CandidateChips.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CandidateChips } from './CandidateChips'

describe('CandidateChips', () => {
  it('renders the role chip', () => {
    render(<CandidateChips role="Senior React Developer" topSkills={[]} />)
    expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
  })

  it('renders years experience chip when provided', () => {
    render(<CandidateChips role="Engineer" yearsExperience={5} topSkills={[]} />)
    expect(screen.getByText('5 yrs exp')).toBeInTheDocument()
  })

  it('does not render years experience chip when undefined', () => {
    render(<CandidateChips role="Engineer" topSkills={[]} />)
    expect(screen.queryByText(/yrs exp/)).not.toBeInTheDocument()
  })

  it('renders top skills joined by " · "', () => {
    render(<CandidateChips role="Engineer" topSkills={['React', 'TypeScript', 'Node']} />)
    expect(screen.getByText('React · TypeScript · Node')).toBeInTheDocument()
  })

  it('shows only the first 3 skills when more than 3 are provided', () => {
    render(<CandidateChips role="Engineer" topSkills={['A', 'B', 'C', 'D']} />)
    expect(screen.getByText('A · B · C')).toBeInTheDocument()
    expect(screen.queryByText(/D/)).not.toBeInTheDocument()
  })

  it('renders no skills chip when topSkills is empty', () => {
    render(<CandidateChips role="Engineer" topSkills={[]} />)
    expect(screen.queryByText('·')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify the tests fail**

```bash
cd /Users/mikeperaza/Dev/maf-interview-assistant-api/src/web && npm test -- CandidateChips --run
```

Expected: FAIL — `Cannot find module './CandidateChips'`

- [ ] **Step 3: Implement `CandidateChips`**

Create `src/web/src/components/ui/CandidateChips.tsx`:

```tsx
interface CandidateChipsProps {
  role: string
  yearsExperience?: number
  topSkills: string[]
}

export function CandidateChips({ role, yearsExperience, topSkills }: CandidateChipsProps) {
  const displaySkills = topSkills.slice(0, 3).join(' · ')
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center rounded-full border border-violet-700/50 bg-violet-900/40 px-3 py-1 text-xs font-medium text-violet-300">
        {role}
      </span>
      {yearsExperience !== undefined && (
        <span className="inline-flex items-center rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
          {yearsExperience} yrs exp
        </span>
      )}
      {displaySkills && (
        <span className="inline-flex items-center rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
          {displaySkills}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify the tests pass**

```bash
cd /Users/mikeperaza/Dev/maf-interview-assistant-api/src/web && npm test -- CandidateChips --run
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/web/src/components/ui/CandidateChips.tsx src/web/src/components/ui/CandidateChips.test.tsx
git commit -m "feat: add CandidateChips component with role, years exp, and top skills chips"
```

---

## Task 2: PlanStep — duration badge, chips, and section card accents (TDD)

**Files:**
- Modify: `src/web/src/pages/PlanStep.tsx`
- Modify: `src/web/src/pages/PlanStep.test.tsx`

The existing `mockPlan` in `PlanStep.test.tsx` has two rounds: `System Design` (20 min) + `Coding` (30 min) = 50 min total. `baseSession.profile` has no `yearsExperience` (undefined) and `coreSkills: ['React']`.

- [ ] **Step 1: Add failing tests to `PlanStep.test.tsx`**

Append these `describe` blocks to the end of `src/web/src/pages/PlanStep.test.tsx` (after the existing `describe('PlanStep revise bar', ...)` block):

```tsx
describe('PlanStep header — duration badge', () => {
  it('renders total duration by summing all round durationMinutes', () => {
    renderPlanStep()
    expect(screen.getByText('50 min total')).toBeInTheDocument()
  })
})

describe('PlanStep header — candidate chips', () => {
  it('renders the role chip below the heading', () => {
    renderPlanStep()
    // CandidateChips renders role as a chip; metadata card also shows role under "Target Role"
    expect(screen.getAllByText('Senior React Developer').length).toBeGreaterThan(0)
  })

  it('does not render the plan summary paragraph', () => {
    renderPlanStep()
    expect(screen.queryByText('Focus on system design and coding.')).not.toBeInTheDocument()
  })

  it('renders the top skills chip with coreSkills from profile', () => {
    renderPlanStep()
    expect(screen.getByText('React')).toBeInTheDocument()
  })
})

describe('PlanStep section cards', () => {
  it('renders category icon ⬡ for System Design round', () => {
    renderPlanStep()
    expect(screen.getByText('⬡')).toBeInTheDocument()
  })

  it('renders fallback icon ● for rounds with no matching category', () => {
    renderPlanStep()
    expect(screen.getByText('●')).toBeInTheDocument()
  })

  it('renders per-round duration in each section card header', () => {
    renderPlanStep()
    expect(screen.getByText('(20 min)')).toBeInTheDocument()
    expect(screen.getByText('(30 min)')).toBeInTheDocument()
  })

  it('renders all question text inside section cards', () => {
    renderPlanStep()
    expect(screen.getByText('Design a caching layer')).toBeInTheDocument()
    expect(screen.getByText('Implement a debounce utility')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify the new tests fail**

```bash
cd /Users/mikeperaza/Dev/maf-interview-assistant-api/src/web && npm test -- PlanStep --run
```

Expected: the new tests FAIL (existing revise bar tests still pass)

- [ ] **Step 3: Implement changes in `PlanStep.tsx`**

Replace the entire content of `src/web/src/pages/PlanStep.tsx` with:

```tsx
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
            <h2 className="text-lg font-semibold text-slate-100">Interview Plan</h2>
            {session.plan && (
              <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-xs font-medium text-slate-300">
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
          className="text-slate-400 hover:text-slate-200"
        >
          ← Back
        </Button>
      </div>

      {loading && <LoadingSpinner label="Generating interview plan..." />}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {session.plan && (
        <>
          {/* Metadata card */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-6 py-4 flex items-center gap-0">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Target Role</p>
              <p className="text-[15px] font-semibold text-white mt-1 truncate">{session.role}</p>
            </div>
            <div className="w-px h-12 bg-slate-700 mx-6 shrink-0" />
            <div className="shrink-0">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Difficulty</p>
              <span className="mt-1 inline-block bg-amber-900/50 text-amber-400 text-xs font-semibold px-3 py-1 rounded-md">
                {session.plan.level}
              </span>
            </div>
            <div className="w-px h-12 bg-slate-700 mx-6 shrink-0" />
            <div className="shrink-0">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Questions</p>
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
                  className="rounded-xl border border-slate-700 bg-slate-800/80 p-5 border-l-[3px]"
                  style={{ borderLeftColor: color }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm" style={{ color }}>{icon}</span>
                    <span className="text-sm font-semibold" style={{ color }}>{round.name}</span>
                    <span className="text-xs text-slate-500">({round.durationMinutes} min)</span>
                  </div>
                  <ol className="space-y-2">
                    {round.questions.map((q, j) => (
                      <li key={j} className="flex gap-3 text-sm">
                        <span className="shrink-0 text-slate-600 w-4">{j + 1}.</span>
                        <span className="text-slate-400">{q}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )
            })}
          </div>

          {/* Revise bar */}
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

          {/* Bottom CTAs */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
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
```

- [ ] **Step 4: Run all PlanStep tests to verify they pass**

```bash
cd /Users/mikeperaza/Dev/maf-interview-assistant-api/src/web && npm test -- PlanStep --run
```

Expected: all tests PASS (existing revise bar tests + new header/section card tests)

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
cd /Users/mikeperaza/Dev/maf-interview-assistant-api/src/web && npm test --run
```

Expected: all tests PASS with no regressions

- [ ] **Step 6: Commit**

```bash
git add src/web/src/pages/PlanStep.tsx src/web/src/pages/PlanStep.test.tsx
git commit -m "feat: add duration badge, candidate chips, and section card accents to PlanStep"
```

---

## Self-Review

**Spec coverage:**
- ✅ CandidateChips with role (purple), years exp (surface), top skills (surface) — Task 1
- ✅ Total duration badge next to "Interview Plan" heading — Task 2 Step 3 (`totalMinutes`)
- ✅ Summary paragraph removed — Task 2 Step 3 (replaced by `CandidateChips`)
- ✅ Name-based `resolveCategory` with icon + color — Task 2 Step 3
- ✅ Individual section cards with `border-l-[3px]` left accent — Task 2 Step 3
- ✅ Category icons (◎ ⬡ ◇ ●) in card header — Task 2 Step 3
- ✅ Per-round duration in card header — Task 2 Step 3

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:**
- `CandidateChipsProps.topSkills: string[]` used in Task 1, called with `session.profile.coreSkills` (type `string[]`) in Task 2 ✅
- `resolveCategory` returns `{ color: string; icon: string }`, destructured as `{ color, icon }` in the map ✅
- `totalMinutes` and `totalQuestions` computed before the JSX, both used inside the render ✅
