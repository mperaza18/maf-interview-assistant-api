using InterviewAssistant.Api.Models;
using InterviewAssistant.Api.Requests;
using InterviewAssistant.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace InterviewAssistant.Api.Controllers;

[ApiController]
[Route("api/interview")]
[Produces("application/json")]
public sealed class InterviewController : ControllerBase
{
    private readonly IInterviewService _service;
    private readonly ILogger<InterviewController> _logger;

    public InterviewController(IInterviewService service, ILogger<InterviewController> logger)
    {
        _service = service;
        _logger = logger;
    }

    // ─── POST /api/interview/analyze ──────────────────────────────────────────

    /// <summary>
    /// Ingests a resume and classifies candidate seniority.
    /// Returns a ResumeProfile and a SeniorityAssessment.
    /// </summary>
    [HttpPost("analyze")]
    [ProducesResponseType(typeof(AnalyzeResumeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Analyze(
        [FromBody] AnalyzeResumeRequest request,
        CancellationToken ct)
    {
        _logger.LogInformation("Analyzing resume for role: {Role}", request.Role);

        var (profile, seniority) = await _service.AnalyzeResumeAsync(request.ResumeText, request.Role, ct);

        return Ok(new AnalyzeResumeResponse { Profile = profile, Seniority = seniority });
    }

    // ─── POST /api/interview/plan ─────────────────────────────────────────────

    /// <summary>
    /// Generates an interview plan.
    /// Use mode="simple" (default) for a direct agent call, or mode="workflow"
    /// to run the full agent graph (requires ResumeText to be set).
    /// </summary>
    [HttpPost("plan")]
    [ProducesResponseType(typeof(InterviewPlan), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GeneratePlan(
        [FromBody] GeneratePlanRequest request,
        CancellationToken ct)
    {
        _logger.LogInformation("Generating plan — mode: {Mode}, role: {Role}", request.Mode, request.Role);

        InterviewPlan plan;

        if (request.Mode.Equals("workflow", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(request.ResumeText))
                return BadRequest(ProblemDetailsFor("ResumeText is required when mode=workflow."));

            plan = await _service.GeneratePlanWorkflowAsync(request.ResumeText, request.Role, ct);
        }
        else
        {
            plan = await _service.GeneratePlanAsync(request.Profile, request.Seniority, request.Role, ct);
        }

        return Ok(plan);
    }

    // ─── POST /api/interview/plan/revise ─────────────────────────────────────

    /// <summary>
    /// Revises an existing interview plan based on one-sentence feedback.
    /// </summary>
    [HttpPost("plan/revise")]
    [ProducesResponseType(typeof(InterviewPlan), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> RevisePlan(
        [FromBody] RevisePlanRequest request,
        CancellationToken ct)
    {
        _logger.LogInformation("Revising plan — feedback: {Feedback}", request.Feedback);

        var revised = await _service.RevisePlanAsync(request.Plan, request.Feedback, ct);
        return Ok(revised);
    }

    // ─── POST /api/interview/evaluate ─────────────────────────────────────────

    /// <summary>
    /// Evaluates a candidate given their profile, the interview plan, and interviewer notes.
    /// </summary>
    [HttpPost("evaluate")]
    [ProducesResponseType(typeof(EvaluationResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> Evaluate(
        [FromBody] EvaluateRequest request,
        CancellationToken ct)
    {
        _logger.LogInformation("Evaluating candidate: {Name}", request.Profile.CandidateName);

        var evaluation = await _service.EvaluateAsync(request.Profile, request.Plan, request.Notes, ct);
        return Ok(evaluation);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static ProblemDetails ProblemDetailsFor(string detail) => new()
    {
        Title = "Bad Request",
        Detail = detail,
        Status = StatusCodes.Status400BadRequest
    };
}
