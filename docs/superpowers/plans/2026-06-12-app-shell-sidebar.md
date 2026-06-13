# App Shell Sidebar Navigation — Implementation Plan (KAN-24)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the centered top-navbar layout with a fixed left-sidebar app shell (SmartFitter branding, 5 nav items, user footer, content-area theme toggle), routed via react-router, with the violet brand applied app-wide.

**Architecture:** Introduce `react-router-dom` v6. `main.tsx` wraps the app in `<BrowserRouter>`; `App.tsx` keeps global providers (theme, session, persistence) and renders a `<Routes>` tree inside a new `<AppShell>` layout that pairs `<Sidebar>` with an `<Outlet>`. Existing views become routed page wrappers; the interview wizard keeps its reducer-driven internal stepping.

**Tech Stack:** React 18 + TypeScript + Vite, Tailwind (CSS-var tokens), shadcn/ui, lucide-react, react-router-dom (new), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-12-app-shell-sidebar-design.md`

---

## File Structure

**Create:**
- `src/web/src/components/shell/navItems.ts` — nav item config (route, label, icon)
- `src/web/src/components/shell/SidebarNavItem.tsx` — single nav link with active state
- `src/web/src/components/shell/UserFooter.tsx` — static user footer
- `src/web/src/components/shell/Sidebar.tsx` — logo + nav list + footer
- `src/web/src/components/shell/Placeholder.tsx` — "coming soon" empty state
- `src/web/src/components/shell/AppShell.tsx` — sidebar + content + theme toggle layout
- `src/web/src/pages/DashboardPage.tsx` — wraps `HomeScreen`, provides navigation callbacks
- `src/web/src/pages/InterviewsPage.tsx` — wizard stepper + steps (with session guard)
- `src/web/src/pages/JobsPage.tsx` — `JdMatchProvider` + `JdMatchFlow`
- Test files alongside each component/page below.

**Modify:**
- `src/web/src/main.tsx` — wrap `<App/>` in `<BrowserRouter>`
- `src/web/src/App.tsx` — providers + `<Routes>` (replaces view-switch state)
- `src/web/src/index.css` — violet `--primary` + sidebar tokens (both themes)
- `src/web/package.json` — add `react-router-dom`

**Delete:**
- `src/web/src/components/Navbar.tsx` and `src/web/src/components/Navbar.test.tsx`

All commands run from `src/web/`.

---

## Task 1: Install react-router-dom and wrap the app in a Router

**Files:**
- Modify: `src/web/package.json`
- Modify: `src/web/src/main.tsx`

- [ ] **Step 1: Install the dependency**

Run: `npm install react-router-dom@^6`
Expected: `package.json` gains `"react-router-dom": "^6.x"` under dependencies; install completes without errors.

- [ ] **Step 2: Wrap `<App/>` in `<BrowserRouter>`**

Replace the full contents of `src/web/src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 3: Verify the app still builds**

Run: `npm run build`
Expected: TypeScript compiles and Vite build succeeds (the app currently renders the legacy view-switch `App`, still valid until Task 9).

- [ ] **Step 4: Commit**

```bash
git add src/web/package.json src/web/package-lock.json src/web/src/main.tsx
git commit -m "chore(KAN-24): add react-router-dom and BrowserRouter"
```

---

## Task 2: Apply violet brand + sidebar tokens

**Files:**
- Modify: `src/web/src/index.css`

CSS-variable theme tokens are not unit-testable; verification is the build plus a visual check.

- [ ] **Step 1: Set the violet primary and add sidebar tokens**

In `src/web/src/index.css`, inside `@layer base`, update `--primary` and add the sidebar block to both `:root` (light) and `.dark`.

In `:root` replace the `--primary` / `--primary-foreground` lines and add the sidebar tokens at the end of the `:root` block (before the closing `}`):

```css
    --primary: 252 95% 67%;
    --primary-foreground: 0 0% 100%;
    --sidebar-bg: 0 0% 100%;
    --sidebar-border: 228 22% 92%;
    --sidebar-active-bg: 252 91% 95%;
    --sidebar-active-fg: 252 95% 67%;
    --sidebar-muted-fg: 222 12% 45%;
```

In `.dark` replace `--primary` / `--primary-foreground` and add the sidebar tokens at the end of the `.dark` block:

