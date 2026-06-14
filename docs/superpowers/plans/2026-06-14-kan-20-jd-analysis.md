# KAN-20 — AI JD Analysis Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `POST /api/job-descriptions/{id}/analyze` endpoint backed by an LLM agent, persist the result, and display it in a new step-2 panel in the JD Match wizard.

**Architecture:** A new singleton `JdAnalysisService` follows the exact same pattern as `InterviewService` — one `AIAgent` created at startup via `AgentFactory`, calls made through the shared `IAgentRunner`. The frontend wires the existing "Analyze JD →" button to call the new endpoint and auto-advances to a `JdAnalysisPanel` when the response comes back.

**Tech Stack:** .NET 9 / ASP.NET Core, Microsoft Agents Framework (`AIAgent`, `IAgentRunner`), xUnit + Moq (backend tests), React 18 + TypeScript + Tailwind CSS, Vitest + Testing Library (frontend tests).

---

## File Map

### New (backend)
- `src/InterviewAssistant.Api/Models/JdAnalysisResult.cs`
- `src/InterviewAssistant.Api/Services/IJdAnalysisService.cs`
- `src/InterviewAssistant.Api/Services/JdAnalysisService.cs`
- `tests/InterviewAssistant.Api.Tests/JdAnalysisServiceTests.cs`

### Modified (backend)
- `src/InterviewAssistant.Api/Agents/AgentPrompts.cs` — add `JdAnalysis` constant
- `src/InterviewAssistant.Api/Services/IJobDescriptionStore.cs` — add `SaveAnalysisAsync`
- `src/InterviewAssistant.Api/Services/FileSystemJobDescriptionStore.cs` — implement `SaveAnalysisAsync`
- `src/InterviewAssistant.Api/Controllers/JobDescriptionController.cs` — inject `IJdAnalysisService`, add `Analyze` endpoint
- `src/InterviewAssistant.Api/Program.cs` — register `IJdAnalysisService`
- `tests/InterviewAssistant.Api.Tests/JobDescriptionControllerTests.cs` — update `CreateController()`, add 3 tests
- `tests/InterviewAssistant.Api.Tests/FileSystemJobDescriptionStoreTests.cs` — add `SaveAnalysisAsync` test

### New (frontend)
- `src/web/src/components/ui/MatchScoreRing.tsx`
- `src/web/src/components/JdAnalysisPanel.tsx`
- `src/web/src/components/JdAnalysisPanel.test.tsx`

### Modified (frontend)
- `src/web/src/types/index.ts` — add `JdAnalysisResult`
- `src/web/src/api/jobDescriptionApi.ts` — add `analyzeJobDescription`
- `src/web/src/store/jdMatchReducer.ts` — add `SET_ANALYSIS` action + `analysisResult` field
- `src/web/src/components/JdUploadStep.tsx` — wire analyze button
- `src/web/src/components/JdUploadStep.test.tsx` — update disabled-button test, add 3 analyze tests
- `src/web/src/pages/JdMatchFlow.tsx` — render step 2

---

## Task 1: JdAnalysisResult model

**Files:**
- Create: `src/InterviewAssistant.Api/Models/JdAnalysisResult.cs`

- [ ] **Step 1.1: Create the model file**

```csharp
// src/InterviewAssistant.Api/Models/JdAnalysisResult.cs
using System.Text.Json.Serialization;

namespace InterviewAssistant.Api.Models;

public sealed class JdAnalysisResult
{
    [JsonPropertyName("score")]      public int Score { get; set; }
    [JsonPropertyName("seniority")]  public string Seniority { get; set; } = "";
    [JsonPropertyName("mustHave")]   public string[] MustHave { get; set; } = [];
    [JsonPropertyName("niceToHave")] public string[] NiceToHave { get; set; } = [];
    [JsonPropertyName("summary")]    public string Summary { get; set; } = "";
    [JsonPropertyName("confidence")] public float Confidence { get; set; }
}
```

- [ ] **Step 1.2: Verify build passes**

```bash
dotnet build
```

Expected: `Build succeeded.`

- [ ] **Step 1.3: Commit**

```bash
git add src/InterviewAssistant.Api/Models/JdAnalysisResult.cs
git commit -m "feat(KAN-20): add JdAnalysisResult model"
```

---

## Task 2: JdAnalysis agent prompt

**Files:**
- Modify: `src/InterviewAssistant.Api/Agents/AgentPrompts.cs`

- [ ] **Step 2.1: Add the `JdAnalysis` constant to `AgentPrompts.cs`**

Add the following constant inside the `AgentPrompts` class, after the `Evaluator` constant (line 101, before the closing `}`):

```csharp
    public const string JdAnalysis = @"
You are a Job Description analysis agent.

Input:
- Extracted plain text from a Job Description PDF.

Output:
- Raw JSON only. No markdown fences. Match this schema exactly:
{
  ""score"": number,
  ""seniority"": string,
  ""mustHave"": string[],
  ""niceToHave"": string[],
  ""summary"": string,
  ""confidence"": number
}

Rules:
- score: integer 0–100 measuring JD quality (clarity, completeness, measurable requirements).
- seniority: one of ""Trainee"", ""Junior"", ""Semi Senior"", ""Senior"", ""Architect"" — pick the closest match.
- mustHave: required technologies and skills as plain name strings (e.g. ""C#"", "".NET 8"", ""Azure"").
- niceToHave: preferred/optional technologies as plain name strings.
- summary: 2–3 sentences describing the role and what it emphasizes.
- confidence: float 0.0–1.0 expressing how clearly the JD stated its requirements.
- No markdown. Return raw JSON only.
";
```

- [ ] **Step 2.2: Verify build passes**

```bash
dotnet build
```

