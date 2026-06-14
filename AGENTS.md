# AGENTS.md

Context file for OpenAI Codex CLI. Read this before writing any code.

## Project: AI Smart Fitter

AI-powered interview assistant. Gate Keepers (GKs) use it to conduct structured
technical fit interviews across seniority levels (Trainee → Architect).

## Repo Layout

```
src/
  InterviewAssistant.Api/   .NET 9 backend (ASP.NET Core + Microsoft Agent Framework)
  web/                      React 18 + TypeScript + Vite + Tailwind CSS frontend
tests/
  InterviewAssistant.Api.Tests/             xUnit unit tests
  InterviewAssistant.Api.IntegrationTests/  xUnit integration tests (need Azure creds)
```

## Your Scope (Codex)

Codex works best on **well-bounded, pattern-repeating tasks**. Stick to:

- `src/web/` — React components, hooks, Tailwind styling, Vitest tests
- Boilerplate expansion: new wizard steps, new `shadcn/ui` components, new API client methods
- Mechanical backend tasks: adding a DTO, extending an existing service method with a new field, fixing a failing unit test

Do **not** make cross-cutting architectural decisions (agent prompts, workflow graph changes,
DI wiring) without a plan step first. Those belong to the `backend-dotnet` Claude subagent.

## Shared Conventions

### Branch naming

| Prefix | Owner |
|--------|-------|
| `cc/`  | Claude Code |
| `cx/`  | Codex |
| `feat/`, `fix/`, `refactor/`, `test/`,  | Human |

Never commit directly to `main`.

### Commit message format

```
<type>(<scope>): <short description>

Types: feat | fix | refactor | test | chore
Scope: api | web | agents | tests | ci
```

### Quality gate — must pass before any PR

Backend:
```bash
dotnet build
dotnet test tests/InterviewAssistant.Api.Tests/ --configuration Release --verbosity minimal
```

Frontend:
```bash
cd src/web && npm test
```

## Backend Rules (when you touch .NET)

- Constructor injection only; no `ServiceLocator`
- New endpoints: DTO in `Models/` → interface in `Services/` → implementation → DI in `Program.cs` → unit test
- Do **not** modify `AgentPrompts.cs` or `AgentFactory.cs` without explicit instruction
- Run `dotnet build` before considering the task done

## Frontend Rules

- Functional components with named exports only — no default exports, no class components
- Tailwind utility classes for styling — no inline styles, no CSS modules
- `lucide-react` for icons
- No `any` types
- Mirror any backend model change in `src/web/src/types/index.ts` immediately

## Shared Type Contract

`src/web/src/types/index.ts` mirrors the C# models by hand — there is no codegen.
If a backend model changes, update the frontend types in the same PR.

## Running the Stack

```bash
# API
dotnet run --project src/InterviewAssistant.Api
# → http://localhost:5001 (Swagger UI in dev)

# Web
cd src/web && npm run dev
# → http://localhost:5173
```

## Spec-Driven Development (SDD)

This repo uses a plan-first workflow enforced by the Superpowers plugin for Claude Code.

**Before implementing any feature, check for an existing plan:**

```bash
ls docs/superpowers/plans/
```

If a matching plan file exists (e.g. `docs/superpowers/plans/2026-06-12-app-shell-sidebar.md`):
- Read it fully before writing any code
- Follow the exact file list (Create / Modify / Delete sections)
- Respect every architecture decision recorded in the plan
- Do NOT deviate from the plan's structure, even if you think of a better approach

If no plan exists for the task you were given, **stop and tell the user** — a spec and plan
should be created by Claude Code (via superpowers) before you start. Codex does not create
specs or plans; that is Claude Code's role.

### Step tagging

Plan steps may be tagged to signal which executor should handle them:

- `[Codex]` — run via the `codex-executor` subagent (mechanical, boilerplate)
- `[Claude Code]` — implement directly via `backend-dotnet` or `frontend-react` subagent

If a step has no tag, the `execute-plan` command classifies it automatically. As Codex, you
only execute steps explicitly routed to you by the orchestrator — never self-assign steps.

The `- [ ]` checkbox tracking in plan files is handled by the superpowers plugin during
Claude Code sessions. You do not need to tick them — but you must still follow each step.

## What NOT to Do

- Do not run `git commit` — commits are manual, gated by the human
- Do not modify `.claude/` files
- Do not add secrets or API keys to any tracked file
- Do not change CORS policy in `Program.cs`
- Do not touch `appsettings.Development.json` (git-ignored, local only)
