# KAN-20 — AI JD Analysis Service

**Ticket:** KAN-20 (parent: KAN-19 JD Analysis & Smart Candidate Matching)
**Date:** 2026-06-14
**Status:** Approved for implementation

## Problem

After a Job Description PDF is uploaded and parsed (KAN-3), there is no way to extract structured requirements (technologies, seniority) or evaluate JD quality. The raw extracted text needs to become typed, reliable data that downstream candidate-matching can consume.

## Solution Overview

Add a JD analysis step powered by a dedicated LLM agent. The backend exposes `POST /api/job-descriptions/{id}/analyze`, persists the result, and returns a typed `JdAnalysisResult`. The frontend wires the existing "Analyze JD →" button in step 1, shows inline loading, then auto-advances to a new step 2 panel that renders the analysis.

## Decisions Made

- **SkillRequirement type:** plain `string[]` — simpler for the LLM to produce reliably; no category/priority fields needed.
- **Loading UX:** inline in step 1 (spinner on the "Analyze JD →" button); auto-advance to step 2 on success.
- **KAN-20 scope:** status badge, 3 metric cards, must/nice-to-have chips, JD summary card, stub "Match Candidates →" button (disabled). The minimum match threshold slider belongs to KAN-21.

## Backend

### New Models (`src/InterviewAssistant.Api/Models/`)

**`JdAnalysisResult.cs`**
```csharp
public sealed class JdAnalysisResult
{
    [JsonPropertyName("score")]       public int Score { get; set; }        // 0–100
    [JsonPropertyName("seniority")]   public string Seniority { get; set; } = "";
    [JsonPropertyName("mustHave")]    public string[] MustHave { get; set; } = [];
    [JsonPropertyName("niceToHave")]  public string[] NiceToHave { get; set; } = [];
    [JsonPropertyName("summary")]     public string Summary { get; set; } = "";
    [JsonPropertyName("confidence")]  public float Confidence { get; set; } // 0.0–1.0
}
```

### New Agent Prompt (`Agents/AgentPrompts.cs`)

Add `JdAnalysis` constant. The prompt instructs the LLM to:
- Return raw JSON only (no markdown fences)
- Conform exactly to the `JdAnalysisResult` schema
- Clamp `score` to 0–100
- Express `confidence` as a float 0.0–1.0
- Use plain skill name strings for `mustHave` and `niceToHave`

### New Service (`Services/`)

**`IJdAnalysisService.cs`**
```csharp
public interface IJdAnalysisService
{
    Task<JdAnalysisResult> AnalyzeAsync(string extractedText, CancellationToken ct = default);
}
```

**`JdAnalysisService.cs`** (singleton)
- Holds one `AIAgent` instance (`_analysisAgent`) created at construction via `AgentFactory.CreateAzureOpenAIAgent("JdAnalysis", AgentPrompts.JdAnalysis, config)`
- Injects `IAgentRunner` (shared `JsonAgentRunner` singleton)
- `AnalyzeAsync` calls `_runner.RunJsonAsync<JdAnalysisResult>(_analysisAgent, extractedText, ct)`
- Lets `InvalidOperationException` bubble on JSON parse failure — the global error handler returns 500

### Updated Store (`Services/FileSystemJobDescriptionStore.cs`)

Add `SaveAnalysisAsync(string id, JdAnalysisResult result, CancellationToken ct)` to `IJobDescriptionStore`. Writes `analysis.json` to `{root}/{id}/`.

### New Endpoint (`Controllers/JobDescriptionController.cs`)

```
POST /api/job-descriptions/{id}/analyze
```

1. Validate `id` is a GUID → 404 if not
2. Load JD from store → 404 if missing
3. Call `_analysisService.AnalyzeAsync(jobDescription.ExtractedText, ct)`
4. Call `_store.SaveAnalysisAsync(id, result, ct)`
5. Return `200 OK` with `JdAnalysisResult`

Response codes: `200 OK`, `404 Not Found`, `500 Internal Server Error` (agent failure).

### `Program.cs`

Register `IJdAnalysisService` as singleton:
```csharp
builder.Services.AddSingleton<IJdAnalysisService, JdAnalysisService>();
```

## Frontend

### New Type (`src/web/src/types/index.ts`)

```typescript
export interface JdAnalysisResult {
  score: number         // 0–100
  seniority: string
  mustHave: string[]
  niceToHave: string[]
  summary: string
  confidence: number    // 0.0–1.0
}
```

### API Client (`src/web/src/api/jobDescriptionApi.ts`)

Add:
```typescript
export async function analyzeJobDescription(id: string): Promise<JdAnalysisResult>
// POST /api/job-descriptions/{id}/analyze
// Throws ApiError on non-2xx
```

### State (`src/web/src/store/jdMatchReducer.ts`)

- Add `analysisResult: JdAnalysisResult | null` to `JdMatchState`
- Add `SET_ANALYSIS` action: sets `analysisResult` and advances `currentStep` to `2`
- `initialJdMatchState`: `analysisResult: null`

### `JdUploadStep.tsx` changes