Expected: `Build succeeded.`

- [ ] **Step 2.3: Commit**

```bash
git add src/InterviewAssistant.Api/Agents/AgentPrompts.cs
git commit -m "feat(KAN-20): add JdAnalysis agent prompt"
```

---

## Task 3: Extend the job description store

**Files:**
- Modify: `src/InterviewAssistant.Api/Services/IJobDescriptionStore.cs`
- Modify: `src/InterviewAssistant.Api/Services/FileSystemJobDescriptionStore.cs`
- Modify: `tests/InterviewAssistant.Api.Tests/FileSystemJobDescriptionStoreTests.cs`

- [ ] **Step 3.1: Write the failing test**

Add this test method to `FileSystemJobDescriptionStoreTests.cs`, inside the `FileSystemJobDescriptionStoreTests` class, after `GetAsync_UnknownId_ReturnsNull`:

```csharp
[Fact]
public async Task SaveAnalysisAsync_WritesAnalysisJsonToCorrectPath()
{
    var store = CreateStore();
    var jd = SampleJd();
    await store.SaveAsync(jd, new byte[] { 1 }, CancellationToken.None);

    var result = new JdAnalysisResult
    {
        Score = 85,
        Seniority = "Senior",
        MustHave = ["C#", ".NET"],
        NiceToHave = ["Docker"],
        Summary = "A .NET backend role.",
        Confidence = 0.9f
    };

    await store.SaveAnalysisAsync(jd.Id, result, CancellationToken.None);

    var path = Path.Combine(_tempDir, jd.Id, "analysis.json");
    Assert.True(File.Exists(path));
    var json = await File.ReadAllTextAsync(path);
    Assert.Contains("\"score\":85", json);
    Assert.Contains("\"seniority\":\"Senior\"", json);
}
```

