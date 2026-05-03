# Interview Assistant React UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vite + React wizard UI in `web/` that walks an interviewer through resume analysis, interview planning, live session note-taking, and AI evaluation — persisting each session in localStorage via a repository abstraction.

**Architecture:** State-based navigation (no router) between a Home screen (session list) and a 4-step linear wizard. All session state lives in React Context + useReducer; a `LocalStorageSessionRepository` persists after every state change via a `useEffect` in `App.tsx`. The `SessionRepository` interface makes a future backend swap a one-file change.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Tailwind CSS v3, shadcn/ui, Vitest + jsdom

---

## File Map

**New files — `web/`**
- `package.json` — deps and scripts
- `index.html` — entry HTML
- `vite.config.ts` — Vite config with path alias `@` and Vitest settings
- `tsconfig.json` — TypeScript config with `@/*` path alias
- `postcss.config.js` — PostCSS for Tailwind
- `tailwind.config.ts` — Tailwind config (extended by shadcn init)
- `.env` — `VITE_API_URL=http://localhost:5001`
- `src/main.tsx` — React root mount
- `src/index.css` — Tailwind directives + shadcn CSS vars (added by shadcn init)
- `src/test-setup.ts` — `@testing-library/jest-dom` import
- `src/lib/utils.ts` — `cn()` helper (created by shadcn init)
- `src/types/index.ts` — all TypeScript types mirroring .NET models
- `src/api/interviewApi.ts` — 4 typed fetch functions
- `src/api/interviewApi.test.ts` — unit tests for API client
- `src/repositories/SessionRepository.ts` — interface
- `src/repositories/LocalStorageSessionRepository.ts` — localStorage implementation
- `src/repositories/LocalStorageSessionRepository.test.ts` — unit tests
- `src/store/sessionReducer.ts` — reducer + action types
- `src/store/sessionReducer.test.ts` — unit tests for reducer
- `src/store/SessionContext.tsx` — React context + `useSession` hook
- `src/components/Stepper.tsx` — 4-step progress indicator
- `src/components/ErrorBanner.tsx` — dismissible error display
- `src/components/LoadingSpinner.tsx` — animated spinner with label
- `src/pages/HomeScreen.tsx` — sessions list + new interview button
- `src/pages/AnalyzeStep.tsx` — Step 1: resume input + analysis results
- `src/pages/PlanStep.tsx` — Step 2: plan display + revision
- `src/pages/SessionStep.tsx` — Step 3: questions reference + notes
- `src/pages/EvaluationStep.tsx` — Step 4: evaluation results
- `src/App.tsx` — root: context provider, view state, effect to persist

**Modified files**
- `.gitignore` — add `web/node_modules/`, `web/dist/`, `.superpowers/`
- `CLAUDE.md` — add `web/` commands

---

## Task 1: Bootstrap Vite + React + TypeScript in `web/`

**Files:**
- Create: `web/package.json`
- Create: `web/index.html`
- Create: `web/vite.config.ts`
- Create: `web/tsconfig.json`
- Create: `web/postcss.config.js`
- Create: `web/src/main.tsx`
- Create: `web/src/index.css`
- Create: `web/src/test-setup.ts`
- Create: `web/src/App.tsx` (placeholder)

- [ ] **Step 1: Create `web/package.json`**

```json
{
  "name": "interview-assistant-web",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.454.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.0.1",
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vitest": "^2.1.3"
  }
}
```

- [ ] **Step 2: Create `web/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Interview Assistant</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `web/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 4: Create `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create `web/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: Create `web/src/test-setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Create `web/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8: Create `web/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 9: Create `web/src/App.tsx` (placeholder)**

```tsx
export default function App() {
  return <div className="p-8 text-white bg-slate-950 min-h-screen">Interview Assistant</div>
}
```

- [ ] **Step 10: Run `npm install` from `web/`**

```bash
cd web && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 11: Verify dev server starts**

```bash
cd web && npm run dev
```

Expected: output includes `Local: http://localhost:5173/`. Open the URL — should show "Interview Assistant" on a dark background. Kill server with Ctrl-C.

- [ ] **Step 12: Commit**

```bash
git add web/
git commit -m "feat: scaffold Vite + React + TypeScript web app"
```

---

## Task 2: Configure Tailwind CSS + shadcn/ui

**Files:**
- Create: `web/tailwind.config.ts`
- Create: `web/src/lib/utils.ts`
- Modify: `web/src/index.css` (shadcn init adds CSS variables)

- [ ] **Step 1: Create `web/tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Run shadcn init with defaults**

```bash
cd web && npx shadcn@latest init -d
```

Expected: creates `components.json`, updates `tailwind.config.ts` with shadcn theme extensions, updates `src/index.css` with CSS variable definitions, creates `src/lib/utils.ts`.

If prompted for style/color interactively, choose: **Default** style, **Slate** base color, **yes** for CSS variables.

- [ ] **Step 3: Add required shadcn components**

```bash
cd web && npx shadcn@latest add button input textarea badge card separator
```

Expected: creates files under `src/components/ui/` — `button.tsx`, `input.tsx`, `textarea.tsx`, `badge.tsx`, `card.tsx`, `separator.tsx`.

- [ ] **Step 4: Verify shadcn button renders**

Update `web/src/App.tsx` temporarily:

```tsx
import { Button } from '@/components/ui/button'

