# Interview Assistant — React UI Design Spec
Generated: 2026-05-03

## Overview

A standalone React web application that gives interviewers a guided, 4-step wizard for conducting AI-assisted interviews. The app lives in the existing `maf-interview-assistant-api` monorepo alongside the .NET API.

---

## Monorepo Structure

```
maf-interview-assistant-api/
├── src/                          ← existing .NET API (unchanged)
│   └── InterviewAssistant.Api/
├── web/                          ← new React frontend
│   ├── src/
│   │   ├── api/                  ← typed fetch wrappers for the 4 endpoints
│   │   ├── components/           ← shared UI (Stepper, LoadingSpinner, ErrorBanner, etc.)
│   │   ├── pages/                ← one component per wizard step
│   │   │   ├── AnalyzeStep.tsx
│   │   │   ├── PlanStep.tsx
│   │   │   ├── SessionStep.tsx
│   │   │   └── EvaluationStep.tsx
│   │   ├── repositories/
│   │   │   ├── SessionRepository.ts          ← interface
│   │   │   └── LocalStorageSessionRepository.ts
│   │   ├── store/
│   │   │   ├── SessionContext.tsx
│   │   │   └── sessionReducer.ts
│   │   ├── types/                ← TypeScript types mirroring .NET models
│   │   └── App.tsx               ← root with stepper orchestration + home screen
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── tests/                        ← existing .NET tests (unchanged)
└── CLAUDE.md
```

Environment variable in `web/.env`:
```
VITE_API_URL=http://localhost:5001
```

---

## Tech Stack

| Concern | Choice |
|---|---|
| Bundler | Vite |
| Framework | React 18 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| HTTP | Native `fetch` |
| State | React Context + useReducer |
| Persistence | localStorage (via repository abstraction) |

---

## UX: Linear Wizard

The app has two top-level views:

### Home Screen
- Lists all saved sessions with candidate name, role, last-updated date, and status badge (In Progress / Complete)
- "New Interview" button creates a new session UUID and navigates to Step 1
- "Resume →" opens an in-progress session at its last completed step
- "View →" opens a completed session at Step 4 (read-only)

### Wizard (Steps 1–4)
A stepper header shows progress. Users can navigate back to completed steps but cannot skip forward.

---

## Step Designs

### Step 1 — Resume Analysis
**Input:** Resume text (textarea) + Target role (text input, default "Software Engineer")
**Action:** `POST /api/interview/analyze` → `{ profile: ResumeProfile, seniority: SeniorityAssessment }`
**Output displayed:** Candidate name, current title, years of experience, core skills (chips), seniority level + confidence %
**Next:** "Next: Interview Plan →" (enabled once analysis succeeds; `Session.candidateName` is populated from `profile.candidateName` at this point)

### Step 2 — Interview Plan
**Input:** Profile + seniority from Step 1 (auto-sent, no user input required)
**Action on enter:** `POST /api/interview/plan` (simple mode) → `InterviewPlan`
**Output displayed:** Each round as a card (name, duration, questions list) + rubric dimensions
**Revision flow:** Free-text input + "Revise" button → `POST /api/interview/plan/revise` → replaces displayed plan
**Next:** "Start Interview →"

### Step 3 — Live Interview Session
**Input:** Interview plan from Step 2 (displayed as read-only reference, rounds shown for reference) + interviewer notes (single free-text textarea)
**No API call** — this is the human-in-the-loop step
**Output:** Notes captured as a single free-text block (maps to `Session.notes`)
**Next:** "Complete Interview →"

### Step 4 — Evaluation
**Input:** Profile (Step 1) + Plan (Step 2) + Notes (Step 3)
**Action on enter:** `POST /api/interview/evaluate` → `EvaluationResult`
**Output displayed:**
- Overall score (large number)
- Recommendation (e.g. "Strong Hire") with color coding
- Strengths list
- Risks list
- Follow-up questions list
**Actions:** "← Back to Sessions" / "+ New Interview"

---

## Session State Model

```ts
type Session = {
  id: string                      // UUID
  candidateName: string
  role: string
  createdAt: string               // ISO 8601
  updatedAt: string               // ISO 8601
  currentStep: 1 | 2 | 3 | 4
  resumeText: string
  profile?: ResumeProfile
  seniority?: SeniorityAssessment
  plan?: InterviewPlan
  notes: string                   // free-text from Step 3
  evaluation?: EvaluationResult
}
```

---

## Session Persistence

**Interface (`SessionRepository.ts`):**
```ts
interface SessionRepository {
  save(session: Session): void
  load(id: string): Session | null
  list(): Session[]
  delete(id: string): void
}
```

**Implementation (`LocalStorageSessionRepository.ts`):**
- Stores all sessions under `localStorage` key `interview_sessions` as `Record<string, Session>`
- `save` merges by UUID and updates `updatedAt`
- `list` returns all sessions sorted by `updatedAt` descending

**Save points:** The session is persisted after every successful API response. Step 3 (no API call) saves on every keystroke debounced at 500ms.

---

## State Management

- `SessionContext` wraps the entire app; provides `state`, `dispatch`, and `repository`
- `useReducer` handles actions: `CREATE_SESSION`, `SET_PROFILE`, `SET_PLAN`, `SET_NOTES`, `SET_EVALUATION`, `SET_STEP`, `LOAD_SESSION`
- Each action that mutates session data calls `repository.save(nextSession)` inside the reducer (or via a middleware effect)

---

## API Client

File: `web/src/api/interviewApi.ts`

Four functions, all reading `import.meta.env.VITE_API_URL`:

```ts
analyzeResume(resumeText: string, role: string): Promise<AnalyzeResumeResponse>
generatePlan(profile: ResumeProfile, seniority: SeniorityAssessment, role: string): Promise<InterviewPlan>
revisePlan(plan: InterviewPlan, feedback: string): Promise<InterviewPlan>
evaluate(profile: ResumeProfile, plan: InterviewPlan, notes: string): Promise<EvaluationResult>
```

All functions throw a typed `ApiError` on non-2xx responses, including the status code and body. No third-party HTTP library.

---

## CORS Configuration

`Program.cs` in the .NET API gets a named CORS policy `"DevFrontend"` applied in Development only:
- Allowed origin: `http://localhost:5173`
- Allowed methods: GET, POST, OPTIONS
- Allowed headers: Content-Type

---

## Error Handling

- Each step displays an inline `ErrorBanner` component on API failure
- The session state is not advanced on failure — the step stays editable
- The user can retry without data loss (session already persisted at previous step)
- Network errors and 4xx/5xx are distinguished in the error message

---

## TypeScript Types

All types in `web/src/types/` mirror the .NET models exactly:

- `ResumeProfile`, `SeniorityAssessment` (from `/analyze` response)
- `InterviewPlan`, `InterviewRound`, `RubricItem` (from `/plan` response)
- `EvaluationResult` (from `/evaluate` response)
- `AnalyzeResumeResponse` = `{ profile: ResumeProfile; seniority: SeniorityAssessment }`

---

## Out of Scope (this iteration)

- Authentication / user accounts
- Multi-user / shared sessions
- Backend session persistence (localStorage only for now — repository abstraction makes migration straightforward)
- PDF resume upload (plain text only)
- Email/export of evaluation report
