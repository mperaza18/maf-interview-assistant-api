# Seniority and Confidence Stat Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain-text seniority/confidence line in the AnalyzeStep result card with two prominent colored stat badge components.

**Architecture:** A generic `StatBadge` base component accepts `label`, `value`, and `colorScheme` props. Two thin wrappers — `SeniorityBadge` and `ConfidenceBadge` — encapsulate color-derivation logic and are imported into `AnalyzeStep.tsx` to replace the existing plain-text block.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest, Testing Library.

---

## File Map

| File | Action |
|------|--------|
| `src/web/src/components/ui/StatBadge.tsx` | **Create** — generic base + two typed wrappers |
| `src/web/src/components/ui/StatBadge.test.tsx` | **Create** — unit tests (TDD: written first) |
| `src/web/src/pages/AnalyzeStep.tsx` | **Modify** — import badges, replace plain-text block, insert badge row above skill chips |

---

## Task 1: Write the failing tests

**Files:**
- Create: `src/web/src/components/ui/StatBadge.test.tsx`

- [ ] **Step 1.1: Create the test file**

Create `src/web/src/components/ui/StatBadge.test.tsx` with the following content:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatBadge, SeniorityBadge, ConfidenceBadge } from './StatBadge'

describe('StatBadge', () => {
  it('renders label text', () => {
    render(<StatBadge label="SENIORITY" value="Senior" colorScheme="purple" />)
    expect(screen.getByText('SENIORITY')).toBeInTheDocument()
  })

  it('renders value text', () => {
    render(<StatBadge label="SENIORITY" value="Senior" colorScheme="purple" />)
    expect(screen.getByText('Senior')).toBeInTheDocument()
  })
})

describe('SeniorityBadge', () => {
  function getBadge(level: string) {
    const { container } = render(<SeniorityBadge level={level} />)
    return container.querySelector('[data-testid="stat-badge"]')!
  }

  it.each([['Senior'], ['Architect'], ['Software Designer']])(
    '%s maps to purple',
    (level) => {
      expect(getBadge(level).className).toContain('bg-purple-500/20')
    }
  )

  it.each([['Semi Senior'], ['Semi Senior Adv']])(
    '%s maps to blue',
    (level) => {
      expect(getBadge(level).className).toContain('bg-blue-500/20')
    }
  )

  it.each([['Junior'], ['Trainee'], ['unknown-level']])(
    '%s maps to gray (default)',
    (level) => {
      expect(getBadge(level).className).toContain('bg-slate-500/20')
    }
  )
})

describe('ConfidenceBadge', () => {
  function getBadge(confidence: number) {
    const { container } = render(<ConfidenceBadge confidence={confidence} />)
    return container.querySelector('[data-testid="stat-badge"]')!
  }

  it.each([[0.95], [0.80]])('%s maps to green', (confidence) => {
    expect(getBadge(confidence).className).toContain('bg-emerald-500/20')
  })

  it.each([[0.70], [0.60]])('%s maps to yellow', (confidence) => {
    expect(getBadge(confidence).className).toContain('bg-yellow-500/20')
  })

  it('0.45 maps to red', () => {
    expect(getBadge(0.45).className).toContain('bg-red-500/20')
  })

  it('formats confidence as a percentage string', () => {
    render(<ConfidenceBadge confidence={0.95} />)
    expect(screen.getByText('95%')).toBeInTheDocument()
  })
})
```

- [ ] **Step 1.2: Run tests — expect import failure**

```bash
cd src/web && npm test -- StatBadge
```

Expected output: tests **fail** with an error like `Cannot find module './StatBadge'`. This confirms the tests are wired correctly and the implementation does not yet exist.

---

## Task 2: Implement StatBadge.tsx

**Files:**
- Create: `src/web/src/components/ui/StatBadge.tsx`

- [ ] **Step 2.1: Create the component file**

Create `src/web/src/components/ui/StatBadge.tsx` with the following content:

```tsx
import { cn } from '@/lib/utils'

type ColorScheme = 'purple' | 'blue' | 'gray' | 'green' | 'yellow' | 'red'

const colorClasses: Record<ColorScheme, string> = {
  purple: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
  blue:   'bg-blue-500/20 border-blue-500/40 text-blue-300',
  gray:   'bg-slate-500/20 border-slate-500/40 text-slate-300',
  green:  'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  yellow: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
  red:    'bg-red-500/20 border-red-500/40 text-red-300',
}

interface StatBadgeProps {
  label: string
  value: string
  colorScheme: ColorScheme
}

export function StatBadge({ label, value, colorScheme }: StatBadgeProps) {
  return (
    <div
      data-testid="stat-badge"
      className={cn(
        'flex min-w-[90px] flex-col items-center rounded-[10px] border px-3 py-[18px]',
        colorClasses[colorScheme]
      )}
    >
      <span className="text-[9px] uppercase tracking-wider opacity-70">{label}</span>
      <span className="text-[20px] font-bold leading-tight">{value}</span>
    </div>
  )
}