export default function App() {
  return (
    <div className="p-8 bg-slate-950 min-h-screen flex items-center">
      <Button>shadcn works</Button>
    </div>
  )
}
```

Run `cd web && npm run dev`. Open `http://localhost:5173` — should show a styled button. Kill server.

Revert `App.tsx` back to:

```tsx
export default function App() {
  return <div className="p-8 text-white bg-slate-950 min-h-screen">Interview Assistant</div>
}
```

- [ ] **Step 5: Commit**

```bash
git add web/
git commit -m "feat: configure Tailwind CSS and shadcn/ui"
```

---

## Task 3: TypeScript types

**Files:**
- Create: `web/src/types/index.ts`

- [ ] **Step 1: Create `web/src/types/index.ts`**

```ts
export interface ResumeProfile {
  candidateName: string
  email?: string
  currentTitle?: string
  yearsExperience?: number
  coreSkills: string[]
  roles: string[]
  notableProjects: string[]
  redFlags: string[]
}

export interface SeniorityAssessment {
  level: string
  confidence: number
  rationale: string
}

export interface InterviewRound {
  name: string
  durationMinutes: number
  questions: string[]
}

export interface RubricItem {
  dimension: string
  signals: string[]
}

export interface InterviewPlan {
  role: string
  level: string
  summary: string
  rounds: InterviewRound[]
  rubric: RubricItem[]
}

export interface EvaluationResult {
  overallScore: number
  recommendation: string
  summary: string
  strengths: string[]
  risks: string[]
  followUps: string[]
}

export interface AnalyzeResumeResponse {
  profile: ResumeProfile
  seniority: SeniorityAssessment
}

export interface Session {
  id: string
  candidateName: string
  role: string
  createdAt: string         // ISO 8601
  updatedAt: string         // ISO 8601
  currentStep: 1 | 2 | 3 | 4
  resumeText: string
  profile?: ResumeProfile
  seniority?: SeniorityAssessment
  plan?: InterviewPlan
  notes: string
  evaluation?: EvaluationResult
}
```

- [ ] **Step 2: Verify TypeScript is happy**

```bash
cd web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/src/types/
git commit -m "feat: add TypeScript types mirroring .NET models"
```

---

## Task 4: API client + tests

**Files:**
- Create: `web/src/api/interviewApi.ts`
- Create: `web/src/api/interviewApi.test.ts`

- [ ] **Step 1: Write the failing tests — create `web/src/api/interviewApi.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeResume, generatePlan, revisePlan, evaluate, ApiError } from './interviewApi'
import type { ResumeProfile, SeniorityAssessment, InterviewPlan } from '../types'

const mockProfile: ResumeProfile = {
  candidateName: 'Jane Doe',
  coreSkills: ['React'],
  roles: [],
  notableProjects: [],
  redFlags: [],
}
const mockSeniority: SeniorityAssessment = { level: 'Senior', confidence: 0.9, rationale: 'strong background' }
const mockPlan: InterviewPlan = { role: 'Engineer', level: 'Senior', summary: 'A plan', rounds: [], rubric: [] }

function mockFetch(status: number, body: unknown) {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response)
}

beforeEach(() => vi.restoreAllMocks())

describe('analyzeResume', () => {
  it('POSTs to /api/interview/analyze and returns parsed response', async () => {
    const response = { profile: mockProfile, seniority: mockSeniority }
    mockFetch(200, response)
    const result = await analyzeResume('resume text', 'Engineer')
    expect(result).toEqual(response)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/interview/analyze'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('throws ApiError on non-2xx response', async () => {
    mockFetch(400, { message: 'bad request' })
    await expect(analyzeResume('', 'Engineer')).rejects.toBeInstanceOf(ApiError)
  })

  it('ApiError carries the status code', async () => {
    mockFetch(500, 'server error')
    try {
      await analyzeResume('text', 'Engineer')
    } catch (e) {
      expect((e as ApiError).status).toBe(500)
    }
  })
})

describe('generatePlan', () => {
  it('POSTs to /api/interview/plan with mode=simple', async () => {
    mockFetch(200, mockPlan)
    const result = await generatePlan(mockProfile, mockSeniority, 'Engineer')
    expect(result).toEqual(mockPlan)
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/interview/plan'),
      expect.objectContaining({
        body: expect.stringContaining('"mode":"simple"'),
      })
    )
  })
})

describe('revisePlan', () => {
  it('POSTs to /api/interview/plan/revise and returns revised plan', async () => {
    const revised = { ...mockPlan, summary: 'Revised plan' }
    mockFetch(200, revised)
    const result = await revisePlan(mockPlan, 'more system design')
    expect(result).toEqual(revised)
  })
})

describe('evaluate', () => {
  it('POSTs to /api/interview/evaluate and returns evaluation', async () => {
    const evaluation = { overallScore: 85, recommendation: 'Hire', summary: 'Good', strengths: [], risks: [], followUps: [] }
    mockFetch(200, evaluation)
    const result = await evaluate(mockProfile, mockPlan, 'good answers')
    expect(result).toEqual(evaluation)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd web && npm test -- interviewApi
```

