# KAN-17: Dark/Light Mode Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sun/moon toggle to the global header that switches the entire site between dark and light themes, persists the choice to localStorage, and initialises from the OS preference on first visit.

**Architecture:** `ThemeContext` manages `'light' | 'dark'` state and applies the `dark` CSS class to `document.documentElement`. `ThemeToggle` is an icon button that reads context. `Navbar` extracts the existing header and mounts the toggle. All hardcoded `slate-*` colour classes are migrated to CSS-variable-based classes (`bg-background`, `text-foreground`, etc.) so the switch is site-wide. Tailwind `darkMode: ['class']` and the CSS variable sets in `index.css` are already correctly configured — no CSS changes needed.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui CSS variables, lucide-react, Vitest + Testing Library (happy-dom)

---

## File Map

| Status | File | Responsibility |
|--------|------|----------------|
| Create | `src/web/src/context/ThemeContext.tsx` | Theme state, localStorage, OS pref, `dark` class on `<html>` |
| Create | `src/web/src/context/ThemeContext.test.tsx` | Tests for ThemeContext |
| Create | `src/web/src/components/ui/ThemeToggle.tsx` | Sun/Moon icon button |
| Create | `src/web/src/components/ui/ThemeToggle.test.tsx` | Tests for ThemeToggle |
| Create | `src/web/src/components/Navbar.tsx` | Header bar with ThemeToggle |
| Create | `src/web/src/components/Navbar.test.tsx` | Tests for Navbar |
| Modify | `src/web/src/App.tsx` | Add ThemeProvider, use Navbar, fix root bg |
| Modify | `src/web/src/pages/HomeScreen.tsx` | slate → CSS variable classes |
| Modify | `src/web/src/pages/AnalyzeStep.tsx` | slate → CSS variable classes |
| Modify | `src/web/src/pages/PlanStep.tsx` | slate → CSS variable classes |
| Modify | `src/web/src/pages/SessionStep.tsx` | slate → CSS variable classes |
| Modify | `src/web/src/pages/EvaluationStep.tsx` | slate → CSS variable classes |
| Modify | `src/web/src/components/Stepper.tsx` | slate → CSS variable classes |
| Modify | `src/web/src/components/Stepper.test.tsx` | Update class assertion after migration |
| Modify | `src/web/src/components/ui/CandidateChips.tsx` | slate → CSS variable classes |
| Modify | `src/web/src/components/LoadingSpinner.tsx` | slate → CSS variable classes |

---

## Task 1: ThemeContext

**Files:**
- Create: `src/web/src/context/ThemeContext.tsx`
- Create: `src/web/src/context/ThemeContext.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/web/src/context/ThemeContext.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeContext'

function ThemeConsumer() {
  const { theme, toggleTheme } = useTheme()
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
    </>
  )
}

function mockMatchMedia(prefersDark: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' && prefersDark,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    mockMatchMedia(false)
  })

  it('defaults to light when no localStorage entry and prefers-color-scheme is light', () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('light')
  })

  it('defaults to dark when prefers-color-scheme is dark and no localStorage entry', () => {
    mockMatchMedia(true)
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('dark')
  })

  it('reads saved theme from localStorage over OS preference', () => {
    mockMatchMedia(true)
    localStorage.setItem('theme', 'light')
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('light')
  })

  it('adds dark class to documentElement when theme is dark', () => {
    localStorage.setItem('theme', 'dark')
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('removes dark class from documentElement when theme is light', () => {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'light')
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggleTheme switches from light to dark', () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'toggle' }))
    expect(screen.getByTestId('theme').textContent).toBe('dark')
  })

  it('toggleTheme switches from dark to light', () => {
    localStorage.setItem('theme', 'dark')
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'toggle' }))
    expect(screen.getByTestId('theme').textContent).toBe('light')
  })

  it('persists the toggled theme to localStorage', () => {
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'toggle' }))
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('useTheme throws when used outside ThemeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ThemeConsumer />)).toThrow('useTheme must be used within ThemeProvider')
    spy.mockRestore()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd src/web && npm test -- ThemeContext
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create ThemeContext.tsx**

Create `src/web/src/context/ThemeContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('theme', theme)
    } catch {}
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd src/web && npm test -- ThemeContext
```

Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/web/src/context/ThemeContext.tsx src/web/src/context/ThemeContext.test.tsx
git commit -m "feat: add ThemeContext with localStorage persistence and OS preference detection"
```

