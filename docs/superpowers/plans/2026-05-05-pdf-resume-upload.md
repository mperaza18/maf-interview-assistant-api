# PDF Resume Upload (KAN-1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the resume textarea with a PDF upload button that saves the file server-side, extracts text with PdfPig, and runs AI analysis in a single round trip.

**Architecture:** A new `POST /api/interview/analyze-pdf` endpoint accepts `multipart/form-data`, saves the PDF to a configurable directory (`ResumeStorage:Path` config key, defaulting to `C:\AI Smart Fitter\Resumes`), extracts plain text via PdfPig, and calls the existing `AnalyzeResumeAsync` service — returning the same `AnalyzeResumeResponse`. The frontend replaces the textarea with a hidden file input triggered by a visible button; selecting a file automatically calls the new endpoint and renders a status indicator.

**Tech Stack:** UglyToad.PdfPig 0.1.9, ASP.NET Core multipart binding (`IFormFile`), xUnit + Moq, React 18 + TypeScript, FormData API, Vitest + Testing Library

---

## File Structure

| File | Change |
|---|---|
| `src/InterviewAssistant.Api/InterviewAssistant.Api.csproj` | Add `UglyToad.PdfPig` package |
| `src/InterviewAssistant.Api/Controllers/InterviewController.cs` | Add `IConfiguration` to constructor; add `AnalyzePdf` action |
| `tests/InterviewAssistant.Api.Tests/InterviewControllerTests.cs` | Add `IConfiguration` mock to existing constructor; add `InterviewControllerAnalyzePdfTests` class |
| `src/web/src/api/interviewApi.ts` | Add `analyzeResumePdf` export |
| `src/web/src/api/interviewApi.test.ts` | Add `analyzeResumePdf` test suite |
| `src/web/src/pages/AnalyzeStep.tsx` | Replace textarea with upload button + status indicator |
| `src/web/src/pages/AnalyzeStep.test.tsx` | New — component tests for the upload flow |

---

### Task 1: Add PdfPig NuGet to the API project

**Files:**
- Modify: `src/InterviewAssistant.Api/InterviewAssistant.Api.csproj`

- [ ] **Step 1: Add the package reference**

Inside the existing `<ItemGroup>` in `src/InterviewAssistant.Api/InterviewAssistant.Api.csproj`, add:

```xml
<PackageReference Include="UglyToad.PdfPig" Version="0.1.9" />
```

- [ ] **Step 2: Restore and build**

```bash
dotnet restore src/InterviewAssistant.Api/
dotnet build src/InterviewAssistant.Api/
```

Expected: `Build succeeded, 0 Error(s)`

- [ ] **Step 3: Commit**

```bash
git add src/InterviewAssistant.Api/InterviewAssistant.Api.csproj
git commit -m "chore: add UglyToad.PdfPig for server-side PDF text extraction"
```

---

### Task 2: Write failing backend tests for AnalyzePdf

**Files:**
- Modify: `tests/InterviewAssistant.Api.Tests/InterviewControllerTests.cs`

- [ ] **Step 1: Update the existing constructor to pass IConfiguration**

In `InterviewControllerTests.cs`, the constructor currently creates `InterviewController` with two args. Add a third:

```csharp
public InterviewControllerTests()
{
    _service = new Mock<IInterviewService>();
    _controller = new InterviewController(
        _service.Object,
        Mock.Of<ILogger<InterviewController>>(),
        Mock.Of<IConfiguration>());
}
```

- [ ] **Step 2: Add new using statements at the top of the file**

```csharp
using Microsoft.AspNetCore.Http;
using UglyToad.PdfPig.Writer;
using UglyToad.PdfPig.Fonts.Standard14Fonts;
using UglyToad.PdfPig.Core;
```

- [ ] **Step 3: Add the new test class at the bottom of the file**

Append this entire class after the closing `}` of `InterviewControllerTests`:

