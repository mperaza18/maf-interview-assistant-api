# KAN-4: Per-round Interview Notes — Design Spec

**Date:** 2026-05-07
**Ticket:** KAN-4
**Status:** Approved

## Problem

Step 3 (Live Session) has a single shared textarea for all interview notes. Gate Keepers (GKs) need to capture observations per interview round so that notes stay contextually tied to the questions being asked.

## Solution

Replace the single notes textarea with a tabbed interface — one tab per interview round. Each tab shows that round's questions and a dedicated notes textarea. On "Complete Interview", all per-round notes are condensed into a single formatted string and sent to the evaluator API unchanged.

## Architecture

### Scope

Frontend-only change. No backend modifications required. The evaluator API continues to receive `notes: string` in the same format.

### Files changed

| File | Change |
|------|--------|
| `src/web/src/types/index.ts` | Add `roundNotes: Record<string, string>` to `Session` |
| `src/web/src/store/sessionReducer.ts` | Add `SET_ROUND_NOTE` action and reducer case |
| `src/web/src/pages/SessionStep.tsx` | Replace single textarea with tabbed per-round UI |
| `src/web/src/pages/HomeScreen.tsx` | Include `roundNotes: {}` in the `CREATE_SESSION` dispatch (the only call-site) |
| `src/web/src/store/sessionReducer.test.ts` | Add test case for `SET_ROUND_NOTE` |

### State shape

Add to `Session` in `types/index.ts`:
```ts
roundNotes: Record<string, string>  // keyed by InterviewRound.name
```

New reducer action:
```ts
| { type: 'SET_ROUND_NOTE'; roundName: string; note: string }
```

Reducer case:
```ts
case 'SET_ROUND_NOTE':
  if (!state.current) return state
  return {
    current: {
      ...state.current,
      roundNotes: { ...state.current.roundNotes, [action.roundName]: action.note },
    },
  }
```

`LocalStorageSessionRepository` requires no changes — it serializes the full `Session` object, so `roundNotes` persists automatically.

### Backward compatibility

Existing sessions in localStorage predate `roundNotes`. The component reads it as `session.roundNotes ?? {}` to handle `undefined` gracefully without migration logic.

## UI Design

### Layout

Replace the current 2-column grid (questions left, single textarea right) with a full-width single-column layout:

1. **Tab bar** — one tab per `session.plan.rounds` entry, displayed by `round.name`. Active tab: indigo text + 2px bottom border. Inactive tabs: muted slate text. Tabs-only navigation (no prev/next buttons).
2. **Active tab body** — round name + duration header, bullet questions (same rendering as today), then a `Notes` label and `Textarea` below.
3. **"Complete Interview →" button** — bottom right, unchanged position.

Active tab index is tracked via `useState<number>` (local state, not persisted — resets to tab 0 on refresh, which is fine).

### Textarea binding

```tsx
value={(session.roundNotes ?? {})[round.name] ?? ''}
onChange={(e) => dispatch({ type: 'SET_ROUND_NOTE', roundName: round.name, note: e.target.value })}
```

### Condensing on "Complete Interview"

```ts
const condensed = session.plan.rounds
  .filter((r) => (session.roundNotes ?? {})[r.name]?.trim())
  .map((r) => `[${r.name}]\n${(session.roundNotes ?? {})[r.name].trim()}`)
  .join('\n\n')

dispatch({ type: 'SET_NOTES', notes: condensed })
dispatch({ type: 'SET_STEP', step: 4 })
```

Rounds with empty or whitespace-only notes are omitted. The resulting string format:

```
[Technical Assessment]
Candidate gave a solid REST explanation but was vague on GraphQL trade-offs.

[Behavioral]
Strong answer on conflict resolution. Gave a concrete STAR example.
```

`EvaluationStep` reads `session.notes` as always — no changes needed there.

## Data Flow

```
GK types in tab textarea
  → dispatch SET_ROUND_NOTE
    → roundNotes updated in Session
      → persisted to localStorage automatically

GK clicks "Complete Interview"
  → condense roundNotes → notes string
  → dispatch SET_NOTES
  → dispatch SET_STEP(4)
    → EvaluationStep calls evaluate(profile, plan, notes)
```

## Testing

- `sessionReducer.test.ts`: add one test for `SET_ROUND_NOTE` — verifies that a round note is merged into `roundNotes` without affecting other session fields.
- No new component test file is required by this ticket.
- Manual verification: confirm notes persist on page refresh, confirm condensed string is visible in the network request to `POST /api/interview/evaluate`.

## Out of Scope

- Notes validation (requiring non-empty notes before completing)
- Character limits per round
- Note autosave indicator beyond the existing "Notes are saved automatically." label
- Any backend changes