Also add this using at the top of the file (it already has `using InterviewAssistant.Api.Models;` — verify it's there):

```csharp
using InterviewAssistant.Api.Models;
```

- [ ] **Step 3.2: Run the test — verify it fails to compile**

```bash
dotnet test tests/InterviewAssistant.Api.Tests/ --filter "SaveAnalysisAsync"
```

Expected: compile error — `IJobDescriptionStore` does not contain a definition for `SaveAnalysisAsync`.

- [ ] **Step 3.3: Add `SaveAnalysisAsync` to the interface**

Replace the entire content of `src/InterviewAssistant.Api/Services/IJobDescriptionStore.cs` with:

```csharp
using InterviewAssistant.Api.Models;

namespace InterviewAssistant.Api.Services;

/// <summary>Persists uploaded Job Descriptions (PDF, extracted text, metadata).</summary>
public interface IJobDescriptionStore
{
    Task SaveAsync(JobDescription jobDescription, byte[] pdfBytes, CancellationToken ct);
    Task<JobDescription?> GetAsync(string id, CancellationToken ct);
    Task SaveAnalysisAsync(string id, JdAnalysisResult result, CancellationToken ct);
}
```

- [ ] **Step 3.4: Implement `SaveAnalysisAsync` in `FileSystemJobDescriptionStore.cs`**

Add the following method to `FileSystemJobDescriptionStore`, after the `GetAsync` method (before the closing `}`):

```csharp
    public async Task SaveAnalysisAsync(string id, JdAnalysisResult result, CancellationToken ct)
    {
        var path = Path.Combine(_root, id, "analysis.json");
        var json = JsonSerializer.Serialize(result, JsonOptions);
        await File.WriteAllTextAsync(path, json, ct);
    }
```

- [ ] **Step 3.5: Run the test — verify it passes**

```bash
dotnet test tests/InterviewAssistant.Api.Tests/ --filter "SaveAnalysisAsync"
```

Expected: `Passed!  - Failed: 0, Passed: 1`

- [ ] **Step 3.6: Run all tests — verify nothing is broken**

```bash
dotnet test tests/InterviewAssistant.Api.Tests/
```

Expected: all tests pass (no failures, no skipped).

- [ ] **Step 3.7: Commit**

```bash
git add src/InterviewAssistant.Api/Services/IJobDescriptionStore.cs \
        src/InterviewAssistant.Api/Services/FileSystemJobDescriptionStore.cs \
        tests/InterviewAssistant.Api.Tests/FileSystemJobDescriptionStoreTests.cs
git commit -m "feat(KAN-20): extend IJobDescriptionStore with SaveAnalysisAsync"
```

---

## Task 4: JdAnalysisService

**Files:**
- Create: `src/InterviewAssistant.Api/Services/IJdAnalysisService.cs`
- Create: `src/InterviewAssistant.Api/Services/JdAnalysisService.cs`
- Create: `tests/InterviewAssistant.Api.Tests/JdAnalysisServiceTests.cs`

- [ ] **Step 4.1: Write the failing tests**

Create `tests/InterviewAssistant.Api.Tests/JdAnalysisServiceTests.cs`:

```csharp
using InterviewAssistant.Api.Agents;
using InterviewAssistant.Api.Models;
using InterviewAssistant.Api.Services;
using Microsoft.Agents.AI;
using Microsoft.Extensions.Configuration;
using Moq;

namespace InterviewAssistant.Api.Tests;

public class JdAnalysisServiceTests
{
    private readonly Mock<IAgentRunner> _runner;
    private readonly IJdAnalysisService _service;

    public JdAnalysisServiceTests()
    {
        _runner = new Mock<IAgentRunner>();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AzureOpenAI:Endpoint"]   = "https://fake.openai.azure.com/",
                ["AzureOpenAI:Deployment"] = "fake-deployment",
                ["AzureOpenAI:ApiKey"]     = "fake-key"
            })
            .Build();

        _service = new JdAnalysisService(config, _runner.Object);
    }

    [Fact]
    public async Task AnalyzeAsync_ReturnsDeserializedResult()
    {
        var expected = new JdAnalysisResult
        {
            Score = 85,
            Seniority = "Senior",
            MustHave = ["C#", ".NET"],
            NiceToHave = ["Docker"],
            Summary = "Backend role.",
            Confidence = 0.9f
        };

        _runner.Setup(r => r.RunJsonAsync<JdAnalysisResult>(
                It.IsAny<AIAgent>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync((expected, "{}"));

        var result = await _service.AnalyzeAsync("Senior .NET Engineer wanted.");

        Assert.Equal(85, result.Score);
        Assert.Equal("Senior", result.Seniority);
        Assert.Equal(new[] { "C#", ".NET" }, result.MustHave);
    }

    [Fact]
    public async Task AnalyzeAsync_PassesExtractedTextAsPrompt()
    {
        string capturedPrompt = "";

        _runner.Setup(r => r.RunJsonAsync<JdAnalysisResult>(
                It.IsAny<AIAgent>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .Callback<AIAgent, string, CancellationToken>((_, prompt, _) => capturedPrompt = prompt)
               .ReturnsAsync((new JdAnalysisResult { Score = 70 }, "{}"));

        await _service.AnalyzeAsync("Looking for a senior .NET engineer.");

        Assert.Contains("Looking for a senior .NET engineer.", capturedPrompt);
    }

    [Fact]
    public async Task AnalyzeAsync_WhenRunnerThrows_PropagatesException()
    {
        _runner.Setup(r => r.RunJsonAsync<JdAnalysisResult>(
                It.IsAny<AIAgent>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .ThrowsAsync(new InvalidOperationException("Agent returned non-JSON"));

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.AnalyzeAsync("Some JD text."));
    }
}
```

- [ ] **Step 4.2: Run the tests — verify they fail to compile**

```bash
dotnet test tests/InterviewAssistant.Api.Tests/ --filter "JdAnalysisService"
```

Expected: compile error — `IJdAnalysisService` and `JdAnalysisService` not found.

- [ ] **Step 4.3: Create the interface**

Create `src/InterviewAssistant.Api/Services/IJdAnalysisService.cs`:

```csharp
using InterviewAssistant.Api.Models;

namespace InterviewAssistant.Api.Services;

public interface IJdAnalysisService
{
    Task<JdAnalysisResult> AnalyzeAsync(string extractedText, CancellationToken ct = default);
}
```

- [ ] **Step 4.4: Create the service**

Create `src/InterviewAssistant.Api/Services/JdAnalysisService.cs`:

```csharp
using InterviewAssistant.Api.Agents;
using InterviewAssistant.Api.Models;
using Microsoft.Agents.AI;

namespace InterviewAssistant.Api.Services;

public sealed class JdAnalysisService : IJdAnalysisService
{
    private readonly AIAgent _analysisAgent;
    private readonly IAgentRunner _runner;

    public JdAnalysisService(IConfiguration config, IAgentRunner runner)
    {
        _runner = runner;
        _analysisAgent = AgentFactory.CreateAzureOpenAIAgent(
            "JdAnalysis", AgentPrompts.JdAnalysis, config);
    }

    public async Task<JdAnalysisResult> AnalyzeAsync(string extractedText, CancellationToken ct = default)
    {
        var (result, _) = await _runner.RunJsonAsync<JdAnalysisResult>(_analysisAgent, extractedText, ct);
        return result;
    }
}
```

- [ ] **Step 4.5: Run the tests — verify they pass**

```bash
dotnet test tests/InterviewAssistant.Api.Tests/ --filter "JdAnalysisService"
```

Expected: `Passed!  - Failed: 0, Passed: 3`

- [ ] **Step 4.6: Run all tests — verify nothing broken**

```bash
dotnet test tests/InterviewAssistant.Api.Tests/
```

Expected: all tests pass.

- [ ] **Step 4.7: Commit**

```bash
git add src/InterviewAssistant.Api/Services/IJdAnalysisService.cs \
        src/InterviewAssistant.Api/Services/JdAnalysisService.cs \
        tests/InterviewAssistant.Api.Tests/JdAnalysisServiceTests.cs
git commit -m "feat(KAN-20): add JdAnalysisService with agent prompt integration"
```

---

## Task 5: Analyze endpoint + DI registration

**Files:**
- Modify: `src/InterviewAssistant.Api/Controllers/JobDescriptionController.cs`
- Modify: `src/InterviewAssistant.Api/Program.cs`
- Modify: `tests/InterviewAssistant.Api.Tests/JobDescriptionControllerTests.cs`

- [ ] **Step 5.1: Write the failing controller tests**

In `tests/InterviewAssistant.Api.Tests/JobDescriptionControllerTests.cs`:

1. Add a new field for the analysis service mock (alongside the existing `_parser` and `_store` fields):

```csharp
private readonly Mock<IJdAnalysisService> _analysisService = new();
```

2. Update `CreateController()` to inject it:

```csharp
private JobDescriptionController CreateController() => new(
    _parser.Object,
    _store.Object,
    _analysisService.Object,
    Mock.Of<ILogger<JobDescriptionController>>());
```

3. Add three new test methods at the end of the class:

```csharp
[Fact]
public async Task Analyze_ValidIdAndJdFound_Returns200WithResult()
{
    var id = Guid.NewGuid().ToString();
    var jd = new JobDescription { Id = id, ExtractedText = "Senior .NET Engineer" };
    var analysis = new JdAnalysisResult { Score = 85, Seniority = "Senior" };
    _store.Setup(s => s.GetAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(jd);
    _analysisService
        .Setup(a => a.AnalyzeAsync("Senior .NET Engineer", It.IsAny<CancellationToken>()))
        .ReturnsAsync(analysis);

    var result = await CreateController().Analyze(id, CancellationToken.None);

    var ok = Assert.IsType<OkObjectResult>(result);
    var response = Assert.IsType<JdAnalysisResult>(ok.Value);
    Assert.Equal(85, response.Score);
    Assert.Equal("Senior", response.Seniority);
    _store.Verify(
        s => s.SaveAnalysisAsync(id, analysis, It.IsAny<CancellationToken>()),
        Times.Once);
}

[Fact]
public async Task Analyze_NonGuidId_Returns404WithoutHittingStore()
{
    var result = await CreateController().Analyze("not-a-guid", CancellationToken.None);

    Assert.IsType<NotFoundObjectResult>(result);
    _store.Verify(s => s.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
}

[Fact]
public async Task Analyze_JdNotFound_Returns404WithoutCallingService()
{
    _store.Setup(s => s.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
          .ReturnsAsync((JobDescription?)null);

    var result = await CreateController().Analyze(Guid.NewGuid().ToString(), CancellationToken.None);

    Assert.IsType<NotFoundObjectResult>(result);
    _analysisService.Verify(
        a => a.AnalyzeAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
        Times.Never);
}
```

Also add the missing `using` for `IJdAnalysisService` at the top (it's already in the namespace; just make sure `IJdAnalysisService` is accessible — no extra using needed since they share the project namespace):

```csharp
// Existing usings are fine; no new ones needed.
```

- [ ] **Step 5.2: Run the tests — verify they fail**

```bash
dotnet test tests/InterviewAssistant.Api.Tests/ --filter "Analyze"
```

Expected: compile error — `JobDescriptionController` constructor doesn't accept 4 args yet, and `Analyze` method not found.

- [ ] **Step 5.3: Update the controller constructor and add the `Analyze` endpoint**

Replace the private fields and constructor in `JobDescriptionController.cs` (lines 13–26) with:

```csharp
    private readonly IJdParsingService _parser;
    private readonly IJobDescriptionStore _store;
    private readonly IJdAnalysisService _analysisService;
    private readonly ILogger<JobDescriptionController> _logger;

    public JobDescriptionController(
        IJdParsingService parser,
        IJobDescriptionStore store,
        IJdAnalysisService analysisService,
        ILogger<JobDescriptionController> logger)
    {
        _parser = parser;
        _store = store;
        _analysisService = analysisService;
        _logger = logger;
    }
```

Add the following endpoint method after the `GetById` method (before the `// ─── Helpers` comment):

```csharp
    // ─── POST /api/job-descriptions/{id}/analyze ─────────────────────────────

    [HttpPost("{id}/analyze")]
    [ProducesResponseType(typeof(JdAnalysisResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Analyze(string id, CancellationToken ct)
    {
        if (!Guid.TryParse(id, out _))
            return NotFound(NotFoundProblem(id));

        var jobDescription = await _store.GetAsync(id, ct);
        if (jobDescription is null)
            return NotFound(NotFoundProblem(id));

        var result = await _analysisService.AnalyzeAsync(jobDescription.ExtractedText, ct);
        await _store.SaveAnalysisAsync(id, result, ct);
        return Ok(result);
    }
```

Also add the using at the top of the controller file (the namespace is already imported via global usings, but verify `JdAnalysisResult` is accessible — it lives in `InterviewAssistant.Api.Models` which is already imported).

- [ ] **Step 5.4: Register `IJdAnalysisService` in `Program.cs`**

In `src/InterviewAssistant.Api/Program.cs`, add after the `IJobDescriptionStore` registration (line 13):

```csharp
builder.Services.AddSingleton<IJdAnalysisService, JdAnalysisService>();
```

- [ ] **Step 5.5: Run the new tests — verify they pass**

```bash
dotnet test tests/InterviewAssistant.Api.Tests/ --filter "Analyze"
```

Expected: `Passed!  - Failed: 0, Passed: 3`

- [ ] **Step 5.6: Run all tests — verify nothing broken**

```bash
dotnet test tests/InterviewAssistant.Api.Tests/
```

Expected: all tests pass.

- [ ] **Step 5.7: Commit**

```bash
git add src/InterviewAssistant.Api/Controllers/JobDescriptionController.cs \
        src/InterviewAssistant.Api/Program.cs \
        tests/InterviewAssistant.Api.Tests/JobDescriptionControllerTests.cs
git commit -m "feat(KAN-20): add POST /api/job-descriptions/{id}/analyze endpoint"
```

---

## Task 6: Frontend types + API client

**Files:**
- Modify: `src/web/src/types/index.ts`
- Modify: `src/web/src/api/jobDescriptionApi.ts`

- [ ] **Step 6.1: Add `JdAnalysisResult` to `types/index.ts`**

Append the following at the end of `src/web/src/types/index.ts`:

```typescript
export interface JdAnalysisResult {
  score: number
  seniority: string
  mustHave: string[]
  niceToHave: string[]
  summary: string
  confidence: number
}
```

- [ ] **Step 6.2: Add `analyzeJobDescription` to `jobDescriptionApi.ts`**

Replace the entire content of `src/web/src/api/jobDescriptionApi.ts` with:

```typescript
import { ApiError } from './interviewApi'
import type { JobDescriptionUpload, JdAnalysisResult } from '../types'

const baseUrl = () => (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5001'

export async function uploadJobDescription(file: File): Promise<JobDescriptionUpload> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${baseUrl()}/api/job-descriptions`, {
    method: 'POST',
    body: formData,
  })
  const text = await res.text()
  if (!res.ok) throw new ApiError(res.status, text)
  return JSON.parse(text) as JobDescriptionUpload
}