```css
    --primary: 252 95% 67%;
    --primary-foreground: 0 0% 100%;
    --sidebar-bg: 222 39% 9%;
    --sidebar-border: 222 28% 19%;
    --sidebar-active-bg: 250 32% 18%;
    --sidebar-active-fg: 252 95% 67%;
    --sidebar-muted-fg: 222 16% 60%;
```

- [ ] **Step 2: Expose sidebar tokens to Tailwind**

In `src/web/tailwind.config.ts`, add these keys inside `theme.extend.colors` (matching the existing `hsl(var(--token))` pattern used for `background`, `border`, etc.):

```ts
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-bg))',
          border: 'hsl(var(--sidebar-border))',
          'active-bg': 'hsl(var(--sidebar-active-bg))',
          'active-fg': 'hsl(var(--sidebar-active-fg))',
          'muted-fg': 'hsl(var(--sidebar-muted-fg))',
        },
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds; no Tailwind/TS errors.

- [ ] **Step 4: Commit**

```bash
git add src/web/src/index.css src/web/tailwind.config.ts
git commit -m "feat(KAN-24): violet brand primary and sidebar theme tokens"
```

---

## Task 3: UserFooter component

**Files:**
- Create: `src/web/src/components/shell/UserFooter.tsx`
- Test: `src/web/src/components/shell/UserFooter.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserFooter } from './UserFooter'