```csharp
public class InterviewControllerAnalyzePdfTests
{
    private readonly Mock<IInterviewService> _service = new();
    private readonly string _tempDir =
        Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

    private InterviewController CreateController()
    {
        var config = new Mock<IConfiguration>();
        config.Setup(c => c["ResumeStorage:Path"]).Returns(_tempDir);
        return new InterviewController(
            _service.Object,
            Mock.Of<ILogger<InterviewController>>(),
            config.Object);
    }

    private static byte[] CreatePdfWithText(string text)
    {
        var builder = new PdfDocumentBuilder();
        var page = builder.AddPage(PageSize.A4);
        var font = builder.AddStandard14Font(Standard14Font.Helvetica);
        page.AddText(text, 12, new PdfPoint(100, 700), font);
        return builder.Build();
    }

    private static byte[] CreateEmptyPagePdf()
    {
        var builder = new PdfDocumentBuilder();
        builder.AddPage(PageSize.A4);
        return builder.Build();
    }

    private static Mock<IFormFile> CreateMockPdfFile(byte[] bytes, string name = "resume.pdf")
    {
        var mock = new Mock<IFormFile>();
        mock.Setup(f => f.ContentType).Returns("application/pdf");
        mock.Setup(f => f.FileName).Returns(name);
        mock.Setup(f => f.CopyToAsync(
                It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .Callback<Stream, CancellationToken>(
                async (s, _) => await s.WriteAsync(bytes))
            .Returns(Task.CompletedTask);
        return mock;
    }

    [Fact]
    public async Task AnalyzePdf_NullFile_Returns400()
    {
        var result = await CreateController()
            .AnalyzePdf(null, "Engineer", CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task AnalyzePdf_WrongMimeType_Returns400()
    {
        var mock = new Mock<IFormFile>();
        mock.Setup(f => f.ContentType).Returns("text/plain");

        var result = await CreateController()
            .AnalyzePdf(mock.Object, "Engineer", CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task AnalyzePdf_ValidPdf_Returns200WithAnalysisResult()
    {
        var profile = new ResumeProfile { CandidateName = "Jane" };
        var seniority = new SeniorityAssessment { Level = "Senior" };
        _service
            .Setup(s => s.AnalyzeResumeAsync(
                It.IsAny<string>(), "Engineer", It.IsAny<CancellationToken>()))
            .ReturnsAsync((profile, seniority));

        var pdfBytes = CreatePdfWithText("Jane Doe Senior Software Engineer");
        var result = await CreateController()
            .AnalyzePdf(CreateMockPdfFile(pdfBytes).Object, "Engineer", CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AnalyzeResumeResponse>(ok.Value);
        Assert.Equal("Jane", response.Profile.CandidateName);
        Assert.Equal("Senior", response.Seniority.Level);

        if (Directory.Exists(_tempDir)) Directory.Delete(_tempDir, recursive: true);
    }

    [Fact]
    public async Task AnalyzePdf_EmptyPagePdf_Returns422()
    {
        var pdfBytes = CreateEmptyPagePdf();
        var result = await CreateController()
            .AnalyzePdf(CreateMockPdfFile(pdfBytes).Object, "Engineer", CancellationToken.None);

        Assert.IsType<UnprocessableEntityObjectResult>(result);

        if (Directory.Exists(_tempDir)) Directory.Delete(_tempDir, recursive: true);
    }

    [Fact]
    public async Task AnalyzePdf_FileReadThrowsIOException_Returns500()
    {
        var mock = new Mock<IFormFile>();
        mock.Setup(f => f.ContentType).Returns("application/pdf");
        mock.Setup(f => f.FileName).Returns("resume.pdf");
        mock.Setup(f => f.CopyToAsync(
                It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new IOException("disk full"));

        var result = await CreateController()
            .AnalyzePdf(mock.Object, "Engineer", CancellationToken.None);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status500InternalServerError, statusResult.StatusCode);
    }
}
```

- [ ] **Step 4: Run the new tests to confirm they fail**

```bash
dotnet test tests/InterviewAssistant.Api.Tests/ --filter "FullyQualifiedName~AnalyzePdf"
```

Expected: 5 tests fail — `AnalyzePdf` method does not exist yet on `InterviewController`

- [ ] **Step 5: Run the existing tests to confirm they still pass**

```bash
dotnet test tests/InterviewAssistant.Api.Tests/ --filter "FullyQualifiedName~InterviewControllerTests"
```

Expected: All pre-existing tests pass (constructor now accepts IConfiguration mock)

---

### Task 3: Implement the AnalyzePdf endpoint

**Files:**
- Modify: `src/InterviewAssistant.Api/Controllers/InterviewController.cs`

- [ ] **Step 1: Add UglyToad.PdfPig using and IConfiguration to the constructor**

Replace the top of `InterviewController.cs` (from `using` statements through the constructor closing brace) with:

