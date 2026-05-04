# Interview Assistant — Web UI

A guided, AI-powered interview tool for interviewers. Walks through a 4-step wizard: resume analysis, interview plan generation, live note-taking, and candidate evaluation — all backed by Azure OpenAI via the Interview Assistant API.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React)                          │
│                                                                 │
│  ┌──────────────┐    ┌────────────────────────────────────────┐ │
│  │  Home Screen │    │           Wizard (Steps 1–4)           │ │
│  │              │    │                                        │ │
│  │  • Sessions  │    │  ┌──────────┐  ┌──────────────────┐   │ │
│  │    list      │───▶│  │ Step  1  │  │    Step  2       │   │ │
│  │  • New /     │    │  │ Analyze  │─▶│  Interview Plan  │   │ │
│  │    Resume    │    │  │ Resume   │  │  + Revision      │   │ │
│  └──────────────┘    │  └──────────┘  └──────────────────┘   │ │
│                      │  ┌──────────┐  ┌──────────────────┐   │ │
│                      │  │ Step  3  │  │    Step  4       │   │ │
│                      │  │  Live    │─▶│   Evaluation     │   │ │
│                      │  │ Session  │  │   & Scoring      │   │ │
│                      │  └──────────┘  └──────────────────┘   │ │
│                      └────────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   SessionContext                        │   │
│  │   useReducer ──▶ state   LocalStorageSessionRepository  │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ fetch (JSON)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│               Interview Assistant API (.NET 9)                  │
│                                                                 │
│   POST /api/interview/analyze                                   │
│   POST /api/interview/plan          Azure OpenAI                │
│   POST /api/interview/plan/revise ◀────────────────────────     │
│   POST /api/interview/evaluate                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Concern     | Choice                                    |
|-------------|-------------------------------------------|
| Bundler     | Vite 5                                    |
| Framework   | React 18                                  |
| Language    | TypeScript 5                              |
| Styling     | Tailwind CSS v3                           |
| Components  | shadcn/ui                                 |
| State       | React Context + `useReducer`              |
| Persistence | `localStorage` (repository abstraction)   |
| HTTP        | Native `fetch`                            |
| Testing     | Vitest + happy-dom                        |

---

## Project Structure

```text
src/web/
├── src/
│   ├── api/
│   │   └── interviewApi.ts          # Typed fetch wrappers for all 4 endpoints
│   ├── components/
│   │   ├── ui/                      # shadcn/ui primitives (Button, Input, etc.)
│   │   ├── ErrorBanner.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── Stepper.tsx
│   ├── pages/
│   │   ├── AnalyzeStep.tsx          # Step 1 — Resume analysis
│   │   ├── PlanStep.tsx             # Step 2 — Plan generation & revision
│   │   ├── SessionStep.tsx          # Step 3 — Live interview notes
│   │   ├── EvaluationStep.tsx       # Step 4 — AI evaluation results
│   │   └── HomeScreen.tsx           # Session list & entry point
│   ├── repositories/
│   │   ├── SessionRepository.ts     # Interface (swap-ready for backend)
│   │   └── LocalStorageSessionRepository.ts
│   ├── store/
│   │   ├── SessionContext.tsx       # React context + useSession hook
│   │   └── sessionReducer.ts       # Pure reducer + action types
│   ├── types/
│   │   └── index.ts                # TypeScript types mirroring .NET models
│   └── App.tsx                     # Root — context provider, view routing
├── .env.example                    # Environment variable template
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Prerequisites

- **Node.js** 18+
- **Interview Assistant API** running locally (see `src/InterviewAssistant.Api/`)

---

## Configuration

Copy the environment template and set the API base URL:

```bash
cp .env.example .env
```

`.env.example`:

```env
VITE_API_URL=http://localhost:5001
```

| Variable       | Description                             | Default                  |
|----------------|-----------------------------------------|--------------------------|
| `VITE_API_URL` | Base URL of the Interview Assistant API | `http://localhost:5001`  |

---

## Running Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Start the API

In a separate terminal, from the repo root:

```bash
dotnet run --project src/InterviewAssistant.Api
```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Available Scripts

| Command              | Description                         |
|----------------------|-------------------------------------|
| `npm run dev`        | Start Vite dev server with HMR      |
| `npm run build`      | Type-check and build for production |
| `npm test`           | Run unit tests (single pass)        |
| `npm run test:watch` | Run tests in watch mode             |

---

## Testing

Unit tests cover the API client, session repository, and state reducer. No browser or running API required.

```bash
npm test
```

```text
✓ src/store/sessionReducer.test.ts                        (11 tests)
✓ src/repositories/LocalStorageSessionRepository.test.ts   (6 tests)
✓ src/api/interviewApi.test.ts                             (6 tests)

Tests  23 passed
```

---

## Session Persistence

Sessions are saved to `localStorage` after every state change via a `SessionRepository` interface. The current implementation (`LocalStorageSessionRepository`) stores all sessions under the key `interview_sessions`.

Switching to a backend is a one-file change — implement `SessionRepository` and swap the instance in `App.tsx`.

---

## Interview Workflow

```text
Step 1 — Analyze Resume
  └─ Paste plain-text resume + set target role
  └─ POST /api/interview/analyze → candidate profile + seniority level

Step 2 — Interview Plan
  └─ Plan auto-generated on entry (POST /api/interview/plan)
  └─ Optional free-text revision (POST /api/interview/plan/revise)

Step 3 — Live Session
  └─ Interview questions shown as reference (read-only)
  └─ Interviewer notes textarea — saves on every keystroke

Step 4 — Evaluation
  └─ Evaluation auto-generated on entry (POST /api/interview/evaluate)
  └─ Displays score, recommendation, strengths, risks, follow-up questions
```
