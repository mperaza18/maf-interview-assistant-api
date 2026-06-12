# KAN-3 Upload & Ingest Job Description PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload a Job Description PDF, persist it on disk, extract its text with PdfPig, and show the parsed state in a new 3-step "New JD Match" flow.

**Architecture:** New `JobDescriptionController` (`POST`/`GET` at `api/job-descriptions`) backed by `JdParsingService` (PdfPig text extraction) and `FileSystemJobDescriptionStore` (PDF + text + metadata under a configurable directory). New frontend JD Match flow entered from HomeScreen: `JdMatchFlow` page with a generalized `Stepper` and a `JdUploadStep` dropzone, state in a new `JdMatchContext` persisted to localStorage.

**Tech Stack:** ASP.NET Core (.NET), PdfPig, xUnit + Moq · React 18 + TypeScript + Tailwind, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-06-11-kan-3-upload-jd-pdf-design.md`
**Branch:** `feat/kan-3-upload-jd-pdf` · All commands run from the repo root unless noted.

---

### Task 1: JdParsingService

**Files:**
- Create: `src/InterviewAssistant.Api/Services/IJdParsingService.cs`
- Create: `src/InterviewAssistant.Api/Services/JdParsingService.cs`
- Test: `tests/InterviewAssistant.Api.Tests/JdParsingServiceTests.cs`

- [ ] **Step 1: Write the failing tests**

```csharp
// tests/InterviewAssistant.Api.Tests/JdParsingServiceTests.cs
using InterviewAssistant.Api.Services;
using UglyToad.PdfPig.Fonts.Standard14Fonts;
using UglyToad.PdfPig.Writer;

namespace InterviewAssistant.Api.Tests;

public class JdParsingServiceTests
{
    private readonly JdParsingService _service = new();

    private static byte[] CreatePdfWithText(params string[] pageTexts)
    {
        var builder = new PdfDocumentBuilder();
        var font = builder.AddStandard14Font(Standard14Font.Helvetica);
        foreach (var text in pageTexts)
        {
            var page = builder.AddPage(612, 792);
            page.AddText(text, 12, new UglyToad.PdfPig.Core.PdfPoint(100, 700), font);
        }
        return builder.Build();
    }

    private static byte[] CreateEmptyPagePdf()
    {
        var builder = new PdfDocumentBuilder();
        builder.AddPage(612, 792);
        return builder.Build();
    }

    [Fact]
    public void ExtractText_TextPdf_ReturnsWords()
    {
        var pdf = CreatePdfWithText("Senior .NET Engineer required");

        var text = _service.ExtractText(pdf);

        Assert.Contains("Senior", text);
        Assert.Contains("Engineer", text);
    }

    [Fact]
    public void ExtractText_MultiPagePdf_JoinsPagesWithNewline()
    {
        var pdf = CreatePdfWithText("Page one text", "Page two text");

        var text = _service.ExtractText(pdf);

        Assert.Contains("Page one text\nPage two text", text);
    }

