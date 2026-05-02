using InterviewAssistant.Api.Models;

namespace InterviewAssistant.Api.Services;

public interface IInterviewService
{
    Task<(ResumeProfile Profile, SeniorityAssessment Seniority)> AnalyzeResumeAsync(
        string resumeText, string role, CancellationToken ct = default);

    Task<InterviewPlan> GeneratePlanAsync(
        ResumeProfile profile, SeniorityAssessment seniority, string role, CancellationToken ct = default);

    Task<InterviewPlan> GeneratePlanWorkflowAsync(
        string resumeText, string role, CancellationToken ct = default);

    Task<InterviewPlan> RevisePlanAsync(
        InterviewPlan plan, string feedback, CancellationToken ct = default);

    Task<EvaluationResult> EvaluateAsync(
        ResumeProfile profile, InterviewPlan plan, string notes, CancellationToken ct = default);
}