```csharp
using InterviewAssistant.Api.Models;
using InterviewAssistant.Api.Requests;
using InterviewAssistant.Api.Services;
using Microsoft.AspNetCore.Mvc;
using UglyToad.PdfPig;

namespace InterviewAssistant.Api.Controllers;

[ApiController]
[Route("api/interview")]
[Produces("application/json")]
public sealed class InterviewController : ControllerBase
{
    private readonly IInterviewService _service;
    private readonly ILogger<InterviewController> _logger;
    private readonly IConfiguration _configuration;

    public InterviewController(
        IInterviewService service,
        ILogger<InterviewController> logger,
        IConfiguration configuration)
    {
        _service = service;
        _logger = logger;
        _configuration = configuration;
    }
```

- [ ] **Step 2: Add the AnalyzePdf action**

Insert this block between the `Evaluate` action and the `ProblemDetailsFor` helper method:

```csharp
    // ─── POST /api/interview/analyze-pdf ─────────────────────────────────────

    /// <summary>
    /// Accepts a PDF resume via multipart/form-data, saves it to disk,
    /// extracts plain text with PdfPig, and runs the AI analysis pipeline.
    /// Returns the same AnalyzeResumeResponse as POST /api/interview/analyze.
    /// </summary>
    [HttpPost("analyze-pdf")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(AnalyzeResumeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> AnalyzePdf(
        IFormFile? file,
        [FromForm] string role = "Software Engineer",
        CancellationToken ct = default)
    {
        if (file is null || file.ContentType != "application/pdf")
            return BadRequest(ProblemDetailsFor("A PDF file is required."));

        _logger.LogInformation("Processing PDF resume: {FileName}", file.FileName);

        // Step 1: Read file bytes from the upload stream.
        byte[] pdfBytes;
        try
        {
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms, ct);
            pdfBytes = ms.ToArray();
        }
        catch (IOException ex)
        {
            _logger.LogError(ex, "Failed to read uploaded PDF");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ProblemDetailsFor("Failed to save the resume file."));
        }

        // Step 2: Persist to the local resumes directory.
        try
        {
            var dir = _configuration["ResumeStorage:Path"] ?? @"C:\AI Smart Fitter\Resumes";
            Directory.CreateDirectory(dir);
            await File.WriteAllBytesAsync(
                Path.Combine(dir, Path.GetFileName(file.FileName)), pdfBytes, ct);
        }
        catch (IOException ex)
        {
            _logger.LogError(ex, "Failed to save PDF to disk");
            return StatusCode(StatusCodes.Status500InternalServerError,
                ProblemDetailsFor("Failed to save the resume file."));
        }

        // Step 3: Extract text from the in-memory bytes with PdfPig.
        string extractedText;
        using (var doc = PdfDocument.Open(pdfBytes))
            extractedText = string.Join(" ", doc.GetPages()
                .SelectMany(p => p.GetWords())
                .Select(w => w.Text));

        if (string.IsNullOrWhiteSpace(extractedText))
            return UnprocessableEntity(ProblemDetailsFor(
                "Could not extract text from the PDF. The file may be scanned or image-only."));

        // Step 4: Run the existing AI analysis pipeline.
        var (profile, seniority) = await _service.AnalyzeResumeAsync(extractedText, role, ct);
        return Ok(new AnalyzeResumeResponse { Profile = profile, Seniority = seniority });
    }
```

- [ ] **Step 3: Build the API**

```bash
dotnet build src/InterviewAssistant.Api/
```

Expected: `Build succeeded, 0 Error(s)`

- [ ] **Step 4: Run AnalyzePdf tests**

```bash
dotnet test tests/InterviewAssistant.Api.Tests/ --filter "FullyQualifiedName~AnalyzePdf"
```

Expected: All 5 tests pass

- [ ] **Step 5: Run the full backend test suite**

```bash
dotnet test tests/InterviewAssistant.Api.Tests/
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/InterviewAssistant.Api/Controllers/InterviewController.cs \
        tests/InterviewAssistant.Api.Tests/InterviewControllerTests.cs
git commit -m "feat: add POST /api/interview/analyze-pdf with PdfPig text extraction"
```

---

### Task 4: Write failing frontend API client tests

**Files:**
- Modify: `src/web/src/api/interviewApi.test.ts`

- [ ] **Step 1: Add analyzeResumePdf to the import line at the top**

Replace the existing import:

```typescript
import { analyzeResume, generatePlan, revisePlan, evaluate, ApiError } from './interviewApi'
```

With:

