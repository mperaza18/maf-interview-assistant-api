using System.Text;
using System.Text.Json;
using InterviewAssistant.Api.Agents;
using InterviewAssistant.Api.Models;
using InterviewAssistant.Api.Workflows;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;

namespace InterviewAssistant.Api.Services;

public sealed class InterviewService : IInterviewService
{
    private readonly AIAgent _ingestionAgent;
    private readonly AIAgent _seniorityAgent;
    private readonly AIAgent _plannerAgent;
    private readonly AIAgent _evaluatorAgent;
    private readonly IAgentRunner _runner;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = false
    };

    public InterviewService(IConfiguration config, IAgentRunner runner)
    {
        _runner = runner;
        _ingestionAgent = AgentFactory.CreateAzureOpenAIAgent("ResumeIngestion", AgentPrompts.ResumeIngestion, config);
        _seniorityAgent = AgentFactory.CreateAzureOpenAIAgent("SeniorityClassifier", AgentPrompts.SeniorityClassifier, config);
        _plannerAgent = AgentFactory.CreateAzureOpenAIAgent("InterviewPlanner", AgentPrompts.InterviewPlanner, config);
        _evaluatorAgent = AgentFactory.CreateAzureOpenAIAgent("Evaluator", AgentPrompts.Evaluator, config);
    }

    // ─── Analyze ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Step 1+2: Ingest resume → ResumeProfile, then classify → SeniorityAssessment.
    /// </summary>
    public async Task<(ResumeProfile Profile, SeniorityAssessment Seniority)> AnalyzeResumeAsync(
        string resumeText,
        string role,
        CancellationToken ct = default)
    {
        var ingestPrompt = $"{AgentPrompts.ResumeIngestion}\n\nRESUME:\n{resumeText}";
        var (profile, _) = await _runner.RunJsonAsync<ResumeProfile>(_ingestionAgent, ingestPrompt, ct);

        var seniorityPrompt = $"{AgentPrompts.SeniorityClassifier}\n\nRESUME_PROFILE:\n{Serialize(profile)}";
        var (seniority, _) = await _runner.RunJsonAsync<SeniorityAssessment>(_seniorityAgent, seniorityPrompt, ct);

        return (profile, seniority);
    }

    // ─── Plan (simple mode) ───────────────────────────────────────────────────

    /// <summary>
    /// Step 3 (simple): Generate an InterviewPlan from profile + seniority + role.
    /// </summary>
    public async Task<InterviewPlan> GeneratePlanAsync(
        ResumeProfile profile,
        SeniorityAssessment seniority,
        string role,
        CancellationToken ct = default)
    {
        var planPrompt = new StringBuilder()
            .AppendLine(AgentPrompts.InterviewPlanner)
            .AppendLine()
            .AppendLine("ROLE:")
            .AppendLine(role)
            .AppendLine()
            .AppendLine("RESUME_PROFILE:")
            .AppendLine(Serialize(profile))
            .AppendLine()
            .AppendLine("SENIORITY:")
            .AppendLine(Serialize(seniority))
            .ToString();

        var (plan, _) = await _runner.RunJsonAsync<InterviewPlan>(_plannerAgent, planPrompt, ct);
        return plan;
    }

    // ─── Plan (workflow mode) ─────────────────────────────────────────────────

    /// <summary>
    /// Step 3 (workflow): Run the full agent graph (ingest → classify → plan) in one shot.
    /// </summary>
    public async Task<InterviewPlan> GeneratePlanWorkflowAsync(
        string resumeText,
        string role,
        CancellationToken ct = default)
    {
        var input = new ChatMessage(ChatRole.User,
            $"Target role: {role}\n\nRESUME:\n{resumeText}\n\n" +
            "First extract a ResumeProfile JSON, then classify seniority, then produce an InterviewPlan JSON.");

        var (plannerRaw, _) = await InterviewWorkflowRunner.RunPlanWorkflowAsync(
            _ingestionAgent, _seniorityAgent, _plannerAgent, input, ct);

        var (plan, _) = await _runner.RunJsonAsync<InterviewPlan>(
            _plannerAgent,
            $"Reformat this EXACT content as a single valid InterviewPlan JSON (no markdown):\n\n{plannerRaw}",
            ct);

        return plan;
    }

    // ─── Revise ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Revise an existing InterviewPlan based on one-sentence feedback.
    /// </summary>
    public async Task<InterviewPlan> RevisePlanAsync(
        InterviewPlan plan,
        string feedback,
        CancellationToken ct = default)
    {
        var revisePrompt = $"""
Revise the InterviewPlan JSON below based on this feedback.
Feedback: {feedback}

Return ONLY valid InterviewPlan JSON.

{Serialize(plan)}
""";

        var (revised, _) = await _runner.RunJsonAsync<InterviewPlan>(_plannerAgent, revisePrompt, ct);
        return revised;
    }

    // ─── Evaluate ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Evaluate a candidate given their profile, the interview plan, and interviewer notes.
    /// </summary>
    public async Task<EvaluationResult> EvaluateAsync(
        ResumeProfile profile,
        InterviewPlan plan,
        string notes,
        CancellationToken ct = default)
    {
        var effectiveNotes = string.IsNullOrWhiteSpace(notes)
            ? "- (no notes provided; evaluate based on resume + plan only)"
            : notes;

        var evalPrompt = new StringBuilder()
            .AppendLine(AgentPrompts.Evaluator)
            .AppendLine()
            .AppendLine("RESUME_PROFILE:")
            .AppendLine(Serialize(profile))
            .AppendLine()
            .AppendLine("INTERVIEW_PLAN:")
            .AppendLine(Serialize(plan))
            .AppendLine()
            .AppendLine("INTERVIEW_NOTES:")
            .AppendLine(effectiveNotes)
            .ToString();

        var (evaluation, _) = await _runner.RunJsonAsync<EvaluationResult>(_evaluatorAgent, evalPrompt, ct);
        return evaluation;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static string Serialize<T>(T value) =>
        JsonSerializer.Serialize(value, _jsonOptions);
}