export async function analyzeJobDescription(id: string): Promise<JdAnalysisResult> {
  const res = await fetch(`${baseUrl()}/api/job-descriptions/${id}/analyze`, {
    method: 'POST',
  })
  const text = await res.text()
  if (!res.ok) throw new ApiError(res.status, text)
  return JSON.parse(text) as JdAnalysisResult
}
```

- [ ] **Step 6.3: Run frontend type-check**

```bash
cd src/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6.4: Commit**

```bash
git add src/web/src/types/index.ts src/web/src/api/jobDescriptionApi.ts
git commit -m "feat(KAN-20): add JdAnalysisResult type and analyzeJobDescription API function"
```

---

## Task 7: Reducer — `SET_ANALYSIS` action + `analysisResult` state

**Files:**
- Modify: `src/web/src/store/jdMatchReducer.ts`

- [ ] **Step 7.1: Update the reducer**

Replace the entire content of `src/web/src/store/jdMatchReducer.ts` with:

```typescript
import type { JobDescriptionUpload, JdAnalysisResult } from '../types'

export type JdMatchAction =
  | { type: 'SET_JOB_DESCRIPTION'; jobDescription: JobDescriptionUpload }
  | { type: 'SET_ANALYSIS'; analysisResult: JdAnalysisResult }
  | { type: 'RESET' }

export interface JdMatchState {
  jobDescription: JobDescriptionUpload | null
  analysisResult: JdAnalysisResult | null
  currentStep: number
}

export const initialJdMatchState: JdMatchState = {
  jobDescription: null,
  analysisResult: null,
  currentStep: 1,
}

export function jdMatchReducer(state: JdMatchState, action: JdMatchAction): JdMatchState {
  switch (action.type) {
    case 'SET_JOB_DESCRIPTION':
      return { ...state, jobDescription: action.jobDescription }

    case 'SET_ANALYSIS':
      return { ...state, analysisResult: action.analysisResult, currentStep: 2 }

    case 'RESET':
      return initialJdMatchState

    default:
      return state
  }
}
```