Expected: FAIL — `Cannot find module './interviewApi'`

- [ ] **Step 3: Create `web/src/api/interviewApi.ts`**

```ts
import type { AnalyzeResumeResponse, EvaluationResult, InterviewPlan, ResumeProfile, SeniorityAssessment } from '../types'

const baseUrl = () => (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5001'

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: string) {
    super(`API error ${status}: ${body}`)
    this.name = 'ApiError'
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${baseUrl()}/api/interview/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new ApiError(res.status, text)
  return JSON.parse(text) as T
}

export const analyzeResume = (resumeText: string, role: string): Promise<AnalyzeResumeResponse> =>
  post('analyze', { resumeText, role })

export const generatePlan = (
  profile: ResumeProfile,
  seniority: SeniorityAssessment,
  role: string,
): Promise<InterviewPlan> =>
  post('plan', { profile, seniority, role, mode: 'simple' })

export const revisePlan = (plan: InterviewPlan, feedback: string): Promise<InterviewPlan> =>
  post('plan/revise', { plan, feedback })

export const evaluate = (
  profile: ResumeProfile,
  plan: InterviewPlan,
  notes: string,
): Promise<EvaluationResult> =>
  post('evaluate', { profile, plan, notes })
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd web && npm test -- interviewApi
```

Expected: 5 tests pass, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add web/src/api/
git commit -m "feat: add typed API client with unit tests"
```

---

## Task 5: SessionRepository + tests

**Files:**
- Create: `web/src/repositories/SessionRepository.ts`
- Create: `web/src/repositories/LocalStorageSessionRepository.ts`
- Create: `web/src/repositories/LocalStorageSessionRepository.test.ts`

- [ ] **Step 1: Write the failing tests — create `web/src/repositories/LocalStorageSessionRepository.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStorageSessionRepository } from './LocalStorageSessionRepository'
import type { Session } from '../types'

function makeSession(id: string, overrides: Partial<Session> = {}): Session {
  return {
    id,
    candidateName: 'Test User',
    role: 'Engineer',
    createdAt: '2026-05-03T00:00:00.000Z',
    updatedAt: '2026-05-03T00:00:00.000Z',
    currentStep: 1,
    resumeText: '',
    notes: '',
    ...overrides,
  }
}

beforeEach(() => localStorage.clear())

