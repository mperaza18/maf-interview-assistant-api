# KAN-7: Constrain and Center Layout with Max-Width Container

**Date:** 2026-05-15
**Jira:** KAN-7 (parent: KAN-2 UI/UX Redesign)
**Scope:** Frontend only — two files

---

## Problem

Content stretches edge-to-edge on wide screens (current `max-w-4xl` = 896px), leaving large dead zones. The Upload PDF button and Target Role input sit in an unbounded grid with no visual grouping.

## Solution

Two targeted changes:

### 1. Narrow the root container — `src/web/src/App.tsx`

Change the container class from `max-w-4xl` (896px) to `max-w-[760px]`:

```diff
- <div className="mx-auto max-w-4xl px-4 py-8">
+ <div className="mx-auto max-w-[760px] px-4 py-8">
```

All steps automatically inherit the narrower constraint — no per-step changes needed.

### 2. Card-wrap the form inputs — `src/web/src/pages/AnalyzeStep.tsx`

Wrap the Upload PDF + Target Role grid in a card shell that matches the existing result card style (`rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-4`). No logic changes.

---

## Acceptance Criteria

- All content on every step sits inside a centered 760px container
- On screens wider than 760px, empty space fills the sides — no content stretches full-width
- Upload PDF and Target Role are visually grouped in one card
- Layout is responsive down to 768px tablet (`px-4` padding means ~736px effective content width)

---

## Constraints

- Keep `px-4` padding (not `px-6`) — per user decision
- No new components or abstractions
- No logic or data-flow changes
