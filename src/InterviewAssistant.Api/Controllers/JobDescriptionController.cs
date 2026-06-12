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

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var pdfBytes = ms.ToArray();

        var extractedText = _parser.ExtractText(pdfBytes);
        if (string.IsNullOrWhiteSpace(extractedText))
            return UnprocessableEntity(ProblemDetailsFor(
                "Could not extract text from the PDF. The file may be scanned or image-only.",
                StatusCodes.Status422UnprocessableEntity));

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

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static ProblemDetails ProblemDetailsFor(
        string detail, int status = StatusCodes.Status400BadRequest) => new()
    {
        Title = status switch
        {
            StatusCodes.Status422UnprocessableEntity => "Unprocessable Entity",
            _ => "Bad Request"
        },
        Detail = detail,
        Status = status
    };

    private static ProblemDetails NotFoundProblem(string id) => new()
    {
        Title = "Not Found",
        Detail = $"No job description found with id '{id}'.",
        Status = StatusCodes.Status404NotFound
    };
}