```typescript
import { analyzeResume, generatePlan, revisePlan, evaluate, analyzeResumePdf, ApiError } from './interviewApi'
```

- [ ] **Step 2: Add the test suite at the bottom of `interviewApi.test.ts`**

```typescript
describe('analyzeResumePdf', () => {
  it('POSTs to /api/interview/analyze-pdf using FormData', async () => {
    const response = { profile: mockProfile, seniority: mockSeniority }
    mockFetch(200, response)
    const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' })
    await analyzeResumePdf(file, 'Engineer')
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(url).toContain('/api/interview/analyze-pdf')
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    expect((init as RequestInit & { headers?: unknown }).headers).toBeUndefined()
  })

  it('returns parsed AnalyzeResumeResponse on 200', async () => {
    const response = { profile: mockProfile, seniority: mockSeniority }
    mockFetch(200, response)
    const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' })
    const result = await analyzeResumePdf(file, 'Engineer')
    expect(result).toEqual(response)
  })

  it('throws ApiError on non-2xx response', async () => {
    mockFetch(422, { detail: 'no text' })
    const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' })
    await expect(analyzeResumePdf(file, 'Engineer')).rejects.toBeInstanceOf(ApiError)
  })

  it('ApiError carries the correct status code', async () => {
    mockFetch(422, { detail: 'no text' })
    const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' })
    try {
      await analyzeResumePdf(file, 'Engineer')
    } catch (e) {
      expect((e as ApiError).status).toBe(422)
    }
  })
})
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd src/web && npm test -- --reporter=verbose interviewApi
```

Expected: 4 new tests fail with `analyzeResumePdf is not a function` (or similar import error)

---

### Task 5: Implement analyzeResumePdf

**Files:**
- Modify: `src/web/src/api/interviewApi.ts`

- [ ] **Step 1: Add the function after the analyzeResume export**

In `interviewApi.ts`, insert this after the `analyzeResume` constant:

```typescript
export async function analyzeResumePdf(file: File, role: string): Promise<AnalyzeResumeResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('role', role)
  const res = await fetch(`${baseUrl()}/api/interview/analyze-pdf`, {
    method: 'POST',
    body: formData,
  })
  const text = await res.text()
  if (!res.ok) throw new ApiError(res.status, text)
  return JSON.parse(text) as AnalyzeResumeResponse
}
```

Note: Do NOT set a `Content-Type` header — omitting it allows the browser to set the correct `multipart/form-data` boundary automatically.

- [ ] **Step 2: Run the API client tests**

```bash
cd src/web && npm test -- --reporter=verbose interviewApi
```

Expected: All tests in `interviewApi.test.ts` pass

- [ ] **Step 3: Commit**

```bash
git add src/web/src/api/interviewApi.ts src/web/src/api/interviewApi.test.ts
git commit -m "feat: add analyzeResumePdf API client function"
```

---

### Task 6: Write failing AnalyzeStep component tests

**Files:**
- Create: `src/web/src/pages/AnalyzeStep.test.tsx`

- [ ] **Step 1: Create the test file**

Create `src/web/src/pages/AnalyzeStep.test.tsx` with:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { Dispatch } from 'react'
import { SessionContext } from '@/store/SessionContext'
import { AnalyzeStep } from './AnalyzeStep'
import * as api from '@/api/interviewApi'
import type { Session, ResumeProfile, SeniorityAssessment } from '@/types'
import type { SessionAction, SessionState } from '@/store/sessionReducer'

const mockProfile: ResumeProfile = {
  candidateName: 'Jane Doe',
  coreSkills: ['React'],
  roles: [],
  notableProjects: [],
  redFlags: [],
}
const mockSeniority: SeniorityAssessment = { level: 'Senior', confidence: 0.9, rationale: 'strong' }

const baseSession: Session = {
  id: 'test-id',
  candidateName: '',
  role: 'Software Engineer',
  createdAt: '2026-05-05T00:00:00.000Z',
  updatedAt: '2026-05-05T00:00:00.000Z',
  currentStep: 1,
  resumeText: '',
  notes: '',
}

function renderAnalyzeStep(session: Session = baseSession) {
  const dispatch = vi.fn() as unknown as Dispatch<SessionAction>
  const state = { current: session, sessions: [] } as SessionState
  const repository = { save: vi.fn(), load: vi.fn(), clear: vi.fn() } as any
  render(
    <SessionContext.Provider value={{ state, dispatch, repository }}>
      <AnalyzeStep />
    </SessionContext.Provider>
  )
  return { dispatch }
}

