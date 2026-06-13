# App Shell Redesign — Sidebar Navigation Layout (KAN-24)

**Date:** 2026-06-12
**Ticket:** [KAN-24](https://miguelperaza18.atlassian.net/browse/KAN-24)
**Design reference:** [Figma — Interview Assistant UI Redesign](https://www.figma.com/design/mXasWj8lUQdu8aneORFiaN/Interview-Assistant-%E2%80%94-UI-Redesign?node-id=103-2) — "SmartFitter · JD Matching" frames (Dark `101:2`, Light `101:3`)

## Problem

The app currently renders inside a centered `max-w-[760px]` column with a top `Navbar` (back link + title + theme toggle), switching between views (`home`, `wizard`, `jdMatch`) via a `useState` value in `App.tsx`. There is no router and no sidebar.

The Figma redesign reframes the entire app inside a new shell: a fixed 240px left sidebar (SmartFitter branding, five nav items, user footer) with the active section highlighted, and the theme toggle moved into the content area's top-right. The whole product also moves from the current navy accent to a violet accent.

## Goals

- Build a sidebar navigation shell matching the Figma in both dark and light themes.
- Migrate existing views into the shell with no loss of functionality.
- Introduce routing so each section is a URL with route-derived active state.
- Adopt the violet / "SmartFitter" branding app-wide.

## Non-Goals (tracked separately)

- **Responsive / collapsible sidebar** for mobile — [KAN-25](https://miguelperaza18.atlassian.net/browse/KAN-25). This ticket targets the desktop layout (Figma is 1440px).
- **Candidate Matches + Radar screen** — [KAN-26](https://miguelperaza18.atlassian.net/browse/KAN-26). The Candidates nav item routes to a placeholder until that ticket lands.

## Decisions

| Decision | Choice |
|---|---|
| Nav scope | Render all 5 items per Figma; placeholder the sections without backing views |
| Routing | Add `react-router-dom` v6; route-derived active state |
| Branding | Adopt violet (`#7c5cfc`) primary + "SmartFitter" naming app-wide |
| User footer | Static placeholder (no auth exists) |
| Responsive | Desktop only; mobile drawer is KAN-25 |

## Navigation Map

| Sidebar item | Route | Content | Icon (lucide) |
|---|---|---|---|
| Dashboard | `/dashboard` | Coming-soon placeholder | `LayoutDashboard` |
| Jobs & JDs | `/jobs` | JD Matching flow (`JdMatchProvider` + `JdMatchFlow`) | `Briefcase` |
| Candidates | `/candidates` | Placeholder titled "Candidate Matches" (real screen = KAN-26) | `Users` |
| Interviews | `/interviews` | Session list + interview wizard (`Stepper` + Analyze→Plan→Session→Evaluate) | `ClipboardList` |
| Settings | `/settings` | "Coming soon" placeholder | `Settings` |

`/` redirects to `/interviews`.

## Architecture

### Routing

- Add `react-router-dom`. `main.tsx` wraps the tree in `<BrowserRouter>`.
- `App.tsx` keeps the global providers (`ThemeProvider`, `SessionContext.Provider`, the reducer + localStorage persistence effect) and renders the route tree inside `<AppShell>`.
- Route tree:

```text
<AppShell>                        // layout: sidebar + <Outlet/>
  index            → <Navigate to="/interviews" replace />
  /dashboard       → <Placeholder title="Dashboard" />
  /jobs            → <JobsPage />          // JdMatchProvider + JdMatchFlow
  /candidates      → <Placeholder title="Candidate Matches" />
  /interviews      → <InterviewsPage />    // Session list + wizard steps
  /settings        → <Placeholder title="Settings" />
  *                → <Navigate to="/interviews" />
</AppShell>
```

- Active nav state derives from the current route via `NavLink`'s `isActive`.
- The interview wizard's internal step stays reducer-driven (`state.current.currentStep`) exactly as today — routing changes only the top-level section, not the wizard's internal stepping.
- When navigating to `/interviews` with no active session, render the session list (`HomeScreen`) instead of redirecting.

### New components — `src/web/src/components/shell/`

- **`AppShell.tsx`** — `flex min-h-screen`. Left: `<Sidebar>` (fixed `w-60` / 240px). Right: `flex-1` scrollable `<main>` containing a slim top bar with the theme toggle floated right, then `<Outlet/>`. Replaces the centered `max-w-[760px]` wrapper and the old `Navbar`.
- **`Sidebar.tsx`** — violet "SF" logo tile + "SmartFitter" wordmark (top), the nav list (middle), and `<UserFooter>` (bottom, pinned). Right border divider.
- **`SidebarNavItem.tsx`** — `NavLink` wrapping a lucide icon + label; applies active styling (violet pill background, violet text/icon) vs. inactive (muted grey).
- **`UserFooter.tsx`** — circular "HR" avatar, "HR Manager", "hr@smartfitter.com". Static.
- **`Placeholder.tsx`** — centered empty state (icon + title + "Coming soon" copy) used by Candidates and Settings.

### Pages

- **`DashboardPage.tsx`** — wraps the existing `HomeScreen`. `onNew`/`onLoad`/`onNewJdMatch` become `navigate('/interviews')` / `navigate('/jobs')` after dispatching the session action. "Back to home" actions become `navigate('/dashboard')`.
- **`InterviewsPage.tsx`** — the `Stepper` + step switch currently inline in `App.tsx`.
- **`JobsPage.tsx`** — `JdMatchProvider` + `JdMatchFlow`.

The old `Navbar.tsx` is removed; its theme toggle moves into `AppShell`'s top bar, and its "← Sessions" back affordance is replaced by sidebar navigation.

## Theming / Tokens

Update `src/web/src/index.css` and (if needed) `tailwind.config.ts`:

- Set `--primary` to violet for both `:root` and `.dark`: `#7c5cfc` ≈ `hsl(252 95% 67%)`, with `--primary-foreground` white. This shifts buttons, the stepper, and badges app-wide to match the mockup.
- Add sidebar-scoped tokens (both themes):

| Token | Dark | Light |
|---|---|---|
| `--sidebar-bg` | `#0d1220` | near-white (`#ffffff`) |
| `--sidebar-border` | `#232b3d` | light grey (`#e8eaf0`) |
| `--sidebar-active-bg` | `#241f3d` | `#ede9fe` |
| active text/icon | `#7c5cfc` | `#7c5cfc` |
| inactive text | `#8b93a7` | muted grey |
| footer name / email | `#f5f7fa` / `#5c6478` | dark / muted |

- Logo tile background = violet `#7c5cfc`, "SF" text white; "SmartFitter" wordmark violet, bold.
- Rename the app title "Interview Assistant" → "SmartFitter".

(Exact light-mode sidebar values to be confirmed against the Figma light frame `103:64` during implementation; the table captures the intent.)

## Error Handling / Edge Cases

- Unknown route → redirect to `/interviews`.
- `/interviews` with no session in state → redirect to `/dashboard`.
- Theme toggle continues to operate on `documentElement` `.dark` class via the existing `ThemeProvider`; placement moves but behavior is unchanged.
- Session persistence (localStorage effect) is unaffected — it stays in `App.tsx` above the router.

## Testing

- **`Sidebar`**: renders all five nav items; the item matching the current route is marked active (render under `MemoryRouter` with different `initialEntries`).
- **Navigation**: clicking a nav item changes the rendered page (assert content swap under a test router).
- **Guard**: visiting `/interviews` with no active session lands on the dashboard.
- **Theme**: toggle works inside the shell; sidebar renders correctly in both `.dark` and light.
- **Existing page tests** (`AnalyzeStep`, `PlanStep`, `JdMatchFlow`, `Stepper`, `Navbar`): update to wrap components in a router provider where needed; remove/replace `Navbar` tests as the component is deleted.
- All backend tests untouched (frontend-only change).

## Out of Scope

- Mobile/collapsible sidebar (KAN-25).
- Real Candidate Matches + Radar screen (KAN-26).
- Real authentication / dynamic user footer.
- Dashboard, Settings content beyond the placeholder.