- [ ] **Step 7.2: Run type-check**

```bash
cd src/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7.3: Run existing frontend tests — verify they still pass**

```bash
cd src/web && npm test
```

Expected: all existing tests pass.

- [ ] **Step 7.4: Commit**

```bash
git add src/web/src/store/jdMatchReducer.ts
git commit -m "feat(KAN-20): add SET_ANALYSIS action and analysisResult state to jdMatchReducer"
```

---

## Task 8: Wire the analyze button in `JdUploadStep`

**Files:**
- Modify: `src/web/src/components/JdUploadStep.tsx`
- Modify: `src/web/src/components/JdUploadStep.test.tsx`

- [ ] **Step 8.1: Write the failing tests**

In `src/web/src/components/JdUploadStep.test.tsx`:

1. Update the existing import to include `analyzeJobDescription` in the mock (already mocked via `vi.mock('@/api/jobDescriptionApi')` — no change needed to the mock line itself).

2. Add `JdAnalysisResult` import at the top alongside the existing type imports:

```typescript
import type { JobDescriptionUpload, JdAnalysisResult } from '@/types'
```

3. Add a `mockAnalysis` constant after `mockUpload`:

```typescript
const mockAnalysis: JdAnalysisResult = {
  score: 85,
  seniority: 'Senior',
  mustHave: ['C#', '.NET'],
  niceToHave: ['Docker'],
  summary: 'Backend role.',
  confidence: 0.9,
}
```

4. Update the existing test `'uploads a valid PDF and shows the parsed card with name, size, badge, and disabled CTA'` — change its description and flip the disabled assertion:

```typescript
it('uploads a valid PDF and shows the parsed card with enabled Analyze button', async () => {
  vi.mocked(api.uploadJobDescription).mockResolvedValueOnce(mockUpload)
  renderStep()
  selectFile(new File(['%PDF-1.4'], 'senior-jd.pdf', { type: 'application/pdf' }))

  await waitFor(() => expect(screen.getByText('senior-jd.pdf')).toBeInTheDocument())
  expect(screen.getByText(/248 KB/)).toBeInTheDocument()
  expect(screen.getByText(/Parsed/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Analyze JD/ })).not.toBeDisabled()
})
```

5. Add three new tests inside the `describe('JdUploadStep')` block:

```typescript
it('shows "Analyzing JD…" and disables button while analyze is in progress', async () => {
  vi.mocked(api.uploadJobDescription).mockResolvedValueOnce(mockUpload)
  let resolveAnalyze!: (v: JdAnalysisResult) => void
  vi.mocked(api.analyzeJobDescription).mockReturnValueOnce(
    new Promise((r) => { resolveAnalyze = r }),
  )
  renderStep()
  selectFile(new File(['%PDF-1.4'], 'jd.pdf', { type: 'application/pdf' }))
  await waitFor(() => expect(screen.getByRole('button', { name: /Analyze JD/ })).toBeInTheDocument())

  fireEvent.click(screen.getByRole('button', { name: /Analyze JD/ }))

  await waitFor(() =>
    expect(screen.getByRole('button', { name: /Analyzing JD/ })).toBeDisabled(),
  )

  // resolve so the promise doesn't leak
  resolveAnalyze(mockAnalysis)
})