describe('UserFooter', () => {
  it('renders the user name, email and avatar initials', () => {
    render(<UserFooter />)
    expect(screen.getByText('HR Manager')).toBeInTheDocument()
    expect(screen.getByText('hr@smartfitter.com')).toBeInTheDocument()
    expect(screen.getByText('HR')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/shell/UserFooter.test.tsx`
Expected: FAIL — cannot resolve `./UserFooter`.

- [ ] **Step 3: Write the component**

```tsx
export function UserFooter() {
  return (
    <div className="flex items-center gap-3 px-2 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-sidebar-border bg-muted text-xs font-semibold text-sidebar-muted-fg">
        HR
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">HR Manager</p>
        <p className="truncate text-xs text-sidebar-muted-fg">hr@smartfitter.com</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/shell/UserFooter.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/web/src/components/shell/UserFooter.tsx src/web/src/components/shell/UserFooter.test.tsx
git commit -m "feat(KAN-24): add sidebar UserFooter"
```

---

## Task 4: Nav item config + SidebarNavItem

**Files:**
- Create: `src/web/src/components/shell/navItems.ts`
- Create: `src/web/src/components/shell/SidebarNavItem.tsx`
- Test: `src/web/src/components/shell/SidebarNavItem.test.tsx`

- [ ] **Step 1: Create the nav config**

`src/web/src/components/shell/navItems.ts`:

```ts
import { LayoutDashboard, Briefcase, Users, ClipboardList, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/jobs', label: 'Jobs & JDs', icon: Briefcase },
  { to: '/candidates', label: 'Candidates', icon: Users },
  { to: '/interviews', label: 'Interviews', icon: ClipboardList },
  { to: '/settings', label: 'Settings', icon: Settings },
]
```

- [ ] **Step 2: Write the failing test**

`src/web/src/components/shell/SidebarNavItem.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Briefcase } from 'lucide-react'
import { SidebarNavItem } from './SidebarNavItem'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SidebarNavItem to="/jobs" label="Jobs & JDs" icon={Briefcase} />
    </MemoryRouter>,
  )
}

describe('SidebarNavItem', () => {
  it('renders the label and links to the route', () => {
    renderAt('/dashboard')
    const link = screen.getByRole('link', { name: 'Jobs & JDs' })
    expect(link).toHaveAttribute('href', '/jobs')
  })

  it('marks itself active when the route matches', () => {
    renderAt('/jobs')
    const link = screen.getByRole('link', { name: 'Jobs & JDs' })
    expect(link.className).toContain('bg-sidebar-active-bg')
  })

  it('is not active on a different route', () => {
    renderAt('/dashboard')
    const link = screen.getByRole('link', { name: 'Jobs & JDs' })
    expect(link.className).not.toContain('bg-sidebar-active-bg')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/components/shell/SidebarNavItem.test.tsx`
Expected: FAIL — cannot resolve `./SidebarNavItem`.

- [ ] **Step 4: Write the component**

`src/web/src/components/shell/SidebarNavItem.tsx`:

```tsx
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { NavItem } from './navItems'

export function SidebarNavItem({ to, label, icon: Icon }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm transition-colors',
          isActive
            ? 'bg-sidebar-active-bg font-semibold text-sidebar-active-fg'
            : 'font-medium text-sidebar-muted-fg hover:text-foreground',
        )
      }
    >
      <Icon size={18} aria-hidden />
      <span>{label}</span>
    </NavLink>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/shell/SidebarNavItem.test.tsx`
Expected: PASS (all 3 cases).

- [ ] **Step 6: Commit**

```bash
git add src/web/src/components/shell/navItems.ts src/web/src/components/shell/SidebarNavItem.tsx src/web/src/components/shell/SidebarNavItem.test.tsx
git commit -m "feat(KAN-24): add nav config and SidebarNavItem with active state"
```

---

## Task 5: Sidebar component

**Files:**
- Create: `src/web/src/components/shell/Sidebar.tsx`
- Test: `src/web/src/components/shell/Sidebar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'

function renderSidebar(path = '/dashboard') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>,
  )
}

describe('Sidebar', () => {
  it('renders the SmartFitter brand', () => {
    renderSidebar()
    expect(screen.getByText('SmartFitter')).toBeInTheDocument()
  })

  it('renders all five nav items', () => {
    renderSidebar()
    for (const label of ['Dashboard', 'Jobs & JDs', 'Candidates', 'Interviews', 'Settings']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('renders the user footer', () => {
    renderSidebar()
    expect(screen.getByText('HR Manager')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/shell/Sidebar.test.tsx`
Expected: FAIL — cannot resolve `./Sidebar`.

- [ ] **Step 3: Write the component**

```tsx
import { NAV_ITEMS } from './navItems'
import { SidebarNavItem } from './SidebarNavItem'
import { UserFooter } from './UserFooter'

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-7">
      <div className="flex items-center gap-3 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-primary text-sm font-bold text-primary-foreground">
          SF
        </div>
        <span className="text-lg font-bold text-primary">SmartFitter</span>
      </div>

      <nav className="mt-10 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <SidebarNavItem key={item.to} {...item} />
        ))}
      </nav>

      <div className="mt-4 border-t border-sidebar-border pt-2">
        <UserFooter />
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/shell/Sidebar.test.tsx`
Expected: PASS (all 3 cases).

- [ ] **Step 5: Commit**

```bash
git add src/web/src/components/shell/Sidebar.tsx src/web/src/components/shell/Sidebar.test.tsx
git commit -m "feat(KAN-24): add Sidebar with brand, nav and footer"
```

---

## Task 6: Placeholder component

**Files:**
- Create: `src/web/src/components/shell/Placeholder.tsx`
- Test: `src/web/src/components/shell/Placeholder.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Placeholder } from './Placeholder'

describe('Placeholder', () => {
  it('renders the title and a coming soon message', () => {
    render(<Placeholder title="Settings" />)
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })

  it('renders a custom description when provided', () => {
    render(<Placeholder title="Candidate Matches" description="Ranked candidates will appear here." />)
    expect(screen.getByText('Ranked candidates will appear here.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/shell/Placeholder.test.tsx`
Expected: FAIL — cannot resolve `./Placeholder`.

- [ ] **Step 3: Write the component**

```tsx
import { Sparkles } from 'lucide-react'

interface PlaceholderProps {
  title: string
  description?: string
}

export function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sidebar-active-bg text-primary">
        <Sparkles size={24} aria-hidden />
      </div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description ?? 'Coming soon.'}
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/shell/Placeholder.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 5: Commit**

```bash
git add src/web/src/components/shell/Placeholder.tsx src/web/src/components/shell/Placeholder.test.tsx
git commit -m "feat(KAN-24): add Placeholder empty-state"
```

---

## Task 7: AppShell layout

**Files:**
- Create: `src/web/src/components/shell/AppShell.tsx`
- Test: `src/web/src/components/shell/AppShell.test.tsx`

`AppShell` renders the sidebar, a content top bar holding the theme toggle, and an `<Outlet/>` for the routed page. The test supplies a route so the `<Outlet/>` renders known content.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { AppShell } from './AppShell'

function renderShell() {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<div>Dashboard content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('AppShell', () => {
  it('renders the sidebar', () => {
    renderShell()
    expect(screen.getByText('SmartFitter')).toBeInTheDocument()
  })

  it('renders the routed outlet content', () => {
    renderShell()
    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })

  it('renders the theme toggle', () => {
    renderShell()
    expect(
      screen.getByRole('button', { name: /switch to (light|dark) mode/i }),
    ).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/shell/AppShell.test.tsx`
Expected: FAIL — cannot resolve `./AppShell`.

- [ ] **Step 3: Write the component**

```tsx
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="flex justify-end px-10 pt-6">
          <ThemeToggle />
        </div>
        <div className="px-10 pb-10 pt-2">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/shell/AppShell.test.tsx`
Expected: PASS (all 3 cases).

- [ ] **Step 5: Commit**

```bash
git add src/web/src/components/shell/AppShell.tsx src/web/src/components/shell/AppShell.test.tsx
git commit -m "feat(KAN-24): add AppShell layout with sidebar and theme toggle"
```

---

## Task 8: Routed page wrappers (Dashboard, Interviews, Jobs)

**Files:**
- Create: `src/web/src/pages/DashboardPage.tsx`
- Create: `src/web/src/pages/InterviewsPage.tsx`
- Create: `src/web/src/pages/JobsPage.tsx`
- Test: `src/web/src/pages/InterviewsPage.test.tsx`

These wrappers move the per-view logic out of `App.tsx`. `DashboardPage` recreates the current `handleNew`/`handleLoad` flow but navigates to routes. `InterviewsPage` guards against a missing session. `JobsPage` provides the JD match context.

- [ ] **Step 1: Create `DashboardPage`**

`src/web/src/pages/DashboardPage.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { useSession } from '@/store/SessionContext'
import { HomeScreen } from '@/pages/HomeScreen'
import type { Session } from '@/types'

export function DashboardPage() {
  const { dispatch, repository } = useSession()
  const navigate = useNavigate()

  function handleNew() {
    const session: Session = {
      id: crypto.randomUUID(),
      candidateName: '',
      role: 'Software Engineer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStep: 1,
      resumeText: '',
      notes: '',
      roundNotes: {},
    }
    dispatch({ type: 'CREATE_SESSION', session })
    navigate('/interviews')
  }

  function handleLoad(id: string) {
    const session = repository.load(id)
    if (session) {
      dispatch({ type: 'LOAD_SESSION', session })
      navigate('/interviews')
    }
  }

  return (
    <HomeScreen onNew={handleNew} onLoad={handleLoad} onNewJdMatch={() => navigate('/jobs')} />
  )
}
```

- [ ] **Step 2: Create `JobsPage`**

`src/web/src/pages/JobsPage.tsx`:

```tsx
import { JdMatchProvider } from '@/store/JdMatchContext'
import { JdMatchFlow } from '@/pages/JdMatchFlow'

export function JobsPage() {
  return (
    <JdMatchProvider>
      <JdMatchFlow />
    </JdMatchProvider>
  )
}
```

- [ ] **Step 3: Write the failing test for `InterviewsPage`**

`src/web/src/pages/InterviewsPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import type { Dispatch } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { SessionContext } from '@/store/SessionContext'
import { InterviewsPage } from './InterviewsPage'
import type { Session } from '@/types'
import type { SessionAction, SessionState } from '@/store/sessionReducer'

const session: Session = {
  id: 'test-id',
  candidateName: '',
  role: 'Software Engineer',
  createdAt: '2026-06-12T00:00:00.000Z',
  updatedAt: '2026-06-12T00:00:00.000Z',
  currentStep: 1,
  resumeText: '',
  notes: '',
  roundNotes: {},
}

function renderInterviews(state: SessionState) {
  const dispatch = vi.fn() as unknown as Dispatch<SessionAction>
  const repository = { save: vi.fn(), load: vi.fn(), list: vi.fn(() => []), delete: vi.fn() } as any
  render(
    <SessionContext.Provider value={{ state, dispatch, repository }}>
      <MemoryRouter initialEntries={['/interviews']}>
        <Routes>
          <Route path="/interviews" element={<InterviewsPage />} />
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Routes>
      </MemoryRouter>
    </SessionContext.Provider>,
  )
}

describe('InterviewsPage', () => {
  it('renders the wizard stepper when a session exists', () => {
    renderInterviews({ current: session })
    expect(screen.getByText('Resume Analysis')).toBeInTheDocument()
  })

  it('redirects to the dashboard when there is no active session', () => {
    renderInterviews({ current: null })
    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/pages/InterviewsPage.test.tsx`
Expected: FAIL — cannot resolve `./InterviewsPage`.

- [ ] **Step 5: Create `InterviewsPage`**

`src/web/src/pages/InterviewsPage.tsx`:

```tsx
import { Navigate, useNavigate } from 'react-router-dom'
import { useSession } from '@/store/SessionContext'
import { Stepper } from '@/components/Stepper'
import { AnalyzeStep } from '@/pages/AnalyzeStep'
import { PlanStep } from '@/pages/PlanStep'
import { SessionStep } from '@/pages/SessionStep'
import { EvaluationStep } from '@/pages/EvaluationStep'

export function InterviewsPage() {
  const { state, dispatch } = useSession()
  const navigate = useNavigate()

  if (!state.current) {
    return <Navigate to="/dashboard" replace />
  }

  const step = state.current.currentStep

  return (
    <div className="space-y-8">
      <Stepper
        currentStep={step}
        onStepClick={(s) => dispatch({ type: 'SET_STEP', step: s as 1 | 2 | 3 | 4 })}
      />
      <div>
        {step === 1 && <AnalyzeStep />}
        {step === 2 && <PlanStep />}
        {step === 3 && <SessionStep />}
        {step === 4 && <EvaluationStep onBackToHome={() => navigate('/dashboard')} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/pages/InterviewsPage.test.tsx`
Expected: PASS (both cases).

- [ ] **Step 7: Commit**

```bash
git add src/web/src/pages/DashboardPage.tsx src/web/src/pages/JobsPage.tsx src/web/src/pages/InterviewsPage.tsx src/web/src/pages/InterviewsPage.test.tsx
git commit -m "feat(KAN-24): add Dashboard, Jobs and Interviews routed pages"
```

---

## Task 9: Wire the router into App.tsx

**Files:**
- Modify: `src/web/src/App.tsx`
- Test: `src/web/src/App.test.tsx` (create)

`App.tsx` keeps the providers and the localStorage persistence effect, and renders the route tree. The legacy `view` state and inline view switching are removed.

- [ ] **Step 1: Write the failing test**

`src/web/src/App.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

beforeEach(() => {
  localStorage.clear()
})

function renderAppAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App routing', () => {
  it('renders the dashboard (session list) at /dashboard', () => {
    renderAppAt('/dashboard')
    expect(screen.getByText('Interview Sessions')).toBeInTheDocument()
  })

  it('redirects the index route to the dashboard', () => {
    renderAppAt('/')
    expect(screen.getByText('Interview Sessions')).toBeInTheDocument()
  })

  it('renders the JD match flow at /jobs', () => {
    renderAppAt('/jobs')
    expect(screen.getByText('New JD Match')).toBeInTheDocument()
  })

  it('renders the Settings placeholder at /settings', () => {
    renderAppAt('/settings')
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })

  it('redirects /interviews to the dashboard when no session is active', () => {
    renderAppAt('/interviews')
    expect(screen.getByText('Interview Sessions')).toBeInTheDocument()
  })
})
```

Note: `App` must NOT contain its own `<BrowserRouter>` (it is provided by `main.tsx` in production and `MemoryRouter` in tests).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — the current `App` renders the legacy view switch, so `/jobs`, `/settings`, and the redirects do not resolve.

- [ ] **Step 3: Rewrite `App.tsx`**

Replace the full contents of `src/web/src/App.tsx`:

```tsx
import { useReducer, useEffect, useMemo } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import { SessionContext } from '@/store/SessionContext'
import { sessionReducer, initialState } from '@/store/sessionReducer'
import { LocalStorageSessionRepository } from '@/repositories/LocalStorageSessionRepository'
import { AppShell } from '@/components/shell/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { JobsPage } from '@/pages/JobsPage'
import { InterviewsPage } from '@/pages/InterviewsPage'
import { Placeholder } from '@/components/shell/Placeholder'

export default function App() {
  const [state, dispatch] = useReducer(sessionReducer, initialState)
  const repository = useMemo(() => new LocalStorageSessionRepository(), [])

  useEffect(() => {
    if (state.current) {
      repository.save(state.current)
    }
  }, [state.current, repository])

  return (
    <ThemeProvider>
      <SessionContext.Provider value={{ state, dispatch, repository }}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route
              path="/candidates"
              element={
                <Placeholder
                  title="Candidate Matches"
                  description="Ranked candidate matches will appear here."
                />
              }
            />
            <Route path="/interviews" element={<InterviewsPage />} />
            <Route path="/settings" element={<Placeholder title="Settings" />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </SessionContext.Provider>
    </ThemeProvider>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS (all 5 cases).

- [ ] **Step 5: Commit**

```bash
git add src/web/src/App.tsx src/web/src/App.test.tsx
git commit -m "feat(KAN-24): route app sections through AppShell"
```

---

## Task 10: Remove the old Navbar, rename title, and verify the full suite

**Files:**
- Delete: `src/web/src/components/Navbar.tsx`
- Delete: `src/web/src/components/Navbar.test.tsx`
- Modify: `src/web/index.html` (document title)

- [ ] **Step 1: Delete the obsolete Navbar and its test**

```bash
git rm src/web/src/components/Navbar.tsx src/web/src/components/Navbar.test.tsx
```

Expected: both files removed. (They are no longer imported — `App.tsx` no longer references `Navbar`.)

- [ ] **Step 2: Rename the document title to SmartFitter**

In `src/web/index.html`, change the `<title>` element text to `SmartFitter`.

- [ ] **Step 3: Confirm no dangling Navbar imports remain**

Run: `grep -rn "components/Navbar" src/`
Expected: no output (exit code 1).

- [ ] **Step 4: Run the full frontend test suite**

Run: `npm test`
Expected: all suites PASS, including the existing `AnalyzeStep`, `PlanStep`, `JdMatchFlow`, `Stepper`, and the new shell/page/App tests. If a pre-existing test rendered `Navbar` or relied on the old centered layout, update it to the router-based render shown in Task 8's `InterviewsPage.test.tsx` (wrap in `SessionContext.Provider` + `MemoryRouter`).

- [ ] **Step 5: Build to confirm a clean production bundle**

Run: `npm run build`
Expected: `tsc -b` and Vite build succeed with no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(KAN-24): remove legacy Navbar and rename app to SmartFitter"
```

---

## Manual Verification (after all tasks)

Run `npm run dev` and confirm against the Figma ("SmartFitter · JD Matching" Dark `101:2` / Light `101:3`):

- [ ] Sidebar shows the SF logo + "SmartFitter", five nav items, and the user footer.
- [ ] The active section is highlighted (violet pill) and follows the URL as you click between Dashboard, Jobs & JDs, Candidates, Interviews, Settings.
- [ ] Dashboard lists sessions; "+ New Interview" navigates into the wizard; "+ New JD Match" opens Jobs & JDs.
- [ ] Visiting `/interviews` directly with no session redirects to Dashboard.
- [ ] The theme toggle (content top-right) switches dark/light, and both the sidebar and content render correctly in each theme.

---

## Self-Review Notes

- **Spec coverage:** sidebar with 5 items + active state (Tasks 4–5, 9), existing flows reachable (Tasks 8–9), dark/light support (Tasks 2, 7, manual), react-router (Tasks 1, 9), violet/SmartFitter brand (Tasks 2, 5, 10), placeholders for Candidates/Settings (Tasks 6, 9), `/interviews` guard (Task 8). All covered.
- **Out of scope (per spec):** mobile drawer (KAN-25), real Candidate Matches + Radar (KAN-26).
- **Type consistency:** `NavItem { to, label, icon }` is defined in Task 4 and consumed unchanged in Tasks 4–5; `Placeholder { title, description? }` defined in Task 6 and used in Task 9; session-creation shape in `DashboardPage` matches the existing `Session` type used in `App.tsx`.