    [Fact]
    public void ExtractText_ImageOnlyPdf_ReturnsEmpty()
    {
        var pdf = CreateEmptyPagePdf();

        var text = _service.ExtractText(pdf);

        Assert.Equal(string.Empty, text);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test tests/InterviewAssistant.Api.Tests/ --filter "FullyQualifiedName~JdParsingServiceTests"`
Expected: build FAILS with "The type or namespace name 'JdParsingService' could not be found" — that is the failing state for a not-yet-written class.

- [ ] **Step 3: Write the implementation**

```csharp
// src/InterviewAssistant.Api/Services/IJdParsingService.cs
namespace InterviewAssistant.Api.Services;

/// <summary>Extracts normalized plain text from a Job Description PDF.</summary>
public interface IJdParsingService
{
    /// <summary>Returns the extracted text, or an empty string if the PDF has no readable text.</summary>
    string ExtractText(byte[] pdfBytes);
}
```

```csharp
// src/InterviewAssistant.Api/Services/JdParsingService.cs
using UglyToad.PdfPig;

namespace InterviewAssistant.Api.Services;

public sealed class JdParsingService : IJdParsingService
{
    public string ExtractText(byte[] pdfBytes)
    {
        using var doc = PdfDocument.Open(pdfBytes);

        var pages = doc.GetPages()
            .Select(p => string.Join(" ", p.GetWords().Select(w => w.Text)))
            .Where(t => !string.IsNullOrWhiteSpace(t));

        return string.Join("\n", pages).Trim();
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test tests/InterviewAssistant.Api.Tests/ --filter "FullyQualifiedName~JdParsingServiceTests"`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/InterviewAssistant.Api/Services/IJdParsingService.cs src/InterviewAssistant.Api/Services/JdParsingService.cs tests/InterviewAssistant.Api.Tests/JdParsingServiceTests.cs
git commit -m "feat(KAN-3): add JdParsingService for JD PDF text extraction"
```

---

### Task 2: JobDescription model + FileSystemJobDescriptionStore

**Files:**
- Create: `src/InterviewAssistant.Api/Models/JobDescription.cs`
- Create: `src/InterviewAssistant.Api/Services/IJobDescriptionStore.cs`
- Create: `src/InterviewAssistant.Api/Services/FileSystemJobDescriptionStore.cs`
- Test: `tests/InterviewAssistant.Api.Tests/FileSystemJobDescriptionStoreTests.cs`

- [ ] **Step 1: Write the model (pure data, no test needed on its own)**

```csharp
// src/InterviewAssistant.Api/Models/JobDescription.cs
using System.Text.Json.Serialization;

namespace InterviewAssistant.Api.Models;

public sealed class JobDescription
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("fileName")] public string FileName { get; set; } = "";
    [JsonPropertyName("sizeBytes")] public long SizeBytes { get; set; }
    [JsonPropertyName("extractedText")] public string ExtractedText { get; set; } = "";
    [JsonPropertyName("uploadedAtUtc")] public DateTimeOffset UploadedAtUtc { get; set; }
    [JsonPropertyName("status")] public string Status { get; set; } = "parsed";
}
```

- [ ] **Step 2: Write the failing tests for the store**

```csharp
// tests/InterviewAssistant.Api.Tests/FileSystemJobDescriptionStoreTests.cs
using InterviewAssistant.Api.Models;
using InterviewAssistant.Api.Services;
using Microsoft.Extensions.Configuration;
using Moq;

namespace InterviewAssistant.Api.Tests;

public class FileSystemJobDescriptionStoreTests : IDisposable
{
    private readonly string _tempDir =
        Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

    private FileSystemJobDescriptionStore CreateStore()
    {
        var config = new Mock<IConfiguration>();
        config.Setup(c => c["JobDescriptionStorage:Path"]).Returns(_tempDir);
        return new FileSystemJobDescriptionStore(config.Object);
    }

    private static JobDescription SampleJd() => new()
    {
        Id = Guid.NewGuid().ToString(),
        FileName = "senior-dotnet-engineer-jd.pdf",
        SizeBytes = 1234,
        ExtractedText = "Senior .NET Engineer required",
        UploadedAtUtc = DateTimeOffset.UtcNow,
        Status = "parsed"
    };

    [Fact]
    public async Task SaveAsync_WritesPdfTextAndMetadata()
    {
        var store = CreateStore();
        var jd = SampleJd();

        await store.SaveAsync(jd, new byte[] { 1, 2, 3 }, CancellationToken.None);

        var dir = Path.Combine(_tempDir, jd.Id);
        Assert.True(File.Exists(Path.Combine(dir, "original.pdf")));
        Assert.True(File.Exists(Path.Combine(dir, "extracted.txt")));
        Assert.True(File.Exists(Path.Combine(dir, "metadata.json")));
        Assert.Equal("Senior .NET Engineer required",
            await File.ReadAllTextAsync(Path.Combine(dir, "extracted.txt")));
    }

    [Fact]
    public async Task GetAsync_AfterSave_RoundTripsMetadata()
    {
        var store = CreateStore();
        var jd = SampleJd();
        await store.SaveAsync(jd, new byte[] { 1 }, CancellationToken.None);

        var loaded = await store.GetAsync(jd.Id, CancellationToken.None);

        Assert.NotNull(loaded);
        Assert.Equal(jd.Id, loaded!.Id);
        Assert.Equal(jd.FileName, loaded.FileName);
        Assert.Equal(jd.SizeBytes, loaded.SizeBytes);
        Assert.Equal(jd.ExtractedText, loaded.ExtractedText);
        Assert.Equal("parsed", loaded.Status);
    }

    [Fact]
    public async Task GetAsync_UnknownId_ReturnsNull()
    {
        var store = CreateStore();

        var loaded = await store.GetAsync(Guid.NewGuid().ToString(), CancellationToken.None);

        Assert.Null(loaded);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir)) Directory.Delete(_tempDir, recursive: true);
    }
}
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `dotnet test tests/InterviewAssistant.Api.Tests/ --filter "FullyQualifiedName~FileSystemJobDescriptionStoreTests"`
Expected: build FAILS — `FileSystemJobDescriptionStore` not found.

- [ ] **Step 4: Write the implementation**

```csharp
// src/InterviewAssistant.Api/Services/IJobDescriptionStore.cs
using InterviewAssistant.Api.Models;

namespace InterviewAssistant.Api.Services;

/// <summary>Persists uploaded Job Descriptions (PDF, extracted text, metadata).</summary>
public interface IJobDescriptionStore
{
    Task SaveAsync(JobDescription jobDescription, byte[] pdfBytes, CancellationToken ct);
    Task<JobDescription?> GetAsync(string id, CancellationToken ct);
}
```

```csharp
// src/InterviewAssistant.Api/Services/FileSystemJobDescriptionStore.cs
using System.Text.Json;
using InterviewAssistant.Api.Models;

namespace InterviewAssistant.Api.Services;

/// <summary>
/// Stores each Job Description under {root}/{id}/ as original.pdf,
/// extracted.txt, and metadata.json. Root is configurable via
/// "JobDescriptionStorage:Path" (same convention as "ResumeStorage:Path").
/// </summary>
public sealed class FileSystemJobDescriptionStore : IJobDescriptionStore
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    private readonly string _root;

    public FileSystemJobDescriptionStore(IConfiguration configuration)
    {
        _root = configuration["JobDescriptionStorage:Path"]
            ?? Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "AI Smart Fitter", "JobDescriptions");
    }

    public async Task SaveAsync(JobDescription jobDescription, byte[] pdfBytes, CancellationToken ct)
    {
        var dir = Path.Combine(_root, jobDescription.Id);
        Directory.CreateDirectory(dir);

        await File.WriteAllBytesAsync(Path.Combine(dir, "original.pdf"), pdfBytes, ct);
        await File.WriteAllTextAsync(Path.Combine(dir, "extracted.txt"), jobDescription.ExtractedText, ct);
        await File.WriteAllTextAsync(
            Path.Combine(dir, "metadata.json"),
            JsonSerializer.Serialize(jobDescription, JsonOptions), ct);
    }

    public async Task<JobDescription?> GetAsync(string id, CancellationToken ct)
    {
        var metadataPath = Path.Combine(_root, id, "metadata.json");
        if (!File.Exists(metadataPath)) return null;

        var json = await File.ReadAllTextAsync(metadataPath, ct);
        return JsonSerializer.Deserialize<JobDescription>(json);
    }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `dotnet test tests/InterviewAssistant.Api.Tests/ --filter "FullyQualifiedName~FileSystemJobDescriptionStoreTests"`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add src/InterviewAssistant.Api/Models/JobDescription.cs src/InterviewAssistant.Api/Services/IJobDescriptionStore.cs src/InterviewAssistant.Api/Services/FileSystemJobDescriptionStore.cs tests/InterviewAssistant.Api.Tests/FileSystemJobDescriptionStoreTests.cs
git commit -m "feat(KAN-3): add JobDescription model and filesystem store"
```

---

### Task 3: JobDescriptionController — POST /api/job-descriptions

**Files:**
- Create: `src/InterviewAssistant.Api/Models/JobDescriptionUploadResponse.cs`
- Create: `src/InterviewAssistant.Api/Controllers/JobDescriptionController.cs`
- Test: `tests/InterviewAssistant.Api.Tests/JobDescriptionControllerTests.cs`

Note: the controller depends on `GetById` (added in Task 4) as the `CreatedAtAction` target, so this task includes a minimal `GetById` stub that Task 4 completes.

- [ ] **Step 1: Write the failing tests**

```csharp
// tests/InterviewAssistant.Api.Tests/JobDescriptionControllerTests.cs
using InterviewAssistant.Api.Controllers;
using InterviewAssistant.Api.Models;
using InterviewAssistant.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace InterviewAssistant.Api.Tests;

public class JobDescriptionControllerTests
{
    private readonly Mock<IJdParsingService> _parser = new();
    private readonly Mock<IJobDescriptionStore> _store = new();

    private JobDescriptionController CreateController() => new(
        _parser.Object,
        _store.Object,
        Mock.Of<ILogger<JobDescriptionController>>());

    private static Mock<IFormFile> CreateMockPdfFile(
        long length = 1234,
        string contentType = "application/pdf",
        string name = "jd.pdf")
    {
        var mock = new Mock<IFormFile>();
        mock.Setup(f => f.ContentType).Returns(contentType);
        mock.Setup(f => f.FileName).Returns(name);
        mock.Setup(f => f.Length).Returns(length);
        mock.Setup(f => f.CopyToAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        return mock;
    }

    [Fact]
    public async Task Upload_NullFile_Returns400()
    {
        var result = await CreateController().Upload(null, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Upload_WrongContentType_Returns400()
    {
        var file = CreateMockPdfFile(contentType: "text/plain");

        var result = await CreateController().Upload(file.Object, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Upload_FileOver10Mb_Returns400()
    {
        var file = CreateMockPdfFile(length: 10 * 1024 * 1024 + 1);

        var result = await CreateController().Upload(file.Object, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Upload_UnreadablePdf_Returns422()
    {
        _parser.Setup(p => p.ExtractText(It.IsAny<byte[]>())).Returns(string.Empty);
        var file = CreateMockPdfFile();

        var result = await CreateController().Upload(file.Object, CancellationToken.None);

        Assert.IsType<UnprocessableEntityObjectResult>(result);
        _store.Verify(
            s => s.SaveAsync(It.IsAny<JobDescription>(), It.IsAny<byte[]>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Upload_ValidPdf_Returns201WithMetadata()
    {
        _parser.Setup(p => p.ExtractText(It.IsAny<byte[]>())).Returns("Senior .NET Engineer");
        var file = CreateMockPdfFile(length: 2048, name: "senior-jd.pdf");

        var result = await CreateController().Upload(file.Object, CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        var response = Assert.IsType<JobDescriptionUploadResponse>(created.Value);
        Assert.False(string.IsNullOrEmpty(response.Id));
        Assert.Equal("senior-jd.pdf", response.FileName);
        Assert.Equal(2048, response.SizeBytes);
        Assert.Equal("parsed", response.Status);
        _store.Verify(
            s => s.SaveAsync(
                It.Is<JobDescription>(jd => jd.ExtractedText == "Senior .NET Engineer"),
                It.IsAny<byte[]>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test tests/InterviewAssistant.Api.Tests/ --filter "FullyQualifiedName~JobDescriptionControllerTests"`
Expected: build FAILS — `JobDescriptionController` not found.

- [ ] **Step 3: Write the response model and controller**

```csharp
// src/InterviewAssistant.Api/Models/JobDescriptionUploadResponse.cs
using System.Text.Json.Serialization;

namespace InterviewAssistant.Api.Models;

public sealed class JobDescriptionUploadResponse
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("fileName")] public string FileName { get; set; } = "";
    [JsonPropertyName("sizeBytes")] public long SizeBytes { get; set; }
    [JsonPropertyName("status")] public string Status { get; set; } = "";
    [JsonPropertyName("uploadedAt")] public DateTimeOffset UploadedAt { get; set; }
}
```

```csharp
// src/InterviewAssistant.Api/Controllers/JobDescriptionController.cs
using InterviewAssistant.Api.Models;
using InterviewAssistant.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace InterviewAssistant.Api.Controllers;

[ApiController]
[Route("api/job-descriptions")]
[Produces("application/json")]
public sealed class JobDescriptionController : ControllerBase
{
    public const long MaxFileSizeBytes = 10 * 1024 * 1024;

    private readonly IJdParsingService _parser;
    private readonly IJobDescriptionStore _store;
    private readonly ILogger<JobDescriptionController> _logger;

    public JobDescriptionController(
        IJdParsingService parser,
        IJobDescriptionStore store,
        ILogger<JobDescriptionController> logger)
    {
        _parser = parser;
        _store = store;
        _logger = logger;
    }

    // ─── POST /api/job-descriptions ──────────────────────────────────────────

    /// <summary>
    /// Accepts a Job Description PDF via multipart/form-data, persists it,
    /// extracts plain text, and returns the new jobDescriptionId.
    /// </summary>
    [HttpPost]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxFileSizeBytes + 1024 * 1024)] // 10 MB payload + form overhead
    [ProducesResponseType(typeof(JobDescriptionUploadResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Upload(IFormFile? file, CancellationToken ct)
    {
        if (file is null || file.ContentType != "application/pdf")
            return BadRequest(ProblemDetailsFor("A PDF file is required."));

        if (file.Length > MaxFileSizeBytes)
            return BadRequest(ProblemDetailsFor("File exceeds the 10 MB limit."));

        _logger.LogInformation("Uploading JD PDF: {FileName} ({SizeBytes} bytes)", file.FileName, file.Length);

        byte[] pdfBytes;
        using (var ms = new MemoryStream())
        {
            await file.CopyToAsync(ms, ct);
            pdfBytes = ms.ToArray();
        }

        var extractedText = _parser.ExtractText(pdfBytes);
        if (string.IsNullOrWhiteSpace(extractedText))
            return UnprocessableEntity(new ProblemDetails
            {
                Title = "Unprocessable Entity",
                Detail = "Could not extract text from the PDF. The file may be scanned or image-only.",
                Status = StatusCodes.Status422UnprocessableEntity
            });

        var jobDescription = new JobDescription
        {
            Id = Guid.NewGuid().ToString(),
            FileName = Path.GetFileName(file.FileName),
            SizeBytes = file.Length,
            ExtractedText = extractedText,
            UploadedAtUtc = DateTimeOffset.UtcNow,
            Status = "parsed"
        };

        await _store.SaveAsync(jobDescription, pdfBytes, ct);

        var response = new JobDescriptionUploadResponse
        {
            Id = jobDescription.Id,
            FileName = jobDescription.FileName,
            SizeBytes = jobDescription.SizeBytes,
            Status = jobDescription.Status,
            UploadedAt = jobDescription.UploadedAtUtc
        };

        return CreatedAtAction(nameof(GetById), new { id = jobDescription.Id }, response);
    }

    // ─── GET /api/job-descriptions/{id} ──────────────────────────────────────
    // Stub completed in the next task.

    [HttpGet("{id}")]
    public Task<IActionResult> GetById(string id, CancellationToken ct)
        => Task.FromResult<IActionResult>(NotFound());

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static ProblemDetails ProblemDetailsFor(string detail) => new()
    {
        Title = "Bad Request",
        Detail = detail,
        Status = StatusCodes.Status400BadRequest
    };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test tests/InterviewAssistant.Api.Tests/ --filter "FullyQualifiedName~JobDescriptionControllerTests"`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/InterviewAssistant.Api/Models/JobDescriptionUploadResponse.cs src/InterviewAssistant.Api/Controllers/JobDescriptionController.cs tests/InterviewAssistant.Api.Tests/JobDescriptionControllerTests.cs
git commit -m "feat(KAN-3): add POST /api/job-descriptions upload endpoint"
```

---

### Task 4: JobDescriptionController — GET /api/job-descriptions/{id}

**Files:**
- Create: `src/InterviewAssistant.Api/Models/JobDescriptionDetailResponse.cs`
- Modify: `src/InterviewAssistant.Api/Controllers/JobDescriptionController.cs` (replace the `GetById` stub)
- Test: `tests/InterviewAssistant.Api.Tests/JobDescriptionControllerTests.cs` (append tests)

- [ ] **Step 1: Write the failing tests (append to the existing test class)**

```csharp
    [Fact]
    public async Task GetById_KnownId_Returns200WithExtractedText()
    {
        var id = Guid.NewGuid().ToString();
        _store.Setup(s => s.GetAsync(id, It.IsAny<CancellationToken>()))
              .ReturnsAsync(new JobDescription
              {
                  Id = id,
                  FileName = "jd.pdf",
                  SizeBytes = 2048,
                  ExtractedText = "Senior .NET Engineer",
                  UploadedAtUtc = DateTimeOffset.UtcNow,
                  Status = "parsed"
              });

        var result = await CreateController().GetById(id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<JobDescriptionDetailResponse>(ok.Value);
        Assert.Equal(id, response.Id);
        Assert.Equal("Senior .NET Engineer", response.ExtractedText);
        Assert.Equal("parsed", response.Status);
    }

    [Fact]
    public async Task GetById_UnknownId_Returns404()
    {
        _store.Setup(s => s.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync((JobDescription?)null);

        var result = await CreateController().GetById(Guid.NewGuid().ToString(), CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetById_NonGuidId_Returns404WithoutHittingStore()
    {
        var result = await CreateController().GetById("../etc/passwd", CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(result);
        _store.Verify(s => s.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test tests/InterviewAssistant.Api.Tests/ --filter "FullyQualifiedName~JobDescriptionControllerTests"`
Expected: build FAILS — `JobDescriptionDetailResponse` not found.

- [ ] **Step 3: Write the response model and replace the stub**

```csharp
// src/InterviewAssistant.Api/Models/JobDescriptionDetailResponse.cs
using System.Text.Json.Serialization;

namespace InterviewAssistant.Api.Models;

public sealed class JobDescriptionDetailResponse
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("fileName")] public string FileName { get; set; } = "";
    [JsonPropertyName("sizeBytes")] public long SizeBytes { get; set; }
    [JsonPropertyName("status")] public string Status { get; set; } = "";
    [JsonPropertyName("uploadedAt")] public DateTimeOffset UploadedAt { get; set; }
    [JsonPropertyName("extractedText")] public string ExtractedText { get; set; } = "";
}
```

Replace the `GetById` stub in `JobDescriptionController.cs` with:

```csharp
    /// <summary>
    /// Returns a stored Job Description including its extracted text,
    /// for downstream analysis.
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(JobDescriptionDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(string id, CancellationToken ct)
    {
        // Ids are server-generated GUIDs; anything else is unknown (and avoids path traversal).
        if (!Guid.TryParse(id, out _))
            return NotFound(NotFoundProblem(id));

        var jobDescription = await _store.GetAsync(id, ct);
        if (jobDescription is null)
            return NotFound(NotFoundProblem(id));

        return Ok(new JobDescriptionDetailResponse
        {
            Id = jobDescription.Id,
            FileName = jobDescription.FileName,
            SizeBytes = jobDescription.SizeBytes,
            Status = jobDescription.Status,
            UploadedAt = jobDescription.UploadedAtUtc,
            ExtractedText = jobDescription.ExtractedText
        });
    }

    private static ProblemDetails NotFoundProblem(string id) => new()
    {
        Title = "Not Found",
        Detail = $"No job description found with id '{id}'.",
        Status = StatusCodes.Status404NotFound
    };
```

(Also remove the `// Stub completed in the next task.` comment.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `dotnet test tests/InterviewAssistant.Api.Tests/ --filter "FullyQualifiedName~JobDescriptionControllerTests"`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add src/InterviewAssistant.Api/Models/JobDescriptionDetailResponse.cs src/InterviewAssistant.Api/Controllers/JobDescriptionController.cs tests/InterviewAssistant.Api.Tests/JobDescriptionControllerTests.cs
git commit -m "feat(KAN-3): add GET /api/job-descriptions/{id} with extracted text"
```

---

### Task 5: Register services and verify the API end-to-end

**Files:**
- Modify: `src/InterviewAssistant.Api/Program.cs:10-11`

- [ ] **Step 1: Register the new services**

In `Program.cs`, after the existing singleton registrations (lines 10–11), add:

```csharp
builder.Services.AddSingleton<IJdParsingService, JdParsingService>();
builder.Services.AddSingleton<IJobDescriptionStore, FileSystemJobDescriptionStore>();
```

- [ ] **Step 2: Build and run the full backend test suite**

Run: `dotnet build && dotnet test tests/InterviewAssistant.Api.Tests/`
Expected: build succeeds, all tests pass (existing + 14 new).

- [ ] **Step 3: Smoke-test the endpoint manually**

Start the API in the background: `dotnet run --project src/InterviewAssistant.Api` (or use an existing run). Then, with any small text-based PDF on disk:

```bash
curl -s -X POST http://localhost:5001/api/job-descriptions -F "file=@/path/to/some.pdf;type=application/pdf"
```

Expected: 201 with `{"id":"<guid>","fileName":"some.pdf","sizeBytes":...,"status":"parsed","uploadedAt":"..."}`. Then:

```bash
curl -s http://localhost:5001/api/job-descriptions/<id-from-above>
```

Expected: 200 including `"extractedText"`. Stop the API afterwards. (If no PDF is handy, skip — controller/store tests cover the logic; note the skip in the commit message.)

- [ ] **Step 4: Commit**

```bash
git add src/InterviewAssistant.Api/Program.cs
git commit -m "feat(KAN-3): register JD parsing and storage services"
```

---

### Task 6: Frontend types + jobDescriptionApi client

All frontend commands run from `src/web/`.

**Files:**
- Modify: `src/web/src/types/index.ts` (append)
- Create: `src/web/src/api/jobDescriptionApi.ts`
- Test: `src/web/src/api/jobDescriptionApi.test.ts`

- [ ] **Step 1: Add the shared type (manual backend contract)**

Append to `src/web/src/types/index.ts`:

```ts
export interface JobDescriptionUpload {
  id: string
  fileName: string
  sizeBytes: number
  status: string
  uploadedAt: string
}
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/web/src/api/jobDescriptionApi.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadJobDescription } from './jobDescriptionApi'
import { ApiError } from './interviewApi'
import type { JobDescriptionUpload } from '../types'

const mockUpload: JobDescriptionUpload = {
  id: 'abc-123',
  fileName: 'senior-jd.pdf',
  sizeBytes: 2048,
  status: 'parsed',
  uploadedAt: '2026-06-11T12:00:00Z',
}

function mockFetch(status: number, body: unknown) {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response)
}

beforeEach(() => vi.restoreAllMocks())

describe('uploadJobDescription', () => {
  it('POSTs multipart form data to /api/job-descriptions and returns parsed response', async () => {
    mockFetch(201, mockUpload)
    const file = new File(['%PDF-1.4'], 'senior-jd.pdf', { type: 'application/pdf' })

    const result = await uploadJobDescription(file)

    expect(result).toEqual(mockUpload)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/api/job-descriptions')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeInstanceOf(FormData)
  })

  it('throws ApiError with status on non-2xx response', async () => {
    mockFetch(422, { detail: 'unreadable' })
    const file = new File(['x'], 'scan.pdf', { type: 'application/pdf' })

    await expect(uploadJobDescription(file)).rejects.toBeInstanceOf(ApiError)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd src/web && npx vitest run src/api/jobDescriptionApi.test.ts`
Expected: FAIL — cannot resolve `./jobDescriptionApi`.

- [ ] **Step 4: Write the implementation**

```ts
// src/web/src/api/jobDescriptionApi.ts
import { ApiError } from './interviewApi'
import type { JobDescriptionUpload } from '../types'

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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd src/web && npx vitest run src/api/jobDescriptionApi.test.ts`
Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add src/web/src/types/index.ts src/web/src/api/jobDescriptionApi.ts src/web/src/api/jobDescriptionApi.test.ts
git commit -m "feat(KAN-3): add jobDescriptionApi client and JobDescriptionUpload type"
```

---

### Task 7: jdMatchReducer + JdMatchContext

**Files:**
- Create: `src/web/src/store/jdMatchReducer.ts`
- Create: `src/web/src/store/JdMatchContext.tsx`
- Test: `src/web/src/store/jdMatchReducer.test.ts`

- [ ] **Step 1: Write the failing reducer tests**

```ts
// src/web/src/store/jdMatchReducer.test.ts
import { describe, it, expect } from 'vitest'
import { jdMatchReducer, initialJdMatchState } from './jdMatchReducer'
import type { JobDescriptionUpload } from '../types'

const upload: JobDescriptionUpload = {
  id: 'abc-123',
  fileName: 'senior-jd.pdf',
  sizeBytes: 2048,
  status: 'parsed',
  uploadedAt: '2026-06-11T12:00:00Z',
}

describe('jdMatchReducer', () => {
  it('starts with no job description on step 1', () => {
    expect(initialJdMatchState).toEqual({ jobDescription: null, currentStep: 1 })
  })

  it('SET_JOB_DESCRIPTION stores the upload', () => {
    const state = jdMatchReducer(initialJdMatchState, {
      type: 'SET_JOB_DESCRIPTION',
      jobDescription: upload,
    })
    expect(state.jobDescription).toEqual(upload)
    expect(state.currentStep).toBe(1)
  })

  it('RESET returns to the initial state', () => {
    const populated = jdMatchReducer(initialJdMatchState, {
      type: 'SET_JOB_DESCRIPTION',
      jobDescription: upload,
    })
    expect(jdMatchReducer(populated, { type: 'RESET' })).toEqual(initialJdMatchState)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd src/web && npx vitest run src/store/jdMatchReducer.test.ts`
Expected: FAIL — cannot resolve `./jdMatchReducer`.

- [ ] **Step 3: Write the reducer and context**

```ts
// src/web/src/store/jdMatchReducer.ts
import type { JobDescriptionUpload } from '../types'

export type JdMatchAction =
  | { type: 'SET_JOB_DESCRIPTION'; jobDescription: JobDescriptionUpload }
  | { type: 'RESET' }

export interface JdMatchState {
  jobDescription: JobDescriptionUpload | null
  currentStep: number
}

export const initialJdMatchState: JdMatchState = { jobDescription: null, currentStep: 1 }

export function jdMatchReducer(state: JdMatchState, action: JdMatchAction): JdMatchState {
  switch (action.type) {
    case 'SET_JOB_DESCRIPTION':
      return { ...state, jobDescription: action.jobDescription }

    case 'RESET':
      return initialJdMatchState

    default:
      return state
  }
}
```

```tsx
// src/web/src/store/JdMatchContext.tsx
import { createContext, useContext, useEffect, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'
import { jdMatchReducer, initialJdMatchState } from './jdMatchReducer'
import type { JdMatchAction, JdMatchState } from './jdMatchReducer'

const STORAGE_KEY = 'jd-match:current'

interface JdMatchContextValue {
  state: JdMatchState
  dispatch: Dispatch<JdMatchAction>
}

const JdMatchContext = createContext<JdMatchContextValue | null>(null)

function loadInitialState(): JdMatchState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as JdMatchState) : initialJdMatchState
  } catch {
    return initialJdMatchState
  }
}

export function JdMatchProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(jdMatchReducer, undefined, loadInitialState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  return <JdMatchContext.Provider value={{ state, dispatch }}>{children}</JdMatchContext.Provider>
}

export function useJdMatch(): JdMatchContextValue {
  const ctx = useContext(JdMatchContext)
  if (!ctx) throw new Error('useJdMatch must be used within a JdMatchProvider')
  return ctx
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd src/web && npx vitest run src/store/jdMatchReducer.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/web/src/store/jdMatchReducer.ts src/web/src/store/JdMatchContext.tsx src/web/src/store/jdMatchReducer.test.ts
git commit -m "feat(KAN-3): add JdMatchContext store with localStorage persistence"
```

---

### Task 8: Generalize Stepper for custom steps

**Files:**
- Modify: `src/web/src/components/Stepper.tsx`
- Modify: `src/web/src/App.tsx:70` (onStepClick cast)
- Test: `src/web/src/components/Stepper.test.tsx` (append)

- [ ] **Step 1: Write the failing tests (append to the existing describe block)**

```tsx
  it('renders custom steps when the steps prop is provided', () => {
    const JD_STEPS: Array<[number, string]> = [
      [1, 'Upload JD'],
      [2, 'Analyze'],
      [3, 'Match Candidates'],
    ]
    render(<Stepper currentStep={1} steps={JD_STEPS} />)
    expect(screen.getByText('Upload JD')).toBeInTheDocument()
    expect(screen.getByText('Analyze')).toBeInTheDocument()
    expect(screen.getByText('Match Candidates')).toBeInTheDocument()
    expect(screen.queryByText('Resume Analysis')).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify the new one fails**

Run: `cd src/web && npx vitest run src/components/Stepper.test.tsx`
Expected: the new test FAILS (`steps` prop not accepted / default labels rendered); the existing 7 still pass.

- [ ] **Step 3: Generalize the component**

In `src/web/src/components/Stepper.tsx`, replace the constant and props:

```tsx
const DEFAULT_STEPS: Array<[number, string]> = [
  [1, 'Resume Analysis'],
  [2, 'Interview Plan'],
  [3, 'Live Session'],
  [4, 'Evaluation'],
]

interface StepperProps {
  currentStep: number
  steps?: Array<[number, string]>
  onStepClick?: (step: number) => void
}

export function Stepper({ currentStep, steps = DEFAULT_STEPS, onStepClick }: StepperProps) {
```

Inside the JSX, change `STEPS.map` to `steps.map` and `i < STEPS.length - 1` to `i < steps.length - 1`. Everything else stays.

In `src/web/src/App.tsx`, the `onStepClick` callback now receives `number`, so the dispatch needs a cast:

```tsx
<Stepper
  currentStep={step}
  onStepClick={(s) => dispatch({ type: 'SET_STEP', step: s as 1 | 2 | 3 | 4 })}
/>
```

- [ ] **Step 4: Run tests and type-check to verify**

Run: `cd src/web && npx vitest run src/components/Stepper.test.tsx && npx tsc --noEmit`
Expected: 8 passed, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/web/src/components/Stepper.tsx src/web/src/components/Stepper.test.tsx src/web/src/App.tsx
git commit -m "refactor(KAN-3): generalize Stepper to accept custom steps"
```

---

### Task 9: JdUploadStep dropzone component

**Files:**
- Create: `src/web/src/components/JdUploadStep.tsx`
- Test: `src/web/src/components/JdUploadStep.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/web/src/components/JdUploadStep.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { JdUploadStep } from './JdUploadStep'
import { JdMatchProvider } from '@/store/JdMatchContext'
import { ApiError } from '@/api/interviewApi'
import * as api from '@/api/jobDescriptionApi'
import type { JobDescriptionUpload } from '@/types'

vi.mock('@/api/jobDescriptionApi')

const mockUpload: JobDescriptionUpload = {
  id: 'abc-123',
  fileName: 'senior-jd.pdf',
  sizeBytes: 253952, // 248 KB
  status: 'parsed',
  uploadedAt: '2026-06-11T12:00:00Z',
}

function renderStep() {
  return render(
    <JdMatchProvider>
      <JdUploadStep />
    </JdMatchProvider>,
  )
}

function selectFile(file: File) {
  const input = screen.getByLabelText('Upload JD PDF', { selector: 'input' })
  fireEvent.change(input, { target: { files: [file] } })
}

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('JdUploadStep', () => {
  it('renders the dropzone with browse button and size hint', () => {
    renderStep()
    expect(screen.getByText('Drag & drop your JD PDF here')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Browse files' })).toBeInTheDocument()
    expect(screen.getByText(/PDF up to 10 MB/)).toBeInTheDocument()
  })

  it('rejects a non-PDF file without calling the API', () => {
    renderStep()
    selectFile(new File(['hello'], 'notes.txt', { type: 'text/plain' }))

    expect(screen.getByText('Only PDF files are supported.')).toBeInTheDocument()
    expect(api.uploadJobDescription).not.toHaveBeenCalled()
  })

  it('rejects a PDF over 10 MB without calling the API', () => {
    renderStep()
    const big = new File(['x'], 'big.pdf', { type: 'application/pdf' })
    Object.defineProperty(big, 'size', { value: 10 * 1024 * 1024 + 1 })
    selectFile(big)

    expect(screen.getByText('File exceeds the 10 MB limit.')).toBeInTheDocument()
    expect(api.uploadJobDescription).not.toHaveBeenCalled()
  })

  it('uploads a valid PDF and shows the parsed card with name, size, badge, and disabled CTA', async () => {
    vi.mocked(api.uploadJobDescription).mockResolvedValueOnce(mockUpload)
    renderStep()
    selectFile(new File(['%PDF-1.4'], 'senior-jd.pdf', { type: 'application/pdf' }))

    await waitFor(() => expect(screen.getByText('senior-jd.pdf')).toBeInTheDocument())
    expect(screen.getByText(/248 KB/)).toBeInTheDocument()
    expect(screen.getByText(/Parsed/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Analyze JD/ })).toBeDisabled()
  })

  it('shows the 422 message when the PDF has no readable text', async () => {
    vi.mocked(api.uploadJobDescription).mockRejectedValueOnce(new ApiError(422, 'unreadable'))
    renderStep()
    selectFile(new File(['%PDF-1.4'], 'scan.pdf', { type: 'application/pdf' }))

    await waitFor(() =>
      expect(
        screen.getByText("This PDF doesn't contain readable text. Try a text-based PDF."),
      ).toBeInTheDocument(),
    )
  })

  it('shows a generic message on server error', async () => {
    vi.mocked(api.uploadJobDescription).mockRejectedValueOnce(new ApiError(500, 'boom'))
    renderStep()
    selectFile(new File(['%PDF-1.4'], 'jd.pdf', { type: 'application/pdf' }))

    await waitFor(() =>
      expect(screen.getByText('Upload failed. Please try again.')).toBeInTheDocument(),
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd src/web && npx vitest run src/components/JdUploadStep.test.tsx`
Expected: FAIL — cannot resolve `./JdUploadStep`.

- [ ] **Step 3: Write the component**

```tsx
// src/web/src/components/JdUploadStep.tsx
import { useRef, useState } from 'react'
import { Upload, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useJdMatch } from '@/store/JdMatchContext'
import { uploadJobDescription } from '@/api/jobDescriptionApi'
import { ApiError } from '@/api/interviewApi'
import { LoadingSpinner } from '@/components/LoadingSpinner'

const MAX_SIZE_BYTES = 10 * 1024 * 1024

type UploadStatus = 'idle' | 'uploading' | 'error'

function validate(file: File): string | null {
  if (file.type !== 'application/pdf') return 'Only PDF files are supported.'
  if (file.size > MAX_SIZE_BYTES) return 'File exceeds the 10 MB limit.'
  return null
}

function mapError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400) return 'Please select a valid PDF file.'
    if (err.status === 413) return 'File exceeds the 10 MB limit.'
    if (err.status === 422) return "This PDF doesn't contain readable text. Try a text-based PDF."
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
      setErrorMessage(mapError(err))
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
            <Button disabled className="shrink-0 bg-indigo-600 disabled:opacity-50">
              Analyze JD →
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            SmartFitter will extract required skills, seniority and a JD quality score in the next step.
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd src/web && npx vitest run src/components/JdUploadStep.test.tsx`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/web/src/components/JdUploadStep.tsx src/web/src/components/JdUploadStep.test.tsx
git commit -m "feat(KAN-3): add JdUploadStep dropzone with validation and parsed card"
```

---

### Task 10: JdMatchFlow page + App/HomeScreen wiring

**Files:**
- Create: `src/web/src/pages/JdMatchFlow.tsx`
- Modify: `src/web/src/App.tsx` (view type, render branch)
- Modify: `src/web/src/pages/HomeScreen.tsx` (new entry button)
- Test: `src/web/src/pages/JdMatchFlow.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/web/src/pages/JdMatchFlow.test.tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JdMatchFlow } from './JdMatchFlow'
import { JdMatchProvider } from '@/store/JdMatchContext'

beforeEach(() => localStorage.clear())

describe('JdMatchFlow', () => {
  it('renders the header, the 3-step stepper with Upload JD active, and the dropzone', () => {
    render(
      <JdMatchProvider>
        <JdMatchFlow />
      </JdMatchProvider>,
    )
    expect(screen.getByText('New JD Match')).toBeInTheDocument()
    expect(screen.getByText('Upload JD')).toBeInTheDocument()
    expect(screen.getByText('Analyze')).toBeInTheDocument()
    expect(screen.getByText('Match Candidates')).toBeInTheDocument()
    expect(screen.getByText('Drag & drop your JD PDF here')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd src/web && npx vitest run src/pages/JdMatchFlow.test.tsx`
Expected: FAIL — cannot resolve `./JdMatchFlow`.

- [ ] **Step 3: Write the page and wire it up**

```tsx
// src/web/src/pages/JdMatchFlow.tsx
import { Stepper } from '@/components/Stepper'
import { JdUploadStep } from '@/components/JdUploadStep'
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
    </div>
  )
}
```

In `src/web/src/App.tsx`:

1. Add imports:

```tsx
import { JdMatchProvider } from '@/store/JdMatchContext'
import { JdMatchFlow } from '@/pages/JdMatchFlow'
```

2. Widen the view type: `type View = 'home' | 'wizard' | 'jdMatch'`

3. Replace the home/wizard ternary with a three-way branch (Navbar back button shows for both non-home views):

```tsx
<Navbar onBack={view !== 'home' ? handleBackToHome : undefined} />
{view === 'home' && (
  <HomeScreen onNew={handleNew} onLoad={handleLoad} onNewJdMatch={() => setView('jdMatch')} />
)}
{view === 'jdMatch' && (
  <JdMatchProvider>
    <JdMatchFlow />
  </JdMatchProvider>
)}
{view === 'wizard' && (
  <>
    <Stepper
      currentStep={step}
      onStepClick={(s) => dispatch({ type: 'SET_STEP', step: s as 1 | 2 | 3 | 4 })}
    />
    <div className="mt-8">
      {step === 1 && <AnalyzeStep />}
      {step === 2 && <PlanStep />}
      {step === 3 && <SessionStep />}
      {step === 4 && <EvaluationStep onBackToHome={handleBackToHome} />}
    </div>
  </>
)}
```

In `src/web/src/pages/HomeScreen.tsx`, extend the props and header buttons:

```tsx
interface HomeScreenProps {
  onNew: () => void
  onLoad: (id: string) => void
  onNewJdMatch: () => void
}

export function HomeScreen({ onNew, onLoad, onNewJdMatch }: HomeScreenProps) {
```

and replace the single header button with:

```tsx
<div className="flex items-center gap-2">
  <Button
    variant="outline"
    onClick={onNewJdMatch}
    className="border-indigo-500/40 text-indigo-400 hover:text-indigo-300"
  >
    + New JD Match
  </Button>
  <Button onClick={onNew} className="bg-indigo-600 hover:bg-indigo-700">
    + New Interview
  </Button>
</div>
```

- [ ] **Step 4: Run the full frontend suite and type-check**

Run: `cd src/web && npm test && npx tsc --noEmit`
Expected: all tests pass (existing + new), no type errors. If existing `Navbar`/`HomeScreen` tests break on the new prop, update their render calls to pass `onNewJdMatch={() => {}}`.

- [ ] **Step 5: Commit**

```bash
git add src/web/src/pages/JdMatchFlow.tsx src/web/src/pages/JdMatchFlow.test.tsx src/web/src/App.tsx src/web/src/pages/HomeScreen.tsx
git commit -m "feat(KAN-3): add New JD Match flow with upload step"
```

---

### Task 11: Full verification

- [ ] **Step 1: Backend suite + build**

Run: `dotnet build && dotnet test tests/InterviewAssistant.Api.Tests/`
Expected: build succeeds, all tests pass.

- [ ] **Step 2: Frontend suite + production build**

Run: `cd src/web && npm test && npm run build`
Expected: all tests pass, build succeeds.

- [ ] **Step 3: Manual end-to-end check (acceptance criteria)**

Start both servers (`dotnet run --project src/InterviewAssistant.Api` and `cd src/web && npm run dev`), open `http://localhost:5173`:

1. Click "+ New JD Match" → "New JD Match" page shows with stepper "1 Upload JD" active.
2. Drag or browse a small text-based PDF → file name, size, and "✓ Parsed" badge appear; "Analyze JD →" is visible and disabled.
3. Try a `.txt` file → "Only PDF files are supported." and no network request (check devtools).
4. Refresh the page and re-enter JD Match → the parsed card is still there (localStorage).

- [ ] **Step 4: Commit any fixes, then hand off**

If verification surfaced fixes, commit them. The branch is ready for the superpowers:finishing-a-development-branch skill (PR per repo convention).
