# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run the API (from repo root or the project dir)
dotnet run --project src/InterviewAssistant.Api

# Build only
dotnet build

# Restore packages
dotnet restore
```

Swagger UI is served at `http://localhost:5000` when running in Development mode (the default for `dotnet run`).

## Testing

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