- The "Analyze JD →" button becomes enabled when `state.jobDescription` is set
- On click: calls `analyzeJobDescription(jd.id)`, shows inline loading spinner (label: "Analyzing JD…")
- On success: `dispatch({ type: 'SET_ANALYSIS', analysisResult: result })`
- On error: shows inline error message ("Analysis failed. Please try again.") below the button — same pattern as upload errors; the button remains enabled so the user can click it again

### New Components

**`src/web/src/components/ui/MatchScoreRing.tsx`**
- Props: `score: number` (0–100)
- SVG ring: background track `#1a2233`, filled arc `#7c5cfc`
- Displays score number centered inside the ring with `/100` sub-label
- Arc fill is proportional to score (score/100 of full circumference)

**`src/web/src/components/JdAnalysisPanel.tsx`**
- Reads `state.analysisResult` from `useJdMatch()` context
- Layout (matches Figma node 105:2, dark + light mode via Tailwind tokens):
  1. **Status badge** — "✓ Analysis complete" (green)
  2. **3 metric cards in a row:**
     - JD Quality Score: `<MatchScoreRing score={result.score} />` + label beside it
     - Detected Seniority: large purple text + experience sub-label pill
     - Extraction Confidence: large green percentage + "N skills detected" pill (count = mustHave.length + niceToHave.length)
  3. **Must-have chips** — purple border (`border-[#7c5cfc]`), label "MUST-HAVE TECHNOLOGIES"
  4. **Nice-to-have chips** — muted border (`border-border`), label "NICE-TO-HAVE TECHNOLOGIES"
  5. **JD summary card** — full-width card with `result.summary`
  6. **"Match Candidates →" stub button** — disabled, for KAN-21

### `JdMatchFlow.tsx`

Add step 2 render:
```tsx
{state.currentStep === 2 && <JdAnalysisPanel />}
```

## Error Handling

| Layer | Failure | Handling |
|-------|---------|----------|
| Backend | Agent returns invalid JSON | `JsonAgentRunner` throws `InvalidOperationException` → global handler → 500 ProblemDetails |
| Backend | JD not found | Controller → 404 ProblemDetails |
| Frontend | API returns non-2xx | `ApiError` caught in `JdUploadStep` → inline error text below button; button stays enabled for retry |
| Frontend | Network error | Same catch block → same inline error display |

No auto-retry. User retries manually.

## Testing

### Backend

**`JdAnalysisServiceTests.cs`** (unit):
- Mock `IAgentRunner` to return valid JSON → verify `AnalyzeAsync` deserializes correctly
- Mock `IAgentRunner` to throw → verify `AnalyzeAsync` propagates exception

**`JobDescriptionControllerTests.cs`** (unit):
- Mock `IJdAnalysisService` returning a result → verify `POST /analyze` returns 200 with the result
- Mock store returning null → verify 404
- Mock service throwing → verify 500

### Frontend

**`JdAnalysisPanel.test.tsx`** (new):
- Render with mock `JdAnalysisResult` in context
- Assert score ring renders (aria-label or data-testid)
- Assert must-have chip count matches `mustHave.length`
- Assert seniority text renders

**`JdUploadStep.test.tsx`** (update):
- "Analyze JD →" button is disabled when no JD in state
- "Analyze JD →" button is enabled when JD is present
- On click with mocked `analyzeJobDescription` failure → error message visible
- On click with mocked success → `SET_ANALYSIS` dispatched

## Files Changed

### New
- `src/InterviewAssistant.Api/Models/JdAnalysisResult.cs`
- `src/InterviewAssistant.Api/Services/IJdAnalysisService.cs`
- `src/InterviewAssistant.Api/Services/JdAnalysisService.cs`
- `src/web/src/components/ui/MatchScoreRing.tsx`
- `src/web/src/components/JdAnalysisPanel.tsx`
- `src/web/src/components/JdAnalysisPanel.test.tsx`

### Modified
- `src/InterviewAssistant.Api/Agents/AgentPrompts.cs` — add `JdAnalysis` prompt
- `src/InterviewAssistant.Api/Services/IJobDescriptionStore.cs` — add `SaveAnalysisAsync`
- `src/InterviewAssistant.Api/Services/FileSystemJobDescriptionStore.cs` — implement `SaveAnalysisAsync`
- `src/InterviewAssistant.Api/Controllers/JobDescriptionController.cs` — add `Analyze` endpoint
- `src/InterviewAssistant.Api/Program.cs` — register `IJdAnalysisService`
- `src/web/src/types/index.ts` — add `JdAnalysisResult`
- `src/web/src/api/jobDescriptionApi.ts` — add `analyzeJobDescription`
- `src/web/src/store/jdMatchReducer.ts` — add `SET_ANALYSIS` action + `analysisResult` state
- `src/web/src/components/JdUploadStep.tsx` — wire "Analyze JD →" button
- `src/web/src/components/JdUploadStep.test.tsx` — add analyze button tests
- `src/web/src/pages/JdMatchFlow.tsx` — render step 2
