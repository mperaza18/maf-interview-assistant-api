# Step Indicator Visual States — Design Spec

**Jira:** KAN-9
**Date:** 2026-05-16
**Status:** Approved

---

## Problem

The 4-step progress indicator renders only one visual state for non-active steps — completed and upcoming steps look identical (gray circle + muted label). Users get no sense of progress through the wizard.

---

## Goal

Implement three distinct visual states for the `Stepper` component and allow navigating back to completed steps by clicking them.

---

## Visual States

| State     | Circle                                        | Label                    | Connector line |
|-----------|-----------------------------------------------|--------------------------|----------------|
| Completed | Purple fill + white checkmark                 | Purple, semi-bold        | Purple fill    |
| Active    | Purple fill + white number + outer glow ring  | White, semi-bold         | —              |
| Upcoming  | Dark surface + gray number                    | Muted gray, regular      | Gray           |

The connector between a completed step and the active step fills purple. All other connectors remain gray.

---

## Architecture

### Changes to `src/web/src/components/Stepper.tsx`

- Accept a new optional prop: `onStepClick?: (step: 1 | 2 | 3 | 4) => void`
- When `onStepClick` is provided, completed step circles become clickable (`cursor-pointer`, `onClick` dispatches the step)
- Active and upcoming steps are never clickable
- Fix completed label color: `text-indigo-400 font-semibold` (was `text-slate-500`)

### Changes to `src/web/src/App.tsx`

- Pass `onStepClick` to `<Stepper>`:

```tsx
<Stepper
  currentStep={step}
  onStepClick={(s) => dispatch({ type: 'SET_STEP', step: s })}
/>
```

No changes needed to `SessionContext`, `sessionReducer`, or any page component. `SET_STEP` already exists in the reducer.

---

## Behavior

- Clicking a completed step dispatches `SET_STEP` and immediately renders that step's page component
- Active and upcoming steps are non-interactive
- If `onStepClick` is not provided (e.g., in tests or Storybook), the Stepper degrades gracefully — no click handlers attached

---

## Files Changed

| File | Change |
|------|--------|
| `src/web/src/components/Stepper.tsx` | Add `onStepClick` prop, fix completed label styling, add click handler |
| `src/web/src/App.tsx` | Pass `onStepClick` callback to `<Stepper>` |

---

## Out of Scope

- Adding tests for `Stepper` (existing test suite does not cover it; adding tests is a separate concern)
- Animating the connector fill transition (CSS `transition-colors` already handles this)
- Any changes to page components or the session data model