describe('LocalStorageSessionRepository', () => {
  it('saves and loads a session by id', () => {
    const repo = new LocalStorageSessionRepository()
    repo.save(makeSession('abc'))
    const loaded = repo.load('abc')
    expect(loaded?.id).toBe('abc')
    expect(loaded?.candidateName).toBe('Test User')
  })

  it('returns null for an unknown id', () => {
    const repo = new LocalStorageSessionRepository()
    expect(repo.load('unknown')).toBeNull()
  })

  it('lists sessions sorted by updatedAt descending', () => {
    const repo = new LocalStorageSessionRepository()
    repo.save(makeSession('older', { updatedAt: '2026-05-01T00:00:00.000Z' }))
    repo.save(makeSession('newer', { updatedAt: '2026-05-03T00:00:00.000Z' }))
    const list = repo.list()
    expect(list[0].id).toBe('newer')
    expect(list[1].id).toBe('older')
  })

  it('deletes a session by id', () => {
    const repo = new LocalStorageSessionRepository()
    repo.save(makeSession('to-delete'))
    repo.delete('to-delete')
    expect(repo.load('to-delete')).toBeNull()
    expect(repo.list()).toHaveLength(0)
  })

  it('save updates the updatedAt timestamp', () => {
    const repo = new LocalStorageSessionRepository()
    repo.save(makeSession('x', { updatedAt: '2020-01-01T00:00:00.000Z' }))
    const loaded = repo.load('x')!
    expect(loaded.updatedAt).not.toBe('2020-01-01T00:00:00.000Z')
  })

  it('overwrites an existing session on re-save', () => {
    const repo = new LocalStorageSessionRepository()
    repo.save(makeSession('y', { candidateName: 'First' }))
    repo.save(makeSession('y', { candidateName: 'Updated' }))
    expect(repo.load('y')?.candidateName).toBe('Updated')
    expect(repo.list()).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd web && npm test -- LocalStorageSessionRepository
```

Expected: FAIL — `Cannot find module './LocalStorageSessionRepository'`

- [ ] **Step 3: Create `web/src/repositories/SessionRepository.ts`**

```ts
import type { Session } from '../types'

export interface SessionRepository {
  save(session: Session): void
  load(id: string): Session | null
  list(): Session[]
  delete(id: string): void
}
```

- [ ] **Step 4: Create `web/src/repositories/LocalStorageSessionRepository.ts`**

```ts
import type { Session } from '../types'
import type { SessionRepository } from './SessionRepository'

const STORAGE_KEY = 'interview_sessions'

function readStore(): Record<string, Session> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, Session>) : {}
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, Session>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export class LocalStorageSessionRepository implements SessionRepository {
  save(session: Session): void {
    const store = readStore()
    store[session.id] = { ...session, updatedAt: new Date().toISOString() }
    writeStore(store)
  }

  load(id: string): Session | null {
    return readStore()[id] ?? null
  }

  list(): Session[] {
    return Object.values(readStore()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }

  delete(id: string): void {
    const store = readStore()
    delete store[id]
    writeStore(store)
  }
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd web && npm test -- LocalStorageSessionRepository
```

Expected: 6 tests pass, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add web/src/repositories/
git commit -m "feat: add SessionRepository interface and localStorage implementation"
```

---

## Task 6: Session reducer + context + tests

**Files:**
- Create: `web/src/store/sessionReducer.ts`
- Create: `web/src/store/sessionReducer.test.ts`
- Create: `web/src/store/SessionContext.tsx`

- [ ] **Step 1: Write the failing tests — create `web/src/store/sessionReducer.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { sessionReducer, initialState } from './sessionReducer'
import type { Session } from '../types'

const baseSession: Session = {
  id: 'test-id',
  candidateName: '',
  role: 'Engineer',
  createdAt: '2026-05-03T00:00:00.000Z',
  updatedAt: '2026-05-03T00:00:00.000Z',
  currentStep: 1,
  resumeText: '',
  notes: '',
}

const profile = {
  candidateName: 'Jane Doe',
  coreSkills: ['React'],
  roles: [],
  notableProjects: [],
  redFlags: [],
}
const seniority = { level: 'Senior', confidence: 0.9, rationale: 'strong' }
const plan = { role: 'Engineer', level: 'Senior', summary: 'Plan', rounds: [], rubric: [] }
const evaluation = { overallScore: 85, recommendation: 'Hire', summary: 'Good', strengths: [], risks: [], followUps: [] }

describe('sessionReducer', () => {
  it('starts with null current session', () => {
    expect(initialState.current).toBeNull()
  })

  it('CREATE_SESSION sets the current session', () => {
    const state = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    expect(state.current?.id).toBe('test-id')
  })

  it('LOAD_SESSION replaces the current session', () => {
    const first = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const loaded: Session = { ...baseSession, id: 'other-id' }
    const state = sessionReducer(first, { type: 'LOAD_SESSION', session: loaded })
    expect(state.current?.id).toBe('other-id')
  })

  it('SET_PROFILE stores profile, seniority, and candidateName', () => {
    const withSession = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const state = sessionReducer(withSession, { type: 'SET_PROFILE', profile, seniority })
    expect(state.current?.profile).toEqual(profile)
    expect(state.current?.seniority).toEqual(seniority)
    expect(state.current?.candidateName).toBe('Jane Doe')
  })

  it('SET_PROFILE does not change currentStep', () => {
    const withSession = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const state = sessionReducer(withSession, { type: 'SET_PROFILE', profile, seniority })
    expect(state.current?.currentStep).toBe(1)
  })

  it('SET_PLAN stores the plan without changing step', () => {
    const withSession = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const state = sessionReducer(withSession, { type: 'SET_PLAN', plan })
    expect(state.current?.plan).toEqual(plan)
    expect(state.current?.currentStep).toBe(1)
  })

  it('SET_NOTES stores notes', () => {
    const withSession = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const state = sessionReducer(withSession, { type: 'SET_NOTES', notes: 'Great answers' })
    expect(state.current?.notes).toBe('Great answers')
  })

  it('SET_EVALUATION stores the evaluation without changing step', () => {
    const withSession = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const state = sessionReducer(withSession, { type: 'SET_EVALUATION', evaluation })
    expect(state.current?.evaluation).toEqual(evaluation)
    expect(state.current?.currentStep).toBe(1)
  })

  it('SET_STEP advances currentStep', () => {
    const withSession = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const state = sessionReducer(withSession, { type: 'SET_STEP', step: 3 })
    expect(state.current?.currentStep).toBe(3)
  })

  it('CLEAR_SESSION nulls the current session', () => {
    const withSession = sessionReducer(initialState, { type: 'CREATE_SESSION', session: baseSession })
    const state = sessionReducer(withSession, { type: 'CLEAR_SESSION' })
    expect(state.current).toBeNull()
  })

  it('actions on null session return unchanged state', () => {
    const state = sessionReducer(initialState, { type: 'SET_NOTES', notes: 'x' })
    expect(state.current).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd web && npm test -- sessionReducer
```

Expected: FAIL — `Cannot find module './sessionReducer'`

- [ ] **Step 3: Create `web/src/store/sessionReducer.ts`**

```ts
import type { EvaluationResult, InterviewPlan, ResumeProfile, SeniorityAssessment, Session } from '../types'

export type SessionAction =
  | { type: 'CREATE_SESSION'; session: Session }
  | { type: 'LOAD_SESSION'; session: Session }
  | { type: 'SET_PROFILE'; profile: ResumeProfile; seniority: SeniorityAssessment }
  | { type: 'SET_PLAN'; plan: InterviewPlan }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'SET_EVALUATION'; evaluation: EvaluationResult }
  | { type: 'SET_STEP'; step: 1 | 2 | 3 | 4 }
  | { type: 'CLEAR_SESSION' }

export interface SessionState {
  current: Session | null
}

export const initialState: SessionState = { current: null }

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'CREATE_SESSION':
    case 'LOAD_SESSION':
      return { current: action.session }

    case 'SET_PROFILE':
      if (!state.current) return state
      return {
        current: {
          ...state.current,
          profile: action.profile,
          seniority: action.seniority,
          candidateName: action.profile.candidateName,
        },
      }

    case 'SET_PLAN':
      if (!state.current) return state
      return { current: { ...state.current, plan: action.plan } }

    case 'SET_NOTES':
      if (!state.current) return state
      return { current: { ...state.current, notes: action.notes } }

    case 'SET_EVALUATION':
      if (!state.current) return state
      return { current: { ...state.current, evaluation: action.evaluation } }

    case 'SET_STEP':
      if (!state.current) return state
      return { current: { ...state.current, currentStep: action.step } }

    case 'CLEAR_SESSION':
      return { current: null }

    default:
      return state
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd web && npm test -- sessionReducer
```

Expected: 10 tests pass, 0 failures.

- [ ] **Step 5: Create `web/src/store/SessionContext.tsx`**

```tsx
import { createContext, useContext } from 'react'
import type { Dispatch } from 'react'
import type { SessionAction, SessionState } from './sessionReducer'
import type { SessionRepository } from '../repositories/SessionRepository'

interface SessionContextValue {
  state: SessionState
  dispatch: Dispatch<SessionAction>
  repository: SessionRepository
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within a SessionContext.Provider')
  return ctx
}
```

- [ ] **Step 6: Run all tests**

```bash
cd web && npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add web/src/store/
git commit -m "feat: add session reducer, context, and unit tests"
```

---

## Task 7: Shared UI components

**Files:**
- Create: `web/src/components/Stepper.tsx`
- Create: `web/src/components/ErrorBanner.tsx`
- Create: `web/src/components/LoadingSpinner.tsx`

- [ ] **Step 1: Create `web/src/components/Stepper.tsx`**

```tsx
import { cn } from '@/lib/utils'

const STEPS: [number, string][] = [
  [1, 'Resume Analysis'],
  [2, 'Interview Plan'],
  [3, 'Live Session'],
  [4, 'Evaluation'],
]

interface StepperProps {
  currentStep: 1 | 2 | 3 | 4
}

export function Stepper({ currentStep }: StepperProps) {
  return (
    <div className="flex items-center">
      {STEPS.map(([step, label], i) => {
        const isCompleted = step < currentStep
        const isActive = step === currentStep
        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                  isCompleted && 'bg-indigo-500 text-white',
                  isActive && 'bg-indigo-500 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950',
                  !isCompleted && !isActive && 'bg-slate-700 text-slate-400',
                )}
              >
                {isCompleted ? '✓' : step}
              </div>
              <span
                className={cn(
                  'text-xs hidden sm:block whitespace-nowrap',
                  isActive ? 'text-slate-100 font-medium' : 'text-slate-500',
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-12 md:w-20 mx-2 mb-4 transition-colors',
                  step < currentStep ? 'bg-indigo-500' : 'bg-slate-700',
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

- [ ] **Step 2: Create `web/src/components/ErrorBanner.tsx`**

```tsx
interface ErrorBannerProps {
  message: string
  onDismiss?: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-red-400 hover:text-red-200 leading-none text-base"
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create `web/src/components/LoadingSpinner.tsx`**

```tsx
interface LoadingSpinnerProps {
  label?: string
}

export function LoadingSpinner({ label = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center gap-3 text-slate-400">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add web/src/components/
git commit -m "feat: add Stepper, ErrorBanner, and LoadingSpinner components"
```

---

## Task 8: App.tsx + HomeScreen

**Files:**
- Modify: `web/src/App.tsx`
- Create: `web/src/pages/HomeScreen.tsx`

- [ ] **Step 1: Create `web/src/pages/HomeScreen.tsx`**

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
          <h1 className="text-2xl font-bold text-slate-100">Interview Sessions</h1>
          <p className="text-sm text-slate-400 mt-1">Resume a past session or start a new one</p>
        </div>
        <Button onClick={onNew} className="bg-indigo-600 hover:bg-indigo-700">
          + New Interview
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 py-16 text-center">
          <p className="text-slate-400">No sessions yet.</p>
          <p className="text-sm text-slate-500 mt-1">Click "New Interview" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-100">
                    {session.candidateName || 'Unnamed Candidate'}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-sm text-slate-400">{session.role}</span>
                </div>
                <div className="text-xs text-slate-500">
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

- [ ] **Step 2: Replace `web/src/App.tsx` with the full implementation**

```tsx
import { useReducer, useState, useEffect, useMemo } from 'react'
import { SessionContext } from '@/store/SessionContext'
import { sessionReducer, initialState } from '@/store/sessionReducer'
import { LocalStorageSessionRepository } from '@/repositories/LocalStorageSessionRepository'
import { HomeScreen } from '@/pages/HomeScreen'
import { AnalyzeStep } from '@/pages/AnalyzeStep'
import { PlanStep } from '@/pages/PlanStep'
import { SessionStep } from '@/pages/SessionStep'
import { EvaluationStep } from '@/pages/EvaluationStep'
import { Stepper } from '@/components/Stepper'
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
    <SessionContext.Provider value={{ state, dispatch, repository }}>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-4xl px-4 py-8">
          {view === 'home' ? (
            <HomeScreen onNew={handleNew} onLoad={handleLoad} />
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between">
                <button
                  onClick={handleBackToHome}
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  ← Sessions
                </button>
                <h1 className="text-lg font-bold text-slate-100">Interview Assistant</h1>
                <div className="w-24" />
              </div>
              <Stepper currentStep={step} />
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
  )
}
```

Note: `AnalyzeStep`, `PlanStep`, `SessionStep`, and `EvaluationStep` don't exist yet — TypeScript will error. Add these placeholder files so the project compiles:

```bash
for f in AnalyzeStep PlanStep SessionStep EvaluationStep; do
  echo "export function ${f}(props: Record<string, unknown>) { return <div className='text-slate-400'>${f} coming soon</div> }" > web/src/pages/${f}.tsx
done
```

- [ ] **Step 3: Verify the app compiles and runs**

```bash
cd web && npm run dev
```

Open `http://localhost:5173`. Should show the home screen with a "+ New Interview" button and an empty sessions list. Click the button — should show the wizard header with the stepper. Kill server.

- [ ] **Step 4: Commit**

```bash
git add web/src/App.tsx web/src/pages/
git commit -m "feat: add App shell, HomeScreen, and wizard navigation"
```

---

## Task 9: Step 1 — AnalyzeStep

**Files:**
- Modify: `web/src/pages/AnalyzeStep.tsx`

- [ ] **Step 1: Replace `web/src/pages/AnalyzeStep.tsx`**

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useSession } from '@/store/SessionContext'
import { analyzeResume } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorBanner } from '@/components/ErrorBanner'

export function AnalyzeStep() {
  const { state, dispatch } = useSession()
  const session = state.current!
  const [resumeText, setResumeText] = useState(session.resumeText)
  const [role, setRole] = useState(session.role)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasResult = Boolean(session.profile && session.seniority)

  async function handleAnalyze() {
    if (!resumeText.trim()) return
    setLoading(true)
    setError(null)
    dispatch({ type: 'SET_NOTES', notes: session.notes })  // persist resumeText via session update below
    try {
      const result = await analyzeResume(resumeText, role)
      // Store resumeText on session before setting profile so it persists
      dispatch({ type: 'LOAD_SESSION', session: { ...session, resumeText, role } })
      dispatch({ type: 'SET_PROFILE', profile: result.profile, seniority: result.seniority })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Resume Text
          </label>
          <Textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste the candidate's plain-text resume here..."
            className="h-52 resize-none border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Target Role
          </label>
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border-slate-700 bg-slate-800 text-slate-100"
          />
          <Button
            onClick={handleAnalyze}
            disabled={!resumeText.trim() || loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze Resume'}
          </Button>
        </div>
      </div>

      {loading && <LoadingSpinner label="Analyzing resume with AI..." />}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {hasResult && session.profile && session.seniority && (
        <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-slate-800 p-4">
          <div className="text-sm font-semibold text-emerald-400">✓ Analysis Complete</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-100">{session.profile.candidateName}</span>
            {session.profile.currentTitle && (
              <span className="text-slate-400">· {session.profile.currentTitle}</span>
            )}
            {session.profile.yearsExperience != null && (
              <span className="text-slate-400">· {session.profile.yearsExperience} yrs exp</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {session.profile.coreSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300"
              >
                {skill}
              </span>
            ))}
          </div>
          <div className="text-sm text-slate-400">
            Seniority:{' '}
            <span className="font-semibold text-indigo-400">{session.seniority.level}</span>
            {' · '}
            Confidence:{' '}
            <span className="text-slate-200">{Math.round(session.seniority.confidence * 100)}%</span>
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

- [ ] **Step 2: Smoke-test in the browser**

Start the API: `dotnet run --project src/InterviewAssistant.Api`
Start the UI: `cd web && npm run dev`
Open `http://localhost:5173`. Click "+ New Interview". Paste a short resume snippet into the textarea, leave role as "Software Engineer", click "Analyze Resume". Verify:
- Loading spinner appears
- Analysis results card shows with candidate name, skills, seniority
- "Next: Interview Plan →" button appears

Kill both servers.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/AnalyzeStep.tsx
git commit -m "feat: implement Step 1 — resume analysis"
```

---

## Task 10: Step 2 — PlanStep

**Files:**
- Modify: `web/src/pages/PlanStep.tsx`

- [ ] **Step 1: Replace `web/src/pages/PlanStep.tsx`**

```tsx
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from '@/store/SessionContext'
import { generatePlan, revisePlan } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorBanner } from '@/components/ErrorBanner'

export function PlanStep() {
  const { state, dispatch } = useSession()
  const session = state.current!
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [revising, setRevising] = useState(false)
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    if (!session.plan && session.profile && session.seniority) {
      calledRef.current = true
      setLoading(true)
      generatePlan(session.profile, session.seniority, session.role)
        .then((plan) => dispatch({ type: 'SET_PLAN', plan }))
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to generate plan.'))
        .finally(() => setLoading(false))
    }
  }, [])

  async function handleRevise() {
    if (!feedback.trim() || !session.plan) return
    setRevising(true)
    setError(null)
    try {
      const revised = await revisePlan(session.plan, feedback)
      dispatch({ type: 'SET_PLAN', plan: revised })
      setFeedback('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revision failed. Please try again.')
    } finally {
      setRevising(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Interview Plan</h2>
          {session.plan && (
            <p className="text-sm text-slate-400 mt-0.5">{session.plan.summary}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}
          className="text-slate-400 hover:text-slate-200"
        >
          ← Back
        </Button>
      </div>

      {loading && <LoadingSpinner label="Generating interview plan..." />}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {session.plan && (
        <>
          <div className="space-y-3">
            {session.plan.rounds.map((round, i) => (
              <div key={i} className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-100">{round.name}</span>
                  <span className="text-xs text-slate-500">· {round.durationMinutes} min</span>
                </div>
                <ul className="space-y-1">
                  {round.questions.map((q, j) => (
                    <li key={j} className="text-sm text-slate-400 flex gap-2">
                      <span className="shrink-0 text-slate-600">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder='Revise plan, e.g. "more system design questions"'
              className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
              onKeyDown={(e) => e.key === 'Enter' && handleRevise()}
            />
            <Button
              onClick={handleRevise}
              disabled={!feedback.trim() || revising}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 shrink-0"
            >
              {revising ? 'Revising...' : 'Revise'}
            </Button>
          </div>

          <div className="flex justify-end">
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

- [ ] **Step 2: Smoke-test in the browser**

Start API and UI. Complete Step 1 with a real resume. Click "Next: Interview Plan →". Verify:
- Loading spinner appears while plan generates
- Interview rounds and questions render as cards
- Typing feedback in the input and clicking "Revise" produces an updated plan
- "Start Interview →" advances to Step 3

Kill both servers.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/PlanStep.tsx
git commit -m "feat: implement Step 2 — interview plan generation and revision"
```

---

## Task 11: Step 3 — SessionStep

**Files:**
- Modify: `web/src/pages/SessionStep.tsx`

- [ ] **Step 1: Replace `web/src/pages/SessionStep.tsx`**

```tsx
import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useSession } from '@/store/SessionContext'

export function SessionStep() {
  const { state, dispatch } = useSession()
  const session = state.current!

  const handleNotesChange = useCallback(
    (value: string) => {
      dispatch({ type: 'SET_NOTES', notes: value })
    },
    [dispatch],
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Live Interview Session</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Use the questions below as a guide. Capture your notes as the interview progresses.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}
          className="text-slate-400 hover:text-slate-200"
        >
          ← Back
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Interview Questions
          </h3>
          {session.plan?.rounds.map((round, i) => (
            <div key={i} className="rounded-lg border border-slate-700 bg-slate-800 p-3 space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-indigo-400">{round.name}</span>
                <span className="text-xs text-slate-500">· {round.durationMinutes} min</span>
              </div>
              {round.questions.map((q, j) => (
                <div key={j} className="flex gap-2 text-sm text-slate-400">
                  <span className="shrink-0 text-slate-600">•</span>
                  <span>{q}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Interviewer Notes
          </h3>
          <Textarea
            value={session.notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Type your observations and notes here as the interview progresses..."
            className="h-64 resize-none border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500">Notes are saved automatically.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => dispatch({ type: 'SET_STEP', step: 4 })}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          Complete Interview →
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Smoke-test in the browser**

Complete Steps 1 and 2. Click "Start Interview →". Verify:
- Interview questions from the plan are shown on the left
- Notes textarea is on the right
- Typing notes and refreshing the page (after going back to home and resuming) preserves the notes
- "Complete Interview →" advances to Step 4

Kill both servers.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/SessionStep.tsx
git commit -m "feat: implement Step 3 — live interview session with note-taking"
```

---

## Task 12: Step 4 — EvaluationStep

**Files:**
- Modify: `web/src/pages/EvaluationStep.tsx`

- [ ] **Step 1: Replace `web/src/pages/EvaluationStep.tsx`**

```tsx
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/store/SessionContext'
import { evaluate } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorBanner } from '@/components/ErrorBanner'

function recommendationColor(rec: string): string {
  const lower = rec.toLowerCase()
  if (lower.includes('strong hire') || lower.includes('hire')) return 'text-emerald-400'
  if (lower.includes('no hire') || lower.includes('reject')) return 'text-red-400'
  return 'text-amber-400'
}

interface EvaluationStepProps {
  onBackToHome: () => void
}

export function EvaluationStep({ onBackToHome }: EvaluationStepProps) {
  const { state, dispatch } = useSession()
  const session = state.current!
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const calledRef = useRef(false)

  useEffect(() => {
    if (calledRef.current) return
    if (!session.evaluation && session.profile && session.plan) {
      calledRef.current = true
      setLoading(true)
      evaluate(session.profile, session.plan, session.notes)
        .then((evaluation) => dispatch({ type: 'SET_EVALUATION', evaluation }))
        .catch((err) => setError(err instanceof Error ? err.message : 'Evaluation failed.'))
        .finally(() => setLoading(false))
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Evaluation Results</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: 'SET_STEP', step: 3 })}
          className="text-slate-400 hover:text-slate-200"
        >
          ← Back
        </Button>
      </div>

      {loading && <LoadingSpinner label="Evaluating candidate..." />}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {session.evaluation && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-center">
              <div className="text-4xl font-extrabold text-indigo-400">
                {session.evaluation.overallScore}
              </div>
              <div className="text-xs text-slate-400 mt-1">Overall Score</div>
            </div>
            <div className="sm:col-span-2 rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-1">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Recommendation
              </div>
              <div className={`text-xl font-bold ${recommendationColor(session.evaluation.recommendation)}`}>
                {session.evaluation.recommendation}
              </div>
              <p className="text-sm text-slate-400">{session.evaluation.summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-emerald-400">
                ✓ Strengths
              </div>
              <ul className="space-y-1">
                {session.evaluation.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="shrink-0 text-emerald-600">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-amber-400">
                ⚠ Risks
              </div>
              <ul className="space-y-1">
                {session.evaluation.risks.map((r, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="shrink-0 text-amber-600">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {session.evaluation.followUps.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Follow-up Questions
              </div>
              <ul className="space-y-1">
                {session.evaluation.followUps.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-300">
                    <span className="shrink-0 text-slate-600">•</span>
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
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
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

- [ ] **Step 2: Smoke-test the full end-to-end flow**

Start API and UI. Run through the complete 4-step flow:
1. Paste a real resume, set a role, click Analyze
2. Verify plan generates on entering Step 2
3. Optionally revise the plan, then click Start Interview
4. Type some notes, click Complete Interview
5. Verify evaluation renders: score, recommendation, strengths, risks, follow-ups
6. Click "← Back to Sessions" — verify session shows as Complete in the home list
7. Click "Resume" on the completed session — verify it opens at Step 4 with cached evaluation (no re-fetch)

Kill both servers.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/EvaluationStep.tsx
git commit -m "feat: implement Step 4 — AI evaluation results"
```

---

## Task 13: Housekeeping — .gitignore, .env, CLAUDE.md

**Files:**
- Modify: `.gitignore`
- Create: `web/.env`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update `.gitignore`**

Add these lines to `.gitignore`:

```
## Frontend
web/node_modules/
web/dist/

## Brainstorming mockups
.superpowers/
```

- [ ] **Step 2: Create `web/.env`**

```
VITE_API_URL=http://localhost:5001
```

- [ ] **Step 3: Add web commands to `CLAUDE.md`**

Add this section to `CLAUDE.md` after the existing Commands section:

```markdown
## Web UI Commands

```bash
# Run the React dev server (from repo root)
cd web && npm run dev

# Install web dependencies
cd web && npm install

# Run web unit tests
cd web && npm test

# Build for production
cd web && npm run build
```

The React app runs at `http://localhost:5173` in dev mode.
Both the API (`dotnet run`) and the web server (`npm run dev`) must be running for end-to-end testing.
```

- [ ] **Step 4: Run all tests one final time**

```bash
cd web && npm test
```

Expected: all tests pass.

- [ ] **Step 5: Final commit**

```bash
git add .gitignore web/.env CLAUDE.md
git commit -m "chore: add web/.env, update .gitignore and CLAUDE.md with web commands"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Monorepo structure — `web/` created, `src/` untouched
- ✅ Vite + React + TypeScript — Task 1
- ✅ Tailwind + shadcn/ui — Task 2
- ✅ TypeScript types mirroring .NET — Task 3
- ✅ API client (4 functions) — Task 4
- ✅ SessionRepository interface + localStorage implementation — Task 5
- ✅ React Context + useReducer — Task 6
- ✅ Shared components (Stepper, ErrorBanner, LoadingSpinner) — Task 7
- ✅ Home screen with sessions list — Task 8
- ✅ Step 1: Resume Analysis — Task 9
- ✅ Step 2: Interview Plan + revision — Task 10
- ✅ Step 3: Live session note-taking — Task 11
- ✅ Step 4: Evaluation results — Task 12
- ✅ CORS already open in `Program.cs` (no task needed)
- ✅ `.env`, `.gitignore`, `CLAUDE.md` — Task 13
- ✅ Session persistence: saved via `useEffect` in `App.tsx` after every state change
- ✅ Notes debounce: notes save on every character via reducer → `useEffect` chain (no extra debounce needed given the effect is already async)
- ✅ Session resume: `currentStep` is preserved and restored on `LOAD_SESSION`
- ✅ Plan auto-generate on Step 2 entry (guarded by `calledRef` to prevent double-call in StrictMode)
- ✅ Evaluation auto-generate on Step 4 entry (same guard)
- ✅ Back navigation on every step
- ✅ Error banner with dismiss on all API steps