it('shows analyze error message when analysis fails', async () => {
  vi.mocked(api.uploadJobDescription).mockResolvedValueOnce(mockUpload)
  vi.mocked(api.analyzeJobDescription).mockRejectedValueOnce(new ApiError(500, 'boom'))
  renderStep()
  selectFile(new File(['%PDF-1.4'], 'jd.pdf', { type: 'application/pdf' }))
  await waitFor(() => expect(screen.getByRole('button', { name: /Analyze JD/ })).toBeInTheDocument())

  fireEvent.click(screen.getByRole('button', { name: /Analyze JD/ }))

  await waitFor(() =>
    expect(screen.getByText('Analysis failed. Please try again.')).toBeInTheDocument(),
  )
  expect(screen.getByRole('button', { name: /Analyze JD/ })).not.toBeDisabled()
})

it('calls analyzeJobDescription with the correct JD id', async () => {
  vi.mocked(api.uploadJobDescription).mockResolvedValueOnce(mockUpload)
  vi.mocked(api.analyzeJobDescription).mockResolvedValueOnce(mockAnalysis)
  renderStep()
  selectFile(new File(['%PDF-1.4'], 'jd.pdf', { type: 'application/pdf' }))
  await waitFor(() => expect(screen.getByRole('button', { name: /Analyze JD/ })).toBeInTheDocument())

  fireEvent.click(screen.getByRole('button', { name: /Analyze JD/ }))

  await waitFor(() =>
    expect(api.analyzeJobDescription).toHaveBeenCalledWith('abc-123'),
  )
})
```

- [ ] **Step 8.2: Run the new tests — verify they fail**

```bash
cd src/web && npx vitest run src/components/JdUploadStep.test.tsx
```

Expected: several tests fail — button is still hardcoded disabled, `analyzeJobDescription` not called.

- [ ] **Step 8.3: Update `JdUploadStep.tsx`**

Replace the entire content of `src/web/src/components/JdUploadStep.tsx` with:

```tsx
import { useRef, useState } from 'react'
import { Upload, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useJdMatch } from '@/store/JdMatchContext'
import { uploadJobDescription, analyzeJobDescription } from '@/api/jobDescriptionApi'
import { ApiError } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'

const MAX_SIZE_BYTES = 10 * 1024 * 1024

type UploadStatus = 'idle' | 'uploading' | 'error'
type AnalyzeStatus = 'idle' | 'analyzing' | 'error'

function validate(file: File): string | null {
  if (file.type !== 'application/pdf') return 'Only PDF files are supported.'
  if (file.size > MAX_SIZE_BYTES) return 'File exceeds the 10 MB limit.'
  return null
}