beforeEach(() => vi.restoreAllMocks())

describe('AnalyzeStep', () => {
  it('renders an upload button and no resume textarea', () => {
    renderAnalyzeStep()
    expect(screen.getByRole('button', { name: /upload pdf/i })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /resume/i })).not.toBeInTheDocument()
  })

  it('has a hidden file input that accepts PDF only', () => {
    renderAnalyzeStep()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).not.toBeNull()
    expect(input.accept).toBe('.pdf')
  })

  it('shows spinner and disables button while uploading', async () => {
    vi.spyOn(api, 'analyzeResumePdf').mockReturnValue(new Promise(() => {}))
    renderAnalyzeStep()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['%PDF'], 'resume.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled()
    )
  })

  it('shows green check and dispatches LOAD_SESSION on success', async () => {
    vi.spyOn(api, 'analyzeResumePdf').mockResolvedValue({
      profile: mockProfile,
      seniority: mockSeniority,
    })
    const { dispatch } = renderAnalyzeStep()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })] } })
    await waitFor(() => expect(screen.getByText('✓')).toBeInTheDocument())
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'LOAD_SESSION' })
    )
  })

  it('shows red X and 422 message on unreadable PDF', async () => {
    vi.spyOn(api, 'analyzeResumePdf').mockRejectedValue(
      new api.ApiError(422, 'no text')
    )
    renderAnalyzeStep()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'scan.pdf', { type: 'application/pdf' })] } })
    await waitFor(() => expect(screen.getByText('✗')).toBeInTheDocument())
    expect(screen.getByText(/doesn't contain readable text/i)).toBeInTheDocument()
  })

  it('"Try another file" resets state back to idle', async () => {
    vi.spyOn(api, 'analyzeResumePdf').mockRejectedValue(
      new api.ApiError(422, 'no text')
    )
    renderAnalyzeStep()
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['%PDF'], 'scan.pdf', { type: 'application/pdf' })] } })
    await waitFor(() => screen.getByText(/try another file/i))
    fireEvent.click(screen.getByText(/try another file/i))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /upload pdf/i })).not.toBeDisabled()
    )
    expect(screen.queryByText('✗')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd src/web && npm test -- --reporter=verbose AnalyzeStep
```

Expected: Tests fail (component still has textarea, no upload button)

---

### Task 7: Implement the new AnalyzeStep UI

**Files:**
- Modify: `src/web/src/pages/AnalyzeStep.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSession } from '@/store/SessionContext'
import { analyzeResumePdf, ApiError } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error'

export function AnalyzeStep() {
  const { state, dispatch } = useSession()
  const session = state.current
  const [role, setRole] = useState(session?.role ?? 'Software Engineer')
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
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
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
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
            {uploadStatus === 'success' && (
              <span className="flex items-center gap-1 text-sm text-emerald-400">
                <span>📄</span>
                <span>✓</span>
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
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Target Role
          </label>
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border-slate-700 bg-slate-800 text-slate-100"
          />
        </div>
      </div>

      {uploadStatus === 'uploading' && <LoadingSpinner label="Analyzing resume with AI..." />}

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
            <span className="text-slate-200">
              {Math.round(session.seniority.confidence * 100)}%
            </span>
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

- [ ] **Step 2: Run the component tests**

```bash
cd src/web && npm test -- --reporter=verbose AnalyzeStep
```

Expected: All 5 component tests pass

- [ ] **Step 3: Run the full frontend test suite**

```bash
cd src/web && npm test
```

Expected: All frontend tests pass

- [ ] **Step 4: Commit**

```bash
git add src/web/src/pages/AnalyzeStep.tsx src/web/src/pages/AnalyzeStep.test.tsx
git commit -m "feat: replace resume textarea with PDF upload UI in AnalyzeStep"
```

---

### Task 8: Final verification

**Files:** None — verification only.

- [ ] **Step 1: Run all backend tests**

```bash
dotnet test tests/InterviewAssistant.Api.Tests/
```

Expected: All tests pass

- [ ] **Step 2: Run all frontend tests**

```bash
cd src/web && npm test
```

Expected: All tests pass

- [ ] **Step 3: Build the full solution**

```bash
dotnet build
```

Expected: `Build succeeded, 0 Error(s)`

- [ ] **Step 4: Verify working tree is clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean`