---

## Task 2: ThemeToggle

**Files:**
- Create: `src/web/src/components/ui/ThemeToggle.tsx`
- Create: `src/web/src/components/ui/ThemeToggle.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/web/src/components/ui/ThemeToggle.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@/context/ThemeContext'
import { ThemeToggle } from './ThemeToggle'

function renderWithTheme(initialTheme: 'light' | 'dark') {
  localStorage.setItem('theme', initialTheme)
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
  return render(<ThemeProvider><ThemeToggle /></ThemeProvider>)
}

describe('ThemeToggle', () => {
  beforeEach(() => localStorage.clear())

  it('renders a button', () => {
    renderWithTheme('dark')
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('has aria-label "Switch to light mode" when in dark mode', () => {
    renderWithTheme('dark')
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to light mode')
  })

  it('has aria-label "Switch to dark mode" when in light mode', () => {
    renderWithTheme('light')
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to dark mode')
  })

  it('toggles aria-label when clicked', () => {
    renderWithTheme('dark')
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-label', 'Switch to dark mode')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd src/web && npm test -- ThemeToggle
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create ThemeToggle.tsx**

Create `src/web/src/components/ui/ThemeToggle.tsx`:

```tsx
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      {isDark ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd src/web && npm test -- ThemeToggle
```

Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/web/src/components/ui/ThemeToggle.tsx src/web/src/components/ui/ThemeToggle.test.tsx
git commit -m "feat: add ThemeToggle icon button with accessible aria-label"
```

---

## Task 3: Navbar

**Files:**
- Create: `src/web/src/components/Navbar.tsx`
- Create: `src/web/src/components/Navbar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/web/src/components/Navbar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from '@/context/ThemeContext'
import { Navbar } from './Navbar'

function renderNavbar(onBack?: () => void) {
  localStorage.setItem('theme', 'dark')
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
    addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }))
  return render(<ThemeProvider><Navbar onBack={onBack} /></ThemeProvider>)
}

describe('Navbar', () => {
  beforeEach(() => localStorage.clear())

  it('renders the app title', () => {
    renderNavbar()
    expect(screen.getByText('Interview Assistant')).toBeInTheDocument()
  })

  it('renders the theme toggle button', () => {
    renderNavbar()
    expect(screen.getByRole('button', { name: /switch to/i })).toBeInTheDocument()
  })

  it('renders the back button when onBack is provided', () => {
    renderNavbar(vi.fn())
    expect(screen.getByRole('button', { name: '← Sessions' })).toBeInTheDocument()
  })

  it('does not render a back button when onBack is undefined', () => {
    renderNavbar()
    expect(screen.queryByRole('button', { name: '← Sessions' })).not.toBeInTheDocument()
  })

  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn()
    renderNavbar(onBack)
    fireEvent.click(screen.getByRole('button', { name: '← Sessions' }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd src/web && npm test -- Navbar
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create Navbar.tsx**

Create `src/web/src/components/Navbar.tsx`:

```tsx
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface NavbarProps {
  onBack?: () => void
}

export function Navbar({ onBack }: NavbarProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      {onBack ? (
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Sessions
        </button>
      ) : (
        <div className="w-24" />
      )}
      <h1 className="text-lg font-bold text-foreground">Interview Assistant</h1>
      <ThemeToggle />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd src/web && npm test -- Navbar
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/web/src/components/Navbar.tsx src/web/src/components/Navbar.test.tsx
git commit -m "feat: add Navbar component with ThemeToggle in header right slot"
```

---

## Task 4: Wire up App.tsx

**Files:**
- Modify: `src/web/src/App.tsx`

- [ ] **Step 1: Replace App.tsx**

Replace the entire contents of `src/web/src/App.tsx` with:

```tsx
import { useReducer, useState, useEffect, useMemo } from 'react'
import { ThemeProvider } from '@/context/ThemeContext'
import { SessionContext } from '@/store/SessionContext'
import { sessionReducer, initialState } from '@/store/sessionReducer'
import { LocalStorageSessionRepository } from '@/repositories/LocalStorageSessionRepository'
import { HomeScreen } from '@/pages/HomeScreen'
import { AnalyzeStep } from '@/pages/AnalyzeStep'
import { PlanStep } from '@/pages/PlanStep'
import { SessionStep } from '@/pages/SessionStep'
import { EvaluationStep } from '@/pages/EvaluationStep'
import { Stepper } from '@/components/Stepper'
import { Navbar } from '@/components/Navbar'
import type { Session } from '@/types'

type View = 'home' | 'wizard'

export default function App() {
  const [state, dispatch] = useReducer(sessionReducer, initialState)
  const [view, setView] = useState<View>('home')
  const repository = useMemo(() => new LocalStorageSessionRepository(), [])

  useEffect(() => {
    if (state.current) {
      repository.save(state.current)
    }
  }, [state.current, repository])

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
    setView('wizard')
  }

  function handleLoad(id: string) {
    const session = repository.load(id)
    if (session) {
      dispatch({ type: 'LOAD_SESSION', session })
      setView('wizard')
    }
  }

  function handleBackToHome() {
    setView('home')
  }

  const step = state.current?.currentStep ?? 1

  return (
    <ThemeProvider>
      <SessionContext.Provider value={{ state, dispatch, repository }}>
        <div className="min-h-screen bg-background text-foreground">
          <div className="mx-auto max-w-[760px] px-4 py-8">
            <Navbar onBack={view === 'wizard' ? handleBackToHome : undefined} />
            {view === 'home' ? (
              <HomeScreen onNew={handleNew} onLoad={handleLoad} />
            ) : (
              <>
                <Stepper
                  currentStep={step}
                  onStepClick={(s) => dispatch({ type: 'SET_STEP', step: s })}
                />
                <div className="mt-8">
                  {step === 1 && <AnalyzeStep />}
                  {step === 2 && <PlanStep />}
                  {step === 3 && <SessionStep />}
                  {step === 4 && <EvaluationStep onBackToHome={handleBackToHome} />}
                </div>
              </>
            )}
          </div>
        </div>
      </SessionContext.Provider>
    </ThemeProvider>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd src/web && npm test
```

Expected: PASS — all tests green.

- [ ] **Step 3: Commit**

```bash
git add src/web/src/App.tsx
git commit -m "feat: wire ThemeProvider and Navbar into App, migrate root bg to CSS variables"
```

---

## Task 5: Migrate colors — HomeScreen + LoadingSpinner

**Files:**
- Modify: `src/web/src/pages/HomeScreen.tsx`
- Modify: `src/web/src/components/LoadingSpinner.tsx`

- [ ] **Step 1: Replace HomeScreen.tsx**

Replace entire contents of `src/web/src/pages/HomeScreen.tsx`:

```tsx
import { useSession } from '@/store/SessionContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Session } from '@/types'

function statusBadge(session: Session) {
  if (session.evaluation) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Complete</Badge>
  return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">In Progress</Badge>
}

interface HomeScreenProps {
  onNew: () => void
  onLoad: (id: string) => void
}

export function HomeScreen({ onNew, onLoad }: HomeScreenProps) {
  const { repository } = useSession()
  const sessions = repository.list()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Interview Sessions</h1>
          <p className="text-sm text-muted-foreground mt-1">Resume a past session or start a new one</p>
        </div>
        <Button onClick={onNew} className="bg-indigo-600 hover:bg-indigo-700">
          + New Interview
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-border bg-card/50 py-16 text-center">
          <p className="text-muted-foreground">No sessions yet.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Click "New Interview" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">
                    {session.candidateName || 'Unnamed Candidate'}
                  </span>
                  <span className="text-muted-foreground/60">·</span>
                  <span className="text-sm text-muted-foreground">{session.role}</span>
                </div>
                <div className="text-xs text-muted-foreground/60">
                  Last updated: {new Date(session.updatedAt).toLocaleDateString()} · Step{' '}
                  {session.currentStep} of 4
                </div>
              </div>
              <div className="flex items-center gap-3">
                {statusBadge(session)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLoad(session.id)}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  {session.evaluation ? 'View →' : 'Resume →'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Replace LoadingSpinner.tsx**

Replace entire contents of `src/web/src/components/LoadingSpinner.tsx`:

```tsx
interface LoadingSpinnerProps {
  label?: string
}

export function LoadingSpinner({ label = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center gap-3 text-muted-foreground">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
```

- [ ] **Step 3: Run tests**

```bash
cd src/web && npm test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/web/src/pages/HomeScreen.tsx src/web/src/components/LoadingSpinner.tsx
git commit -m "refactor: migrate HomeScreen and LoadingSpinner to CSS variable color classes"
```

---

## Task 6: Migrate colors — AnalyzeStep

**Files:**
- Modify: `src/web/src/pages/AnalyzeStep.tsx`

- [ ] **Step 1: Replace AnalyzeStep.tsx**

Replace entire contents of `src/web/src/pages/AnalyzeStep.tsx`:

```tsx
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from '@/store/SessionContext'
import { analyzeResumePdf, ApiError } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { SeniorityBadge, ConfidenceBadge } from '@/components/ui/StatBadge'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export function AnalyzeStep() {
  const { state, dispatch } = useSession()
  const session = state.current
  const [role, setRole] = useState(session?.role ?? 'Software Engineer')
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!session) return null

  const hasResult = Boolean(session.profile && session.seniority)

  function mapError(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 400) return 'Please select a valid PDF file.'
      if (err.status === 422) return "This PDF doesn't contain readable text. Try a text-based PDF."
    }
    return 'Upload failed. Please try again.'
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setUploadStatus('uploading')
    setErrorMessage(null)
    try {
      const result = await analyzeResumePdf(file, role)
      dispatch({
        type: 'LOAD_SESSION',
        session: {
          ...session!,
          resumeText: '',
          role,
          profile: result.profile,
          seniority: result.seniority,
          candidateName: result.profile.candidateName,
        },
      })
      setUploadStatus('success')
    } catch (err) {
      setUploadStatus('error')
      setErrorMessage(mapError(err))
    }
  }

  function handleRetry() {
    setUploadStatus('idle')
    setErrorMessage(null)
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Resume (PDF)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload PDF resume"
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadStatus === 'uploading'}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload PDF'}
              </Button>
              {uploadStatus === 'success' && fileName && (
                <span className="flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-muted px-2.5 py-1 text-sm text-foreground">
                  <span className="max-w-[160px] truncate">{fileName}</span>
                  <span className="text-emerald-400">✓</span>
                </span>
              )}
              {uploadStatus === 'error' && (
                <span className="flex items-center gap-2 text-sm">
                  <span>📄</span>
                  <span className="text-red-400">✗</span>
                  <button
                    onClick={handleRetry}
                    className="text-indigo-400 underline hover:text-indigo-300"
                  >
                    Try another file
                  </button>
                </span>
              )}
            </div>
            {uploadStatus === 'error' && errorMessage && (
              <p className="text-sm text-red-400">{errorMessage}</p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Target Role
            </label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="border-border bg-card text-foreground"
            />
          </div>
        </div>
      </div>

      {uploadStatus === 'uploading' && <LoadingSpinner label="Analyzing resume with AI..." />}

      {hasResult && session.profile && session.seniority && (
        <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-card p-4">
          <div className="text-sm font-semibold text-emerald-400">✓ Analysis Complete</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{session.profile.candidateName}</span>
            {session.profile.currentTitle && (
              <span className="text-muted-foreground">· {session.profile.currentTitle}</span>
            )}
            {session.profile.yearsExperience != null && (
              <span className="text-muted-foreground">· {session.profile.yearsExperience} yrs exp</span>
            )}
          </div>
          <div className="flex gap-3">
            <SeniorityBadge level={session.seniority.level} />
            <ConfidenceBadge confidence={session.seniority.confidence} />
          </div>
          <div className="flex flex-wrap gap-2">
            {session.profile.coreSkills.map((skill) => (
              <span key={skill} className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground/80">
                {skill}
              </span>
            ))}
          </div>
          {session.profile.redFlags.length > 0 && (
            <div className="text-sm text-amber-400">
              ⚠ Red flags: {session.profile.redFlags.join(', ')}
            </div>
          )}
          <div className="flex justify-end pt-1">
            <Button
              onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Next: Interview Plan →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
cd src/web && npm test
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/web/src/pages/AnalyzeStep.tsx
git commit -m "refactor: migrate AnalyzeStep to CSS variable color classes"
```

---

## Task 7: Migrate colors — PlanStep

**Files:**
- Modify: `src/web/src/pages/PlanStep.tsx`

- [ ] **Step 1: Replace PlanStep.tsx**

Replace entire contents of `src/web/src/pages/PlanStep.tsx`:

```tsx
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from '@/store/SessionContext'
import { generatePlan, revisePlan } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorBanner } from '@/components/ErrorBanner'
import { CandidateChips } from '@/components/ui/CandidateChips'

function resolveCategory(name: string): { color: string; icon: string } {
  const n = name.toLowerCase()
  if (/experience|background|behavioral/.test(n)) return { color: '#6c47ff', icon: '◎' }
  if (/system|design|architecture/.test(n)) return { color: '#14abab', icon: '⬡' }
  if (/values|culture|fit/.test(n)) return { color: '#e9ad1c', icon: '◇' }
  return { color: '#22c467', icon: '●' }
}

export function PlanStep() {
  const { state, dispatch } = useSession()
  const session = state.current
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [revising, setRevising] = useState(false)
  const calledRef = useRef(false)
  const roundsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (calledRef.current) return
    if (!session?.plan && session?.profile && session?.seniority) {
      calledRef.current = true
      setLoading(true)
      generatePlan(session.profile, session.seniority, session.role)
        .then((plan) => dispatch({ type: 'SET_PLAN', plan }))
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to generate plan.'))
        .finally(() => setLoading(false))
    }
  }, [])

  if (!session) return null

  async function handleRevise() {
    if (!feedback.trim() || !session?.plan) return
    setRevising(true)
    setError(null)
    try {
      const revised = await revisePlan(session.plan, feedback)
      dispatch({ type: 'SET_PLAN', plan: revised })
      setFeedback('')
      roundsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revision failed. Please try again.')
    } finally {
      setRevising(false)
    }
  }

  const totalMinutes = session.plan?.rounds.reduce((sum, r) => sum + r.durationMinutes, 0) ?? 0
  const totalQuestions = session.plan?.rounds.reduce((sum, r) => sum + r.questions.length, 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Interview Plan</h2>
            {session.plan && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {totalMinutes} min total
              </span>
            )}
          </div>
          {session.plan && session.profile && (
            <CandidateChips
              role={session.role}
              yearsExperience={session.profile.yearsExperience}
              topSkills={session.profile.coreSkills}
            />
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}
          className="text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Button>
      </div>

      {loading && <LoadingSpinner label="Generating interview plan..." />}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {session.plan && (
        <>
          <div className="rounded-xl border border-border bg-card/80 px-6 py-4 flex items-center gap-0">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Target Role</p>
              <p className="text-[15px] font-semibold text-foreground mt-1 truncate">{session.role}</p>
            </div>
            <div className="w-px h-12 bg-border mx-6 shrink-0" />
            <div className="shrink-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Difficulty</p>
              <span className="mt-1 inline-block bg-amber-900/50 text-amber-400 text-xs font-semibold px-3 py-1 rounded-md">
                {session.plan.level}
              </span>
            </div>
            <div className="w-px h-12 bg-border mx-6 shrink-0" />
            <div className="shrink-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Questions</p>
              <p className="text-[15px] font-semibold text-foreground mt-1">{totalQuestions} questions</p>
            </div>
          </div>

          <div ref={roundsRef} className="space-y-3">
            {session.plan.rounds.map((round, i) => {
              const { color, icon } = resolveCategory(round.name)
              return (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-card/80 p-5 border-l-[3px]"
                  style={{ borderLeftColor: color }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm" style={{ color }}>{icon}</span>
                    <span className="text-sm font-semibold" style={{ color }}>{round.name}</span>
                    <span className="text-xs text-muted-foreground">({round.durationMinutes} min)</span>
                  </div>
                  <ol className="space-y-2">
                    {round.questions.map((q, j) => (
                      <li key={j} className="flex gap-3 text-sm">
                        <span className="shrink-0 text-muted-foreground/60 w-4">{j + 1}.</span>
                        <span className="text-muted-foreground">{q}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )
            })}
          </div>

          <div className="rounded-lg border border-indigo-500/40 bg-gradient-to-br from-indigo-950/60 to-card/80 p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">✦ Revise Plan</p>
            <div className="flex gap-2">
              <Input
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder='Revise plan, e.g. "add more system design questions"'
                className="border-border bg-card text-foreground placeholder:text-muted-foreground"
                onKeyDown={(e) => e.key === 'Enter' && handleRevise()}
              />
              <Button
                onClick={handleRevise}
                disabled={!feedback.trim() || revising}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
              >
                {revising ? 'Revising...' : 'Revise'}
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              className="border-border text-muted-foreground hover:bg-card hover:text-foreground"
              disabled
            >
              Edit Questions
            </Button>
            <Button
              onClick={() => dispatch({ type: 'SET_STEP', step: 3 })}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Start Interview →
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run tests**

```bash
cd src/web && npm test
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/web/src/pages/PlanStep.tsx
git commit -m "refactor: migrate PlanStep to CSS variable color classes"
```

---

## Task 8: Migrate colors — SessionStep + EvaluationStep

**Files:**
- Modify: `src/web/src/pages/SessionStep.tsx`
- Modify: `src/web/src/pages/EvaluationStep.tsx`

- [ ] **Step 1: Replace SessionStep.tsx**

Replace entire contents of `src/web/src/pages/SessionStep.tsx`:

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useSession } from '@/store/SessionContext'

export function SessionStep() {
  const { state, dispatch } = useSession()
  const session = state.current
  const [activeTab, setActiveTab] = useState(0)

  if (!session || !session.plan) return null

  const rounds = session.plan.rounds
  const round = rounds[activeTab]
  const roundNotes = session.roundNotes ?? {}

  if (!rounds.length || !round) return null

  function handleComplete() {
    const condensed = rounds
      .filter((r) => roundNotes[r.name]?.trim())
      .map((r) => `[${r.name}]\n${roundNotes[r.name].trim()}`)
      .join('\n\n')
    dispatch({ type: 'SET_NOTES', notes: condensed })
    dispatch({ type: 'SET_STEP', step: 4 })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Live Interview Session</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Use the questions below as a guide. Capture your notes as the interview progresses.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}
          className="text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Button>
      </div>

      <div className="flex border-b border-border" role="tablist">
        {rounds.map((r, i) => (
          <button
            key={r.name}
            type="button"
            role="tab"
            aria-selected={i === activeTab}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              i === activeTab
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {r.name}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-indigo-400">{round.name}</span>
          <span className="text-xs text-muted-foreground">· {round.durationMinutes} min</span>
        </div>
        <div className="space-y-1">
          {round.questions.map((q, j) => (
            <div key={j} className="flex gap-2 text-sm text-muted-foreground">
              <span className="shrink-0 text-muted-foreground/60">•</span>
              <span>{q}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notes</p>
          <Textarea
            value={roundNotes[round.name] ?? ''}
            onChange={(e) =>
              dispatch({ type: 'SET_ROUND_NOTE', roundName: round.name, note: e.target.value })
            }
            placeholder={`Capture your observations for ${round.name}...`}
            className="h-40 resize-none border-border bg-background text-foreground placeholder:text-muted-foreground"
          />
          <p className="text-xs text-muted-foreground">Notes are saved automatically.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleComplete} className="bg-indigo-600 hover:bg-indigo-700">
          Complete Interview →
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace EvaluationStep.tsx**

Replace entire contents of `src/web/src/pages/EvaluationStep.tsx`:

```tsx
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/store/SessionContext'
import { evaluate } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorBanner } from '@/components/ErrorBanner'

function recommendationColor(rec: string): string {
  const lower = rec.toLowerCase()
  if (lower.includes('no hire') || lower.includes('reject')) return 'text-red-400'
  if (lower.includes('strong hire') || lower.includes('hire')) return 'text-emerald-400'
  return 'text-amber-400'
}

interface EvaluationStepProps {
  onBackToHome: () => void
}

export function EvaluationStep({ onBackToHome }: EvaluationStepProps) {
  const { state, dispatch } = useSession()
  const session = state.current
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    if (!session?.evaluation && session?.profile && session?.plan) {
      calledRef.current = true
      setLoading(true)
      evaluate(session.profile, session.plan, session.notes)
        .then((evaluation) => dispatch({ type: 'SET_EVALUATION', evaluation }))
        .catch((err) => setError(err instanceof Error ? err.message : 'Evaluation failed.'))
        .finally(() => setLoading(false))
    }
  }, [])

  if (!session) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Evaluation Results</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'SET_STEP', step: 3 })}
          className="text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Button>
      </div>

      {loading && <LoadingSpinner label="Evaluating candidate..." />}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {session.evaluation && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4 text-center">
              <div className="text-4xl font-extrabold text-indigo-400">
                {session.evaluation.overallScore}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Overall Score</div>
            </div>
            <div className="sm:col-span-2 rounded-lg border border-border bg-card p-4 space-y-1">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recommendation
              </div>
              <div className={`text-xl font-bold ${recommendationColor(session.evaluation.recommendation)}`}>
                {session.evaluation.recommendation}
              </div>
              <p className="text-sm text-muted-foreground">{session.evaluation.summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-400">✓ Strengths</div>
              <ul className="space-y-1">
                {session.evaluation.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/80">
                    <span className="shrink-0 text-emerald-600">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-amber-400">⚠ Risks</div>
              <ul className="space-y-1">
                {session.evaluation.risks.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/80">
                    <span className="shrink-0 text-amber-600">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {session.evaluation.followUps.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Follow-up Questions
              </div>
              <ul className="space-y-1">
                {session.evaluation.followUps.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/80">
                    <span className="shrink-0 text-muted-foreground/60">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button
              variant="outline"
              onClick={onBackToHome}
              className="border-border text-foreground/80 hover:bg-muted"
            >
              ← Back to Sessions
            </Button>
            <Button onClick={onBackToHome} className="bg-indigo-600 hover:bg-indigo-700">
              + New Interview
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Run tests**

```bash
cd src/web && npm test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/web/src/pages/SessionStep.tsx src/web/src/pages/EvaluationStep.tsx
git commit -m "refactor: migrate SessionStep and EvaluationStep to CSS variable color classes"
```

---

## Task 9: Migrate colors — Stepper + CandidateChips (update Stepper test)

**Files:**
- Modify: `src/web/src/components/Stepper.tsx`
- Modify: `src/web/src/components/Stepper.test.tsx`
- Modify: `src/web/src/components/ui/CandidateChips.tsx`

- [ ] **Step 1: Replace Stepper.tsx**

Replace entire contents of `src/web/src/components/Stepper.tsx`:

```tsx
import { cn } from '@/lib/utils'

const STEPS: [1 | 2 | 3 | 4, string][] = [
  [1, 'Resume Analysis'],
  [2, 'Interview Plan'],
  [3, 'Live Session'],
  [4, 'Evaluation'],
]

interface StepperProps {
  currentStep: 1 | 2 | 3 | 4
  onStepClick?: (step: 1 | 2 | 3 | 4) => void
}

export function Stepper({ currentStep, onStepClick }: StepperProps) {
  const circleBase = 'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors'

  return (
    <div className="flex items-center">
      {STEPS.map(([step, label], i) => {
        const isCompleted = step < currentStep
        const isActive = step === currentStep
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              {isCompleted && onStepClick ? (
                <button
                  aria-label={`Go to step ${step}`}
                  onClick={() => onStepClick(step)}
                  className={cn(
                    circleBase,
                    'bg-green-400 text-white',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  )}
                >
                  ✓
                </button>
              ) : (
                <div
                  className={cn(
                    circleBase,
                    isCompleted && 'bg-green-400 text-white',
                    isActive && 'bg-indigo-500 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-background',
                    !isCompleted && !isActive && 'bg-muted text-muted-foreground',
                  )}
                >
                  {isCompleted ? '✓' : step}
                </div>
              )}
              <span
                className={cn(
                  'text-xs hidden sm:block whitespace-nowrap',
                  isActive
                    ? 'text-foreground font-semibold'
                    : isCompleted
                      ? 'text-green-400 font-semibold'
                      : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-12 md:w-20 mx-2 mb-4 transition-colors',
                  step < currentStep ? 'bg-green-400' : 'bg-muted',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Update the broken Stepper test assertion**

In `src/web/src/components/Stepper.test.tsx`, find and replace the last `it` block that checks `text-slate-100`:

Old:
```tsx
  it('renders the active step label with white color and semi-bold weight', () => {
    render(<Stepper currentStep={2} />)
    const label = screen.getByText('Interview Plan')
    expect(label.className).toContain('text-slate-100')
    expect(label.className).toContain('font-semibold')
  })
```

New:
```tsx
  it('renders the active step label with foreground color and semi-bold weight', () => {
    render(<Stepper currentStep={2} />)
    const label = screen.getByText('Interview Plan')
    expect(label.className).toContain('text-foreground')
    expect(label.className).toContain('font-semibold')
  })
```

- [ ] **Step 3: Replace CandidateChips.tsx**

Replace entire contents of `src/web/src/components/ui/CandidateChips.tsx`:

```tsx
interface CandidateChipsProps {
  role: string
  yearsExperience?: number
  topSkills: string[]
}

export function CandidateChips({ role, yearsExperience, topSkills }: CandidateChipsProps) {
  const displaySkills = topSkills.slice(0, 3).join(' · ')
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center rounded-full border border-violet-700/50 bg-violet-900/40 px-3 py-1 text-xs font-medium text-violet-300">
        {role}
      </span>
      {yearsExperience !== undefined && (
        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {yearsExperience} yrs exp
        </span>
      )}
      {displaySkills && (
        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {displaySkills}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run full test suite**

```bash
cd src/web && npm test
```

Expected: PASS — all tests green including the updated Stepper test.

- [ ] **Step 5: Commit**

```bash
git add src/web/src/components/Stepper.tsx src/web/src/components/Stepper.test.tsx src/web/src/components/ui/CandidateChips.tsx
git commit -m "refactor: migrate Stepper and CandidateChips to CSS variable color classes"
```

---

## Task 10: Manual verification

No code changes — verify end-to-end in the browser.

- [ ] **Step 1: Start both servers**

```bash
# Terminal 1
dotnet run --project src/InterviewAssistant.Api

# Terminal 2
cd src/web && npm run dev
```

Open `http://localhost:5173`.

- [ ] **Step 2: Verify toggle behavior**

- Moon icon visible top-right of header on HomeScreen
- Click → entire page switches to light mode instantly (no reload)
- Moon changes to Sun icon
- Navigate through all 4 wizard steps — toggle stays visible on every page
- Click Sun → switches back to dark instantly
- Refresh page → chosen theme persists

- [ ] **Step 3: Verify OS preference (first-visit)**

1. DevTools → Application → Local Storage → delete `theme` key
2. DevTools → Rendering → Emulate CSS media feature `prefers-color-scheme: dark`
3. Hard-refresh → app opens dark without localStorage key
4. Switch emulation to `light` → hard-refresh → app opens light

- [ ] **Step 4: Verify keyboard accessibility**

1. Tab to toggle button → visible focus ring appears
2. Press Enter → theme switches
3. Press Space → theme switches back
4. `aria-label` reads "Switch to light mode" (dark) / "Switch to dark mode" (light)

- [ ] **Step 5: Final test run**

```bash
cd src/web && npm test
```

Expected: PASS — all tests green.
