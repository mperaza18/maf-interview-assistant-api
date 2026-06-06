# Delete Session Functionality — Design Spec
Ticket: KAN-18
Date: 2026-05-27

## Summary

Add a delete action to each session card on the HomeScreen (Sessions List). The action shows a confirmation dialog before removing the session from localStorage and React state.

---

## Files Changed

| File | Change |
|---|---|
| `src/web/src/store/sessionReducer.ts` | Add `DELETE_SESSION` action |
| `src/web/src/pages/HomeScreen.tsx` | Add delete icon button, local sessions state, dialog trigger, delete handler |
| `src/web/src/components/ui/ConfirmDeleteDialog.tsx` | New — reusable confirmation dialog |

---

## 1. Reducer — `DELETE_SESSION` action

Add to `SessionAction` union:

```ts
| { type: 'DELETE_SESSION'; id: string }
```

Reducer case: if `state.current?.id === action.id` return `{ current: null }`, otherwise return `state` unchanged. This handles the edge case where the user navigates back home with an active session and then deletes that same session.

---

## 2. `ConfirmDeleteDialog` component

**Location:** `src/web/src/components/ui/ConfirmDeleteDialog.tsx`

**Library:** `@base-ui/react` Dialog (already installed). Handles focus trapping, `Escape` key, and focus restoration natively.

**Props:**
```ts
interface ConfirmDeleteDialogProps {
  open: boolean
  candidateName: string
  onCancel: () => void
  onConfirm: () => void
}
```

**Behavior:**
- Backdrop: semi-transparent overlay (`bg-black/50`)
- Panel: uses `bg-background`, `border-border`, `text-foreground` — no hardcoded colors, inherits light/dark theme automatically
- Title: "Delete session?"
- Body: "This will permanently remove **{candidateName || 'this session'}**."
- Buttons: "Cancel" (ghost variant) and "Delete" (destructive — `bg-destructive text-destructive-foreground`)
- Pressing Escape or clicking Cancel calls `onCancel`
- Clicking Delete calls `onConfirm`

**Accessibility:**
- `aria-label="Delete session"` on the confirm button
- Focus trap active while dialog is open
- Focus returns to the trash button that opened the dialog on close

---

## 3. `HomeScreen` modifications

### Sessions state

Convert the direct `repository.list()` call to local state for optimistic updates:

```ts
const [sessions, setSessions] = useState(() => repository.list())
```

### Delete dialog state

```ts
const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
const pendingSession = sessions.find(s => s.id === pendingDeleteId) ?? null
```

### Trash icon button (per card)

Added to the right side of each card, alongside the existing Resume/View button:

```tsx
<button
  aria-label="Delete session"
  onClick={(e) => { e.stopPropagation(); setPendingDeleteId(session.id) }}
  className="opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
>
  <Trash2 size={16} />
</button>
```

- The card wrapper gets `group` class added to its className.
- Mobile-first: always visible by default.
- Desktop (≥ `md`): hidden until card hover via `md:opacity-0 md:group-hover:opacity-100`.

### `handleDelete` function

```ts
function handleDelete(id: string) {
  repository.delete(id)
  setSessions(prev => prev.filter(s => s.id !== id))
  dispatch({ type: 'DELETE_SESSION', id })
  setPendingDeleteId(null)
}
```

Execution order: persist deletion first, then update UI state, then clear pending state.

### Dialog render

```tsx
<ConfirmDeleteDialog
  open={pendingDeleteId !== null}
  candidateName={pendingSession?.candidateName ?? ''}
  onCancel={() => setPendingDeleteId(null)}
  onConfirm={() => handleDelete(pendingDeleteId!)}
/>
```

---

## Data Flow

```
User clicks trash icon
  → setPendingDeleteId(session.id)
  → dialog opens with candidate name

User clicks "Delete"
  → repository.delete(id)       [localStorage updated immediately]
  → setSessions(filter)          [card removed from list]
  → dispatch DELETE_SESSION      [clears current session if id matches]
  → setPendingDeleteId(null)     [dialog closes]

User clicks "Cancel" or presses Escape
  → setPendingDeleteId(null)     [dialog closes, no changes]
```

---

## Theme Compliance

All color values use Tailwind CSS token classes that resolve to CSS custom properties:

| Token | Purpose |
|---|---|
| `bg-background` | Dialog panel background |
| `border-border` | Dialog panel border |
| `text-foreground` | Dialog body text |
| `text-muted-foreground` | Trash icon default color |
| `text-destructive` | Trash icon hover + Delete button text |
| `bg-destructive` | Delete button background |

No hardcoded hex/rgb values anywhere.

---

## Acceptance Criteria Mapping

| AC | Implementation |
|---|---|
| Trash icon visible on hover (desktop), always (mobile) | `opacity-100 md:opacity-0 md:group-hover:opacity-100` |
| Confirmation dialog with candidate name, Cancel, Delete | `ConfirmDeleteDialog` component |
| Cancel / Escape closes without deleting | `onCancel → setPendingDeleteId(null)` |
| Delete removes immediately + persists on refresh | `repository.delete` + `setSessions(filter)` |
| Light/dark mode support | Tailwind token classes only |
| All cards deletable (including Complete status) | Delete button rendered for all cards regardless of status |
| `aria-label="Delete session"` on trash button | Explicit `aria-label` on `<button>` |
| Focus trap while dialog open + restore on close | Base UI Dialog handles natively |
