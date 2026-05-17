# KAN-10 — Resurface Revise Plan Bar

**Date:** 2026-05-16
**Ticket:** KAN-10 (parent: KAN-2 UI/UX Redesign)
**File:** `src/web/src/pages/PlanStep.tsx`

---

## Problem

The "Revise Plan" input sits at the bottom of the plan list with a muted gray outline button that looks disabled even when clickable. Users scroll past it without noticing it exists. The button's visual state doesn't communicate that it's an active, primary action.

---

## Solution

Replace the bare flex row with a styled gradient banner (Option C from brainstorm), add a "✦ Revise Plan" label above the input, upgrade the button to the primary indigo style, and scroll the user back to the top of the round cards after each revision completes.

---

## Design

### 1. Revise bar — restyled in place

The existing `<div className="flex gap-2">` block (currently lines 90–106) becomes a gradient card. No structural change to where it lives in the layout — it stays between the round cards and the "Start Interview" CTA.

**Card wrapper:**
```
rounded-lg border border-indigo-500/40 bg-gradient-to-br from-indigo-950/60 to-slate-800/80 p-4 space-y-3
```

**Label above input row:**
```tsx
<p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">✦ Revise Plan</p>
```

**Input row:** unchanged flex layout, input styling unchanged.

**Button:** remove `variant="outline"`, replace className with:
```
bg-indigo-600 hover:bg-indigo-700 text-white shrink-0
```
Disabled state: `disabled={!feedback.trim() || revising}` — unchanged logic, but now the button is visually indigo (not gray) when enabled.

### 2. Placeholder text

Update to match ticket exactly:
```
'Revise plan, e.g. "add more system design questions"'
```

### 3. Scroll to top of round cards on revision

Add a ref to the rounds container:
```tsx
const roundsRef = useRef<HTMLDivElement>(null)
```

Attach to the rounds wrapper:
```tsx
<div ref={roundsRef} className="space-y-3">
  {session.plan.rounds.map(...)}
</div>
```

In `handleRevise`, after dispatching the updated plan:
```tsx
dispatch({ type: 'SET_PLAN', plan: revised })
setFeedback('')
roundsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
```

The scroll fires after the async API call returns and state is updated, so the DOM reflects the new plan by the time `scrollIntoView` runs.

---

## Acceptance Criteria (from ticket)

| # | Criterion | How it's met |
|---|-----------|--------------|
| 1 | Revise bar always visible above primary CTA on all viewport widths | Position unchanged — already above Start Interview CTA |
| 2 | Button uses purple style, never visually disabled unless input is empty | `bg-indigo-600`, disabled only when `!feedback.trim()` |
| 3 | Placeholder: `Revise plan, e.g. "add more system design questions"` | Updated verbatim |
| 4 | On submission, page scrolls to top of updated cards | `scrollIntoView` on `roundsRef` in `handleRevise` |

---

## Files Changed

| File | Change |
|------|--------|
| `src/web/src/pages/PlanStep.tsx` | Restyle revise bar, update placeholder, add `roundsRef`, scroll on revision |

---

## Out of Scope

- No new components extracted
- No backend changes
- No changes to `handleRevise` logic, error handling, or API calls
