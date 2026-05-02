# Add Tests — Design Spec

**Date:** 2026-05-02
**Project:** maf-interview-assistant-api

## Overview

Add a two-project test suite. Unit tests run in CI without Azure credentials. Integration tests run locally against real Azure OpenAI.

---

## Refactoring Required in Production Code

### 1. Extract `IInterviewService`

- New file: `src/InterviewAssistant.Api/Services/IInterviewService.cs`
- Declares the 5 public methods that `InterviewService` already implements:
  - `AnalyzeResumeAsync(string resumeText, string role, CancellationToken ct)`
  - `GeneratePlanAsync(ResumeProfile profile, SeniorityAssessment seniority, string role, CancellationToken ct)`
  - `GeneratePlanWorkflowAsync(string resumeText, string role, CancellationToken ct)`
  - `RevisePlanAsync(InterviewPlan plan, string feedback, CancellationToken ct)`
  - `EvaluateAsync(ResumeProfile profile, InterviewPlan plan, string notes, CancellationToken ct)`
- `InterviewController` depends on `IInterviewService` (not the concrete class)
- DI registration changes from `AddSingleton<InterviewService>()` to `AddSingleton<IInterviewService, InterviewService>()`

### 2. Extract `IAgentRunner`

- New file: `src/InterviewAssistant.Api/Agents/IAgentRunner.cs`
- Single method: `Task<(T Value, string Raw)> RunJsonAsync<T>(AIAgent agent, string prompt, CancellationToken ct = default)`
- `JsonAgentRunner` changes from a static class to a concrete class implementing `IAgentRunner`
- `InterviewService` receives `IAgentRunner` via constructor injection (in addition to `IConfiguration`)
- DI registration: `AddSingleton<IAgentRunner, JsonAgentRunner>()`

**Why this works for unit tests:** `InterviewService` still constructs `AIAgent` instances in its constructor using fake config values (`https://fake.openai.azure.com/`, `fake-deployment`, `fake-key`). The Azure SDK client is lazy — no HTTP call occurs at construction time. In tests, `IAgentRunner` is mocked, so `agent.RunAsync()` is never actually called.

---

## Project Structure

```
tests/
  InterviewAssistant.Api.Tests/               ← unit tests (CI)
  InterviewAssistant.Api.IntegrationTests/    ← integration tests (local only)
```

Both projects are added to `InterviewAssistant.Api.sln` and reference the main API project.

---

## Project 1: `InterviewAssistant.Api.Tests` (Unit Tests)

**Framework:** net9.0
**Packages:** `xunit`, `xunit.runner.visualstudio`, `Moq`, `coverlet.collector`, `Microsoft.NET.Test.Sdk`

### `InterviewControllerTests`

Mocks `IInterviewService`. Tests the controller's HTTP layer in isolation.

| Test | Verifies |
|---|---|
| `Analyze_Returns200_WithProfileAndSeniority` | 200 + `AnalyzeResumeResponse` shape |
| `GeneratePlan_WorkflowMode_WithoutResumeText_Returns400` | Guard clause: `mode=workflow` without `ResumeText` |
| `GeneratePlan_SimpleMode_Returns200` | Happy path for simple mode |
| `RevisePlan_Returns200_WithRevisedPlan` | Returns revised `InterviewPlan` |
| `Evaluate_Returns200_WithEvaluationResult` | Returns `EvaluationResult` |

### `InterviewServiceTests`

Uses fake Azure config + mocked `IAgentRunner`. Tests orchestration and prompt construction.

| Test | Verifies |
|---|---|
| `AnalyzeResumeAsync_CallsIngestionThenSeniority_InOrder` | Runner called twice; ingestion first, seniority second |
| `GeneratePlanAsync_IncludesRoleProfileSeniorityInPrompt` | Prompt contains role, serialized profile, serialized seniority |
| `RevisePlanAsync_IncludesFeedbackInPrompt` | Feedback string appears in the prompt passed to runner |
| `EvaluateAsync_EmptyNotes_UsesPlaceholder` | Empty/whitespace notes replaced with the defined placeholder string |

### `JsonAgentRunnerTests`

Tests the JSON parsing and deserialization logic. Approach for creating an `AIAgent` test double (mockability of `AIAgent.RunAsync` from `Microsoft.Agents.AI`) is determined during implementation — if the class is sealed/non-virtual, the parsing logic is extracted to an internal helper and tested directly.

| Test | Verifies |
|---|---|
| `RunJsonAsync_ValidJson_ReturnsDeserializedValue` | Happy path: clean JSON returns correct typed object |
| `RunJsonAsync_InvalidJson_ThrowsInvalidOperationException` | Non-JSON response → `InvalidOperationException` with raw output |
| `RunJsonAsync_JsonWithTrailingComma_Succeeds` | Parser tolerates trailing commas (current `JsonSerializerOptions`) |

---

## Project 2: `InterviewAssistant.Api.IntegrationTests` (Integration Tests)

**Framework:** net9.0
**Packages:** `xunit`, `xunit.runner.visualstudio`, `Microsoft.AspNetCore.Mvc.Testing`, `Microsoft.NET.Test.Sdk`

### `InterviewApiIntegrationTests`

Uses `WebApplicationFactory<Program>`. Azure config loaded from environment variables (or `appsettings.Development.json` for local runs). All tests marked `[Trait("Category", "Integration")]`.

One smoke test per endpoint verifying the full stack:
- `POST /api/interview/analyze` — real resume text → 200
- `POST /api/interview/plan` (simple mode) — real profile + seniority → 200
- `POST /api/interview/plan` (workflow mode) — real resume text → 200
- `POST /api/interview/plan/revise` — real plan + feedback → 200
- `POST /api/interview/evaluate` — real profile + plan + notes → 200

---

## CI/CD

Only the unit test project runs in CI:

```bash
dotnet test tests/InterviewAssistant.Api.Tests/
```

Integration tests are excluded — they are in a separate project not referenced by the CI workflow. No filter trait logic needed; separation is structural.

---

## Additional Production Code Change for Integration Tests

`WebApplicationFactory<Program>` requires the `Program` class to be visible from the test project. With top-level statements (used in this project), `Program` is `internal` by default. Add this at the end of `Program.cs`:

```csharp
public partial class Program { }
```

---

## Setup Commands (for implementation)

```bash
# Create test projects
dotnet new xunit -n InterviewAssistant.Api.Tests -o tests/InterviewAssistant.Api.Tests --framework net9.0
dotnet new xunit -n InterviewAssistant.Api.IntegrationTests -o tests/InterviewAssistant.Api.IntegrationTests --framework net9.0

# Add to solution
dotnet sln add tests/InterviewAssistant.Api.Tests/InterviewAssistant.Api.Tests.csproj
dotnet sln add tests/InterviewAssistant.Api.IntegrationTests/InterviewAssistant.Api.IntegrationTests.csproj

# Add project reference to both test projects
dotnet add tests/InterviewAssistant.Api.Tests/ reference src/InterviewAssistant.Api/InterviewAssistant.Api.csproj
dotnet add tests/InterviewAssistant.Api.IntegrationTests/ reference src/InterviewAssistant.Api/InterviewAssistant.Api.csproj

# Add packages to unit test project
dotnet add tests/InterviewAssistant.Api.Tests/ package Moq
dotnet add tests/InterviewAssistant.Api.Tests/ package coverlet.collector

# Add packages to integration test project
dotnet add tests/InterviewAssistant.Api.IntegrationTests/ package Microsoft.AspNetCore.Mvc.Testing
```
