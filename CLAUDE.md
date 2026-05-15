# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# AI Smart Fitter

AI Smart Fitter -- AI-powered answers for Gate Keepers (GK) to help them when conducting tecnical fit interviews.
The ideal is to evaluate the following seniorities: Trainee, Trainee advance, Junior, Junior Advance, Semi Senior, Semi Senior Adv, Senior, Software Designer, Architect.
Based on the target seniority proposed the correct interview questions.

## Commands

```bash
# Run the API (from repo root or the project dir)
dotnet run --project src/InterviewAssistant.Api

# Build only
dotnet build

# Restore packages
dotnet restore
```

Swagger UI is served at `http://localhost:5001` when running in Development mode (the default for `dotnet run`).

## Testing

Backend tests use **xUnit**. Frontend tests use **Vitest** + happy-dom + Testing Library.

```bash
# Run all unit tests (no Azure credentials needed)
dotnet test tests/InterviewAssistant.Api.Tests/

# Run unit tests with coverage report
dotnet test tests/InterviewAssistant.Api.Tests/ \
  --collect:"XPlat Code Coverage" \
  --results-directory ./coverage

# Run integration tests (requires appsettings.Development.json with real Azure config)
dotnet test tests/InterviewAssistant.Api.IntegrationTests/ \
  --filter "Category=Integration" \
  --logger "console;verbosity=normal"
```

Integration tests are excluded from CI — they live in a separate project and require live Azure OpenAI credentials.

## Configuration

Credentials live in `src/InterviewAssistant.Api/appsettings.Development.json` (git-ignored). Required keys:

```json
{
  "AzureOpenAI": {
    "Endpoint": "https://<your-resource>.openai.azure.com/",
    "Deployment": "gpt-4o-mini",
    "ApiKey": "<optional — omit to use Azure CLI auth>"
  }
}
```

`AgentFactory.CreateAzureOpenAIAgent` throws `InvalidOperationException` at startup if `Endpoint` or `Deployment` are missing. `ApiKey` is optional — omitting it falls back to `AzureCliCredential`.

**CORS** is configured as fully open (`AllowAnyOrigin/Method/Header`) in `Program.cs` — this is intentional for local development so the React dev server can reach the API without a proxy. Tighten it per-environment via `appsettings` before any real deployment.

## Architecture

The API wraps the [Microsoft Agent Framework](https://github.com/microsoft/agents) to expose a 4-step interview workflow over HTTP.

### Request flow

```
HTTP POST → InterviewController → InterviewService → AgentFactory / JsonAgentRunner / InterviewWorkflowRunner → Azure OpenAI
```

### Key design decisions

**`InterviewService` is a singleton.** The four `AIAgent` instances (`_ingestionAgent`, `_seniorityAgent`, `_plannerAgent`, `_evaluatorAgent`) are constructed once at startup because they are thread-safe and expensive to build. Each agent is created via `AgentFactory.CreateAzureOpenAIAgent` with a system-prompt from `AgentPrompts`.

**Two plan-generation modes.** `POST /api/interview/plan` supports `mode=simple` (default) and `mode=workflow`. Simple mode calls the planner agent directly with pre-computed profile+seniority. Workflow mode runs a `WorkflowBuilder` sequential graph (`ingestion → seniority → planner`) via `InterviewWorkflowRunner`, then re-formats the planner's raw output into clean JSON.

**All agent responses are JSON.** `JsonAgentRunner.RunJsonAsync<T>` calls `agent.RunAsync`, strips markdown fences if present, and deserializes into the target model. A parse failure throws `InvalidOperationException` with the raw agent output included.

**Agents are prompted to return raw JSON** (no markdown wrappers). The schemas that agents must conform to are embedded as string constants in `AgentPrompts`.

### Data flow (4-step interview workflow)

1. `analyze` — resume text → `ResumeProfile` (ingestion agent) → `SeniorityAssessment` (seniority agent)
2. `plan` — profile + seniority + role → `InterviewPlan` (planner agent)
3. `plan/revise` — plan + feedback string → revised `InterviewPlan` (planner agent)
4. `evaluate` — profile + plan + notes → `EvaluationResult` (evaluator agent)

## Web UI Commands

```bash
# Run the React dev server (from repo root)
cd src/web && npm run dev

# Install web dependencies
cd src/web && npm install

# Run web unit tests (single run)
cd src/web && npm test

# Run web unit tests in watch mode
cd src/web && npm run test:watch

# Build for production
cd src/web && npm run build
```

The React app runs at `http://localhost:5173` in dev mode.
Both the API (`dotnet run`) and the web server (`npm run dev`) must be running for end-to-end testing.

Before running the dev server, copy `src/web/.env.example` to `src/web/.env`. The only variable is `VITE_API_URL` — it points the React app at the API (`http://localhost:5001` by default). Without it the app falls back to the same hardcoded default, but the file should still exist.

## Frontend Architecture

The React app is a 5-step wizard built with React 18 + Vite + TypeScript + Tailwind CSS. UI primitives come from shadcn/ui (`src/web/src/components/ui/`).

### Page flow

```
HomeScreen → AnalyzeStep → PlanStep → SessionStep → EvaluationStep
```

Each step corresponds to one API call and advances the wizard on success.

### State management

Global session state lives in `SessionContext` (Context API) backed by a `sessionReducer`. The context exposes `{ state, dispatch, repository }`. Session data is persisted to `localStorage` via `LocalStorageSessionRepository` so a page refresh doesn't lose progress.

### API client

`src/web/src/api/interviewApi.ts` wraps all four endpoints. It throws `ApiError` (status + body) on non-2xx responses, which the step components catch and surface via `ErrorBanner`.

### Shared types contract

`src/web/src/types/index.ts` mirrors the backend C# models (`ResumeProfile`, `SeniorityAssessment`, `InterviewPlan`, `EvaluationResult`, etc.). **If a backend model changes, the frontend types must be updated to match.** There is no code-generation step — this is a manual contract.

## Working with Claude

- Before significant changes, ask Claude to generate a plan first.
- Always create a feature branch; never commit directly to `main`.
- Run `dotnet build` to verify API changes before committing.
- Azure CLI must be installed and logged in if no `ApiKey` is set.
