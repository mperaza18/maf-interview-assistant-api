# Step Indicator Visual States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the completed-step label color and add click-to-navigate-back behavior to the `Stepper` component.

**Architecture:** `Stepper` gains an optional `onStepClick` prop; completed step circles become `<button>` elements. `App.tsx` passes a dispatch callback. No changes to `SessionContext`, `sessionReducer`, or any page component.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest + Testing Library

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `src/web/src/components/Stepper.tsx` | Modify | Add `onStepClick` prop; completed circles → `<button>`; fix label color |
| `src/web/src/components/Stepper.test.tsx` | Create | Unit tests for click behavior and label styling |
| `src/web/src/App.tsx` | Modify | Pass `onStepClick` callback to `<Stepper>` |

---

## Task 1: Write failing tests for Stepper

**Files:**
- Create: `src/web/src/components/Stepper.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Stepper } from './Stepper'

describe('Stepper', () => {
  it('renders all 4 step labels', () => {
    render(<Stepper currentStep={1} />)
    expect(screen.getByText('Resume Analysis')).toBeInTheDocument()
    expect(screen.getByText('Interview Plan')).toBeInTheDocument()
    expect(screen.getByText('Live Session')).toBeInTheDocument()
    expect(screen.getByText('Evaluation')).toBeInTheDocument()
  })

  it('calls onStepClick with the step number when a completed step circle is clicked', () => {
    const onStepClick = vi.fn()
    render(<Stepper currentStep={3} onStepClick={onStepClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Go to step 1' }))
    expect(onStepClick).toHaveBeenCalledWith(1)
  })

  it('calls onStepClick with the correct number for each completed step', () => {
    const onStepClick = vi.fn()
    render(<Stepper currentStep={4} onStepClick={onStepClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Go to step 2' }))
    expect(onStepClick).toHaveBeenCalledWith(2)
  })

  it('does not render clickable buttons for the active or upcoming steps', () => {
    render(<Stepper currentStep={2} onStepClick={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Go to step 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Go to step 3' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Go to step 4' })).not.toBeInTheDocument()
  })

  it('renders completed step labels with purple color and semi-bold weight', () => {
    render(<Stepper currentStep={3} />)
    const label = screen.getByText('Resume Analysis')
    expect(label.className).toContain('text-indigo-400')
    expect(label.className).toContain('font-semibold')
  })

  it('renders the active step label with white color and semi-bold weight', () => {
    render(<Stepper currentStep={2} />)
    const label = screen.getByText('Interview Plan')
    expect(label.className).toContain('text-slate-100')
    expect(label.className).toContain('font-semibold')
  })
})
```

- [ ] **Step 2: Run the tests and verify they fail**

```bash
cd src/web && npm test -- Stepper
```

Expected: FAIL — `getByRole('button', { name: 'Go to step 1' })` throws "Unable to find an accessible element", and the label class assertions fail because no `text-indigo-400` exists yet.

---

## Task 2: Update `Stepper.tsx`

**Files:**
- Modify: `src/web/src/components/Stepper.tsx`

- [ ] **Step 1: Replace the entire file with the updated implementation**

```tsx
import { cn } from '@/lib/utils'

const STEPS: [number, string][] = [
  [1, 'Resume Analysis'],
  [2, 'Interview Plan'],
  [3, 'Live Session'],
  [4, 'Evaluation'],
]

interface StepperProps {
  currentStep: 1 | 2 | 3 | 4
  onStepClick?: (step: 1 | 2 | 3 | 4) => void
}

export function Stepper({ currentStep, onStepClick }: StepperProps) {
  return (
    <div className="flex items-center">
      {STEPS.map(([step, label], i) => {
        const isCompleted = step < currentStep
        const isActive = step === currentStep
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              {isCompleted ? (
                <button
                  aria-label={`Go to step ${step}`}
                  onClick={() => onStepClick?.(step as 1 | 2 | 3 | 4)}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                    'bg-indigo-500 text-white',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
                  )}
                >
                  ✓
                </button>
              ) : (
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                    isActive && 'bg-indigo-500 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950',
                    !isActive && 'bg-slate-700 text-slate-400',
                  )}
                >
                  {step}
                </div>
              )}
              <span
                className={cn(
                  'text-xs hidden sm:block whitespace-nowrap',
                  isActive
                    ? 'text-slate-100 font-semibold'
                    : isCompleted
                      ? 'text-indigo-400 font-semibold'
                      : 'text-slate-500',
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-12 md:w-20 mx-2 mb-4 transition-colors',
                  step < currentStep ? 'bg-indigo-500' : 'bg-slate-700',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Run the tests and verify they pass**

```bash
cd src/web && npm test -- Stepper
```

Expected: all 6 tests PASS.

---

## Task 3: Wire up `onStepClick` in `App.tsx`

**Files:**
- Modify: `src/web/src/App.tsx` (line 74)

- [ ] **Step 1: Pass `onStepClick` to `<Stepper>`**

Find this line in `App.tsx`:
```tsx
<Stepper currentStep={step} />
```

Replace it with:
```tsx
<Stepper
  currentStep={step}
  onStepClick={(s) => dispatch({ type: 'SET_STEP', step: s })}
/>
```

- [ ] **Step 2: Run the full test suite**

```bash
cd src/web && npm test
```

Expected: all tests pass with no regressions.

- [ ] **Step 3: Run the dev servers and verify visually**

Open two terminals:
```bash
# Terminal 1
dotnet run --project src/InterviewAssistant.Api

# Terminal 2
cd src/web && npm run dev
```

Open `http://localhost:5173`. Start a session, upload a resume to reach step 2, then:
- Verify step 1 circle is purple with a `✓` checkmark
- Verify step 1 label is purple and semi-bold
- Verify step 2 circle has the outer glow ring
- Verify step 2 label is white and semi-bold
- Verify step 3 and 4 circles are gray
- Click the step 1 circle — page should navigate back to the Resume Analysis step
- Verify the connector between step 1 and step 2 is purple

- [ ] **Step 4: Stage changes for commit**

```bash
git add src/web/src/components/Stepper.tsx \
        src/web/src/components/Stepper.test.tsx \
        src/web/src/App.tsx
```

Review the diff with `git diff --staged`, then commit when satisfied.
