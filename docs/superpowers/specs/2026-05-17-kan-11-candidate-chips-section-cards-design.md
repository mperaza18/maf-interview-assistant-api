# KAN-11: Replace Candidate Paragraph with Chips and Add Total Duration Badge

**Date:** 2026-05-17
**Jira:** KAN-11
**Branch:** feat/KAN-11-Improve-Candidates-Section

## Problem

The candidate summary in PlanStep is a dense paragraph that slows interviewers. There is no total duration indicator, and section cards have no visual differentiation by category type.

## Solution Overview

Three changes to `PlanStep.tsx` + one new component:

1. New `CandidateChips` component replacing the summary paragraph
2. Total duration badge next to the "Interview Plan" heading
3. Individual section cards with name-based left-border color accents and category icons

## What Is Already Done

- `ROUND_COLORS` array (`['#6c47ff', '#14abab', '#22c467', '#e9ad1c']`) is already defined with the correct palette
- Each round already receives a colored dot indicator and colored name label
- `InterviewRound.durationMinutes` is present in the backend model and frontend types

## What Needs to Be Built

### 1. Category Resolver Utility

A `resolveCategory(name: string)` function added to `PlanStep.tsx`. It lowercases the round name and keyword-matches to return `{ color, icon }`:

| Keywords | Color | Icon |
|---|---|---|
| `experience`, `background`, `behavioral` | `#6c47ff` | `◎` |
| `system`, `design`, `architecture` | `#14abab` | `⬡` |
| `values`, `culture`, `fit` | `#e9ad1c` | `◇` |
| _(fallback)_ | `#22c467` | `●` |

Replaces the current positional `ROUND_COLORS[i % ROUND_COLORS.length]` index lookup. The `ROUND_COLORS` constant is removed.

### 2. `CandidateChips` Component

**File:** `src/web/src/components/ui/CandidateChips.tsx`

**Props:**
```ts
interface CandidateChipsProps {
  role: string
  yearsExperience?: number
  topSkills: string[]  // caller passes first 3 from coreSkills
}
```

**Renders 3 chips inline:**
- **Role** — purple-tinted pill: `bg-violet-900/40 text-violet-300 border border-violet-700/50`
- **Years Exp** — surface pill: `bg-slate-700 text-slate-300`, e.g. `5 yrs exp`. Hidden if `yearsExperience` is undefined.
- **Top Skills** — surface pill: first 3 skills joined with ` · `

**Placement in `PlanStep.tsx`:** directly below the heading row (h2 + duration badge), replacing the `<p className="text-sm text-slate-400 mt-0.5">{session.plan.summary}</p>` paragraph entirely. Rendered using `session.profile` and `session.role`.

### 3. Duration Badge

Added inline to the `<h2>Interview Plan</h2>` row as a flex container:

```
[h2: Interview Plan]   [pill: 45 min total]
```

Computation: `session.plan.rounds.reduce((sum, r) => sum + r.durationMinutes, 0)` → formatted as `"{N} min total"`.

Style: `bg-slate-700 text-slate-300 text-xs font-medium px-2.5 py-0.5 rounded-full`. Only rendered when `session.plan` is available.

### 4. Individual Section Cards with Left-Border Accents

The single unified "Interview Questions" card is replaced with one card per round via `.map()`.

**Each card:**
- Base: `rounded-xl border border-slate-700 bg-slate-800/80 p-5`
- Left accent: `border-l-[3px]` + inline `style={{ borderLeftColor: color }}` (overrides the left border width and color)
- Header row: `{icon} {round.name}` (icon and name colored), with `({round.durationMinutes} min)` in muted `text-slate-500`
- Numbered question list below (unchanged from current)

The `ref={roundsRef}` (used for scroll-on-revise) moves to a wrapper `<div>` containing all section cards.

The `<h3>Interview Questions</h3>` label inside the old unified card is removed; section card headers replace it.

## Files Changed

| File | Action |
|---|---|
| `src/web/src/pages/PlanStep.tsx` | Modify — add `resolveCategory`, duration badge, `CandidateChips`, split cards |
| `src/web/src/components/ui/CandidateChips.tsx` | Create — new component |

## Acceptance Criteria Mapping

| Criterion | Design decision |
|---|---|
| Candidate chips below page title, replacing paragraph | `CandidateChips` rendered from `session.profile`; `summary` paragraph removed |
| Total duration badge sums dynamically | `rounds.reduce(...)` on `durationMinutes` |
| 3px left-border accent in section's accent color | `border-l-[3px]` + inline `borderLeftColor` per card |
| Category icon next to section title | `resolveCategory` returns icon; rendered in card header |

## Out of Scope

- Accordion / collapsible section cards
- Changes to backend models
- Changes to `SessionStep.tsx` or `EvaluationStep.tsx`