function getSeniorityColorScheme(level: string): ColorScheme {
  const normalized = level.toLowerCase().trim()
  if (['senior', 'software designer', 'architect'].includes(normalized)) return 'purple'
  if (['semi senior', 'semi senior adv'].includes(normalized)) return 'blue'
  return 'gray'
}

export function SeniorityBadge({ level }: { level: string }) {
  return (
    <StatBadge
      label="SENIORITY"
      value={level}
      colorScheme={getSeniorityColorScheme(level)}
    />
  )
}

function getConfidenceColorScheme(confidence: number): ColorScheme {
  if (confidence >= 0.8) return 'green'
  if (confidence >= 0.6) return 'yellow'
  return 'red'
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  return (
    <StatBadge
      label="CONFIDENCE"
      value={`${Math.round(confidence * 100)}%`}
      colorScheme={getConfidenceColorScheme(confidence)}
    />
  )
}
```

- [ ] **Step 2.2: Run StatBadge tests — expect all to pass**

```bash
cd src/web && npm test -- StatBadge
```

Expected output: all **16 tests pass**. Example:
```
✓ StatBadge > renders label text
✓ StatBadge > renders value text
✓ SeniorityBadge > Senior maps to purple
✓ SeniorityBadge > Architect maps to purple
✓ SeniorityBadge > Software Designer maps to purple
✓ SeniorityBadge > Semi Senior maps to blue
✓ SeniorityBadge > Semi Senior Adv maps to blue
✓ SeniorityBadge > Junior maps to gray (default)
✓ SeniorityBadge > Trainee maps to gray (default)
✓ SeniorityBadge > unknown-level maps to gray (default)
✓ ConfidenceBadge > 0.95 maps to green
✓ ConfidenceBadge > 0.80 maps to green
✓ ConfidenceBadge > 0.70 maps to yellow
✓ ConfidenceBadge > 0.60 maps to yellow
✓ ConfidenceBadge > 0.45 maps to red
✓ ConfidenceBadge > formats confidence as a percentage string
```

If any test fails, fix `StatBadge.tsx` before continuing — do not move to Task 3 until all StatBadge tests are green.

---

## Task 3: Update AnalyzeStep.tsx

**Files:**
- Modify: `src/web/src/pages/AnalyzeStep.tsx`

- [ ] **Step 3.1: Add the import**

At the top of `src/web/src/pages/AnalyzeStep.tsx`, add the import after the existing imports:

```tsx
import { SeniorityBadge, ConfidenceBadge } from '@/components/ui/StatBadge'
```

The import block should look like this:

```tsx
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from '@/store/SessionContext'
import { analyzeResumePdf, ApiError } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { SeniorityBadge, ConfidenceBadge } from '@/components/ui/StatBadge'
```

- [ ] **Step 3.2: Replace the plain-text block and insert badge row**

Inside the result card (around line 126), replace this block:

```tsx
          <div className="flex flex-wrap gap-2">
            {session.profile.coreSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300"
              >
                {skill}
              </span>
            ))}
          </div>
          <div className="text-sm text-slate-400">
            Seniority:{' '}
            <span className="font-semibold text-indigo-400">{session.seniority.level}</span>
            {' · '}
            Confidence:{' '}
            <span className="text-slate-200">
              {Math.round(session.seniority.confidence * 100)}%
            </span>
          </div>
```

With this (badges row inserted before skill chips, plain-text block removed):

```tsx
          <div className="flex gap-3">
            <SeniorityBadge level={session.seniority.level} />
            <ConfidenceBadge confidence={session.seniority.confidence} />
          </div>
          <div className="flex flex-wrap gap-2">
            {session.profile.coreSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300"
              >
                {skill}
              </span>
            ))}
          </div>
```

- [ ] **Step 3.3: Run the full test suite**

```bash
cd src/web && npm test
```

Expected output: **all tests pass** including the pre-existing `AnalyzeStep` tests. If any `AnalyzeStep` test breaks, check that the JSX structure around the result card is intact.

---

## Task 4: Final verification

- [ ] **Step 4.1: TypeScript check**

```bash
cd src/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4.2: Verify acceptance criteria**

Confirm each item is met before marking the task done:

- [ ] `SeniorityBadge` and `ConfidenceBadge` exported from `src/web/src/components/ui/StatBadge.tsx`
- [ ] Seniority color: purple for Senior/Architect/Software Designer, blue for Semi Senior variants, gray for all others
- [ ] Confidence color: green ≥80%, yellow 60–79%, red <60%
- [ ] Badge row appears **above** the skill chips in the result card
- [ ] Plain-text seniority/confidence line is gone from `AnalyzeStep.tsx`
- [ ] All unit tests pass (`npm test` exits 0)
- [ ] TypeScript check passes (`npx tsc --noEmit` exits 0)
