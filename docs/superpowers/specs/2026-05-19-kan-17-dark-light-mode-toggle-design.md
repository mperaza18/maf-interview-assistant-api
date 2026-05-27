# KAN-17: Dark/Light Mode Toggle — Design Spec

**Date:** 2026-05-19
**Ticket:** KAN-17 — Add dark/light mode toggle to MatchHire global header
**Parent:** KAN-2 — UI/UX Redesign — Interview Assistant

---

## Problem

The app renders in a single fixed dark theme with no way for users to switch. Users in bright environments or who prefer light UIs have no recourse, and the app ignores OS-level display preferences entirely.

---

## Solution Overview

Add a `ThemeContext` that manages a `'light' | 'dark'` state, initialises from `localStorage` (falling back to `prefers-color-scheme`), and applies the active theme by toggling the `dark` class on `document.documentElement`. Mount a `ThemeToggle` icon button in a new `Navbar` component that appears on every page. Migrate all hardcoded `slate-*` Tailwind colour classes across the app to CSS-variable-based classes so the toggle produces a complete, consistent theme switch.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Color migration scope | Full (CSS variables) | Minimal scope leaves light mode broken; CSS variables already defined in `index.css` |
| Color strategy | CSS variable classes (`bg-background`, `text-foreground`, etc.) | Aligns with the existing shadcn/ui design system; no new CSS needed |
| OS preference | Read `prefers-color-scheme` on first load | Standard modern pattern; costs ~3 lines; improves first-visit UX |
| Toggle icon | Moon (dark mode) / Sun (light mode) | Natural mental model: icon shows what you'll switch TO |
| Persistence | `localStorage` key `theme` | Per the ticket spec |
| Dark class target | `document.documentElement` (`<html>`) | Tailwind `darkMode: ['class']` is already configured to look here |

---

## Architecture

### New Files

#### `src/web/src/context/ThemeContext.tsx`

Manages `theme: 'light' | 'dark'` state.

**Init logic (in order):**
1. Read `localStorage.getItem('theme')` — use it if `'light'` or `'dark'`
2. Fall back to `window.matchMedia('(prefers-color-scheme: dark)').matches` → `'dark'` or `'light'`

**On every theme change:**
- Toggle `dark` class on `document.documentElement`
- Write new value to `localStorage` (wrapped in `try/catch` — private browsing can throw)

**Exports:**
- `ThemeProvider` — wraps the component tree
- `useTheme()` — returns `{ theme, toggleTheme }`

#### `src/web/src/components/ui/ThemeToggle.tsx`

Icon button component.

- Uses `Sun` and `Moon` from `lucide-react`
- Calls `useTheme()` — renders `Moon` in dark mode, `Sun` in light mode
- `aria-label`: `"Switch to light mode"` or `"Switch to dark mode"` (reflects the action, not the current state)
- Keyboard accessible: `<button>` element, focusable, activates on Enter/Space natively
- Styling: no background, `hover:bg-accent` subtle highlight, `rounded-md p-1.5`

#### `src/web/src/components/Navbar.tsx`

Extracted from the inline header in `App.tsx`.

Props:
```ts
interface NavbarProps {
  onBack?: () => void   // undefined → home view (back slot is a spacer)
}
```

Layout — 3-column flex row:
- Left: `← Sessions` button (shown when `onBack` is defined) or transparent spacer div
- Centre: `Interview Assistant` title
- Right: `<ThemeToggle />`

The spacer div on the left when `onBack` is undefined matches the width of the back button so the title stays visually centred.

---

### Modified Files

#### `src/web/src/App.tsx`
- Wrap component tree with `<ThemeProvider>`
- Root div: `bg-slate-950 text-slate-100` → `bg-background text-foreground`
- Replace inline header block with `<Navbar onBack={view === 'wizard' ? handleBackToHome : undefined} />`

#### Color migration — 9 files

**Colour class mapping:**

| Hardcoded class | Replacement |
|---|---|
| `bg-slate-950` | `bg-background` |
| `bg-slate-900` | `bg-background` |
| `bg-slate-800`, `bg-slate-800/50`, `bg-slate-800/80` | `bg-card`, `bg-card/50`, `bg-card/80` |
| `bg-slate-700` | `bg-muted` |
| `border-slate-700`, `border-slate-600` | `border-border` |
| `text-slate-100`, `text-slate-200` | `text-foreground` |
| `text-slate-300` | `text-foreground/80` |
| `text-slate-400`, `text-slate-500` | `text-muted-foreground` |
| `text-slate-600` | `text-muted-foreground/60` |
| `ring-offset-slate-950` | `ring-offset-background` |
| `placeholder:text-slate-500`, `placeholder:text-slate-600` | `placeholder:text-muted-foreground` |
| `hover:bg-slate-700` | `hover:bg-muted` |
| `hover:bg-slate-800` | `hover:bg-card` |
| `hover:text-slate-200` | `hover:text-foreground` |

**Files to migrate:**
- `src/web/src/App.tsx`
- `src/web/src/pages/HomeScreen.tsx`
- `src/web/src/pages/AnalyzeStep.tsx`
- `src/web/src/pages/PlanStep.tsx`
- `src/web/src/pages/SessionStep.tsx`
- `src/web/src/pages/EvaluationStep.tsx`
- `src/web/src/components/Stepper.tsx`
- `src/web/src/components/ui/CandidateChips.tsx`
- `src/web/src/components/ui/StatBadge.tsx`
- `src/web/src/components/LoadingSpinner.tsx`

---

## Data Flow

```
ThemeProvider (wraps App)
  └── reads localStorage / prefers-color-scheme on mount
  └── sets document.documentElement.classList toggle('dark')
  └── exposes { theme, toggleTheme } via context

Navbar
  └── renders ThemeToggle in right slot

ThemeToggle
  └── useTheme() → theme, toggleTheme
  └── click → toggleTheme() → ThemeContext updates class + localStorage
```

---

## Error Handling

- `localStorage` access is wrapped in `try/catch` — silently falls back to in-memory state in private browsing or restricted environments
- No other failure modes: `prefers-color-scheme` is universally supported; class toggling on `<html>` is synchronous and cannot fail

---

## Acceptance Criteria (from ticket)

- [ ] Sun/moon toggle visible in top-right of header on every page
- [ ] Clicking toggle switches entire site between light and dark instantly, no reload
- [ ] Chosen theme persists across page refreshes (localStorage)
- [ ] Light mode matches Figma mockup (node 62-2)
- [ ] Dark mode appearance unchanged from current design (node 2-2)
- [ ] Toggle is keyboard-accessible with correct `aria-label`

---

## Figma References

- **Dark mode (current):** [Sessions List — Redesign, node 2-2](https://www.figma.com/design/mXasWj8lUQdu8aneORFiaN/Interview-Assistant-%E2%80%94-UI-Redesign?node-id=2-2)
- **Light mode (new):** [Sessions List — Light Mode, node 62-2](https://www.figma.com/design/mXasWj8lUQdu8aneORFiaN/Interview-Assistant-%E2%80%94-UI-Redesign?node-id=62-2)

---

## Out of Scope

- Animating the theme transition (cross-fade, etc.)
- Per-component theme overrides
- Admin or system-level theme enforcement