function mapUploadError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 413) return 'File exceeds the 10 MB limit.'
    if (err.status === 422) return "This PDF doesn't contain readable text. Try a text-based PDF."
    if (err.status === 400) {
      try {
        const pd = JSON.parse(err.body) as { detail?: unknown }
        if (typeof pd.detail === 'string' && pd.detail.includes('10 MB')) return 'File exceeds the 10 MB limit.'
      } catch {
        // ignore non-JSON bodies
      }
      return 'Please select a valid PDF file.'
    }
  }
  return 'Upload failed. Please try again.'
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function JdUploadStep() {
  const { state, dispatch } = useJdMatch()
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [analyzeStatus, setAnalyzeStatus] = useState<AnalyzeStatus>('idle')
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const jd = state.jobDescription

  async function handleFile(file: File) {
    const validationError = validate(file)
    if (validationError) {
      setStatus('error')
      setErrorMessage(validationError)
      return
    }

    setStatus('uploading')
    setErrorMessage(null)
    try {
      const result = await uploadJobDescription(file)
      dispatch({ type: 'SET_JOB_DESCRIPTION', jobDescription: result })
      setStatus('idle')
    } catch (err) {
      setStatus('error')
      setErrorMessage(mapUploadError(err))
    }
  }

  async function handleAnalyze() {
    if (!jd) return
    setAnalyzeStatus('analyzing')
    setAnalyzeError(null)
    try {
      const result = await analyzeJobDescription(jd.id)
      dispatch({ type: 'SET_ANALYSIS', analysisResult: result })
    } catch {
      setAnalyzeStatus('error')
      setAnalyzeError('Analysis failed. Please try again.')
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors',
          isDragging ? 'border-indigo-400 bg-indigo-500/5' : 'border-indigo-500/40 bg-card/50',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleInputChange}
          className="hidden"
          aria-label="Upload JD PDF"
        />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/20">
          <Upload className="text-indigo-400" size={22} />
        </div>
        <p className="font-semibold text-foreground">Drag &amp; drop your JD PDF here</p>
        <p className="mt-1 text-sm text-muted-foreground">PDF up to 10 MB — or browse to select a file</p>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={status === 'uploading'}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          Browse files
        </Button>
        {status === 'error' && errorMessage && (
          <p className="mt-3 text-sm text-red-400">{errorMessage}</p>
        )}
      </div>

      {status === 'uploading' && <LoadingSpinner label="Uploading and parsing JD..." />}

      {jd && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recently Uploaded
          </p>
          <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-indigo-500/20">
              <FileText className="text-indigo-400" size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{jd.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {formatSize(jd.sizeBytes)} · Uploaded {new Date(jd.uploadedAt).toLocaleString()}
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              ✓ Parsed
            </span>
            <Button
              onClick={() => void handleAnalyze()}
              disabled={analyzeStatus === 'analyzing'}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {analyzeStatus === 'analyzing' ? 'Analyzing JD…' : 'Analyze JD →'}
            </Button>
          </div>
          {analyzeStatus === 'error' && analyzeError && (
            <p className="text-sm text-red-400">{analyzeError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            SmartFitter will extract required skills, seniority and a JD quality score in the next step.
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 8.4: Run all frontend tests — verify they pass**

```bash
cd src/web && npm test
```

Expected: all tests pass including the new analyze button tests.

- [ ] **Step 8.5: Commit**

```bash
git add src/web/src/components/JdUploadStep.tsx \
        src/web/src/components/JdUploadStep.test.tsx
git commit -m "feat(KAN-20): wire Analyze JD button with inline loading and error handling"
```

---

## Task 9: `MatchScoreRing` SVG component

**Files:**
- Create: `src/web/src/components/ui/MatchScoreRing.tsx`

- [ ] **Step 9.1: Create the component**

Create `src/web/src/components/ui/MatchScoreRing.tsx`:

```tsx
const RADIUS = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS // ~213.63

interface MatchScoreRingProps {
  score: number // 0–100
}

export function MatchScoreRing({ score }: MatchScoreRingProps) {
  const offset = CIRCUMFERENCE * (1 - score / 100)

  return (
    <div className="relative" style={{ width: 80, height: 80 }}>
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        aria-label={`JD quality score: ${score} out of 100`}
      >
        <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="#1a2233" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={RADIUS}
          fill="none"
          stroke="#7c5cfc"
          strokeWidth="8"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold leading-none text-foreground">{score}</span>
        <span className="text-[10px] text-muted-foreground">/100</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 9.2: Run type-check**

```bash
cd src/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9.3: Commit**

```bash
git add src/web/src/components/ui/MatchScoreRing.tsx
git commit -m "feat(KAN-20): add MatchScoreRing SVG component"
```

---

## Task 10: `JdAnalysisPanel` component + tests

**Files:**
- Create: `src/web/src/components/JdAnalysisPanel.tsx`
- Create: `src/web/src/components/JdAnalysisPanel.test.tsx`

- [ ] **Step 10.1: Write the failing tests**

Create `src/web/src/components/JdAnalysisPanel.test.tsx`:

```tsx
import { beforeEach, describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JdAnalysisPanel } from './JdAnalysisPanel'
import { JdMatchProvider } from '@/store/JdMatchContext'
import type { JdAnalysisResult } from '@/types'

const STORAGE_KEY = 'jd-match:current'

function renderWithAnalysis(result: JdAnalysisResult) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ jobDescription: null, analysisResult: result, currentStep: 2 }),
  )
  return render(
    <JdMatchProvider>
      <JdAnalysisPanel />
    </JdMatchProvider>,
  )
}

const mockResult: JdAnalysisResult = {
  score: 88,
  seniority: 'Senior',
  mustHave: ['C#', '.NET', 'Azure'],
  niceToHave: ['Docker', 'Kubernetes'],
  summary: 'Seeks a senior backend engineer to own .NET microservices on Azure.',
  confidence: 0.92,
}

beforeEach(() => {
  localStorage.clear()
})

describe('JdAnalysisPanel', () => {
  it('renders the "Analysis complete" status badge', () => {
    renderWithAnalysis(mockResult)
    expect(screen.getByText(/Analysis complete/)).toBeInTheDocument()
  })

  it('renders the score ring with correct aria-label', () => {
    renderWithAnalysis(mockResult)
    expect(screen.getByLabelText('JD quality score: 88 out of 100')).toBeInTheDocument()
  })

  it('renders the seniority label', () => {
    renderWithAnalysis(mockResult)
    expect(screen.getByTestId('seniority-label')).toHaveTextContent('Senior')
  })

  it('renders the confidence percentage', () => {
    renderWithAnalysis(mockResult)
    expect(screen.getByTestId('confidence-label')).toHaveTextContent('92%')
  })

  it('renders all must-have chips', () => {
    renderWithAnalysis(mockResult)
    const container = screen.getByTestId('must-have-chips')
    expect(container.children).toHaveLength(3)
    expect(screen.getByText('C#')).toBeInTheDocument()
    expect(screen.getByText('.NET')).toBeInTheDocument()
    expect(screen.getByText('Azure')).toBeInTheDocument()
  })

  it('renders all nice-to-have chips', () => {
    renderWithAnalysis(mockResult)
    const container = screen.getByTestId('nice-to-have-chips')
    expect(container.children).toHaveLength(2)
    expect(screen.getByText('Docker')).toBeInTheDocument()
    expect(screen.getByText('Kubernetes')).toBeInTheDocument()
  })

  it('renders the JD summary text', () => {
    renderWithAnalysis(mockResult)
    expect(
      screen.getByText('Seeks a senior backend engineer to own .NET microservices on Azure.'),
    ).toBeInTheDocument()
  })

  it('renders a disabled Match Candidates button', () => {
    renderWithAnalysis(mockResult)
    expect(screen.getByRole('button', { name: /Match Candidates/ })).toBeDisabled()
  })

  it('renders nothing when analysisResult is null', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ jobDescription: null, analysisResult: null, currentStep: 1 }),
    )
    const { container } = render(
      <JdMatchProvider>
        <JdAnalysisPanel />
      </JdMatchProvider>,
    )
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 10.2: Run the tests — verify they fail**

```bash
cd src/web && npx vitest run src/components/JdAnalysisPanel.test.tsx
```

Expected: compile error — `JdAnalysisPanel` module not found.

- [ ] **Step 10.3: Create `JdAnalysisPanel.tsx`**

Create `src/web/src/components/JdAnalysisPanel.tsx`:

```tsx
import { useJdMatch } from '@/store/JdMatchContext'
import { MatchScoreRing } from '@/components/ui/MatchScoreRing'
import { Button } from '@/components/ui/button'

export function JdAnalysisPanel() {
  const { state } = useJdMatch()
  const result = state.analysisResult
  if (!result) return null

  const totalSkills = result.mustHave.length + result.niceToHave.length

  return (
    <div className="space-y-6">
      {/* Status badge */}
      <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400">
        ✓ Analysis complete
      </span>

      {/* 3 metric cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Score ring card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            JD Quality Score
          </p>
          <div className="flex items-center gap-4">
            <MatchScoreRing score={result.score} />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {result.score >= 80 ? 'Well-structured' : result.score >= 60 ? 'Satisfactory' : 'Needs clarity'}
              </p>
              <p className="text-xs text-muted-foreground">
                Confidence: {Math.round(result.confidence * 100)}%
              </p>
            </div>
          </div>
        </div>

        {/* Seniority card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Detected Seniority
          </p>
          <p className="text-3xl font-bold text-[#7c5cfc]" data-testid="seniority-label">
            {result.seniority}
          </p>
          <span className="mt-2 inline-flex items-center rounded-lg bg-[#241f3d] px-2.5 py-1 text-xs font-medium text-[#7c5cfc]">
            {totalSkills} skills detected
          </span>
        </div>

        {/* Confidence card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Extraction Confidence
          </p>
          <p className="text-3xl font-bold text-emerald-400" data-testid="confidence-label">
            {Math.round(result.confidence * 100)}%
          </p>
          <span className="mt-2 inline-flex items-center rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
            {totalSkills} skills detected
          </span>
        </div>
      </div>

      {/* Must-have chips */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Must-Have Technologies
        </p>
        <div className="flex flex-wrap gap-2" data-testid="must-have-chips">
          {result.mustHave.map((skill) => (
            <span
              key={skill}
              className="rounded-lg border border-[#7c5cfc] bg-[#241f3d] px-3 py-1 text-xs font-medium text-foreground"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Nice-to-have chips */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Nice-to-Have Technologies
        </p>
        <div className="flex flex-wrap gap-2" data-testid="nice-to-have-chips">
          {result.niceToHave.map((skill) => (
            <span
              key={skill}
              className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* JD summary */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          JD Summary
        </p>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">{result.summary}</p>
        </div>
      </div>

      {/* Stub CTA — KAN-21 */}
      <Button disabled className="bg-indigo-600 disabled:opacity-50">
        Match Candidates →
      </Button>
    </div>
  )
}
```

- [ ] **Step 10.4: Run the panel tests — verify they pass**

```bash
cd src/web && npx vitest run src/components/JdAnalysisPanel.test.tsx
```

Expected: `Passed! - Failed: 0, Passed: 9`

- [ ] **Step 10.5: Run all frontend tests**

```bash
cd src/web && npm test
```

Expected: all tests pass.

- [ ] **Step 10.6: Commit**

```bash
git add src/web/src/components/JdAnalysisPanel.tsx \
        src/web/src/components/JdAnalysisPanel.test.tsx
git commit -m "feat(KAN-20): add JdAnalysisPanel with score ring, skill chips, and summary"
```

---

## Task 11: Render step 2 in `JdMatchFlow` + final build check

**Files:**
- Modify: `src/web/src/pages/JdMatchFlow.tsx`

- [ ] **Step 11.1: Add step 2 render to `JdMatchFlow.tsx`**

Replace the entire content of `src/web/src/pages/JdMatchFlow.tsx` with:

```tsx
import { Stepper } from '@/components/Stepper'
import { JdUploadStep } from '@/components/JdUploadStep'
import { JdAnalysisPanel } from '@/components/JdAnalysisPanel'
import { useJdMatch } from '@/store/JdMatchContext'

const JD_STEPS: Array<[number, string]> = [
  [1, 'Upload JD'],
  [2, 'Analyze'],
  [3, 'Match Candidates'],
]

export function JdMatchFlow() {
  const { state } = useJdMatch()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">New JD Match</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a job description PDF — SmartFitter parses it, scores it, and ranks your candidates.
        </p>
      </div>
      <Stepper currentStep={state.currentStep} steps={JD_STEPS} />
      {state.currentStep === 1 && <JdUploadStep />}
      {state.currentStep === 2 && <JdAnalysisPanel />}
    </div>
  )
}
```

- [ ] **Step 11.2: Run type-check**

```bash
cd src/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 11.3: Run full frontend test suite**

```bash
cd src/web && npm test
```

Expected: all tests pass.

- [ ] **Step 11.4: Run full backend test suite**

```bash
dotnet test tests/InterviewAssistant.Api.Tests/
```

Expected: all tests pass.

- [ ] **Step 11.5: Build both targets**

```bash
dotnet build && cd src/web && npm run build
```

Expected: both succeed with no errors or warnings.

- [ ] **Step 11.6: Commit**

```bash
git add src/web/src/pages/JdMatchFlow.tsx
git commit -m "feat(KAN-20): render JdAnalysisPanel at step 2 of JD Match wizard"
```

---

## Self-Review Checklist

All spec sections covered:

| Spec requirement | Task |
|---|---|
| `JdAnalysisResult` model | Task 1 |
| `JdAnalysis` agent prompt | Task 2 |
| `SaveAnalysisAsync` in store | Task 3 |
| `IJdAnalysisService` + `JdAnalysisService` singleton | Task 4 |
| `POST /api/job-descriptions/{id}/analyze` endpoint | Task 5 |
| Register `IJdAnalysisService` in DI | Task 5 |
| `JdAnalysisResult` frontend type | Task 6 |
| `analyzeJobDescription` API function | Task 6 |
| `SET_ANALYSIS` reducer action + `analysisResult` state | Task 7 |
| Wire "Analyze JD →" button with loading + error | Task 8 |
| `MatchScoreRing` SVG component | Task 9 |
| `JdAnalysisPanel` with all sections | Task 10 |
| `JdMatchFlow` step 2 render | Task 11 |
| Backend unit tests | Tasks 3, 4, 5 |
| Frontend unit tests | Tasks 8, 10 |
