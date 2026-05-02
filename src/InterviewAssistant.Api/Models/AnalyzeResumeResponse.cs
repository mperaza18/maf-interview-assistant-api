namespace InterviewAssistant.Api.Models;

public sealed class AnalyzeResumeResponse
{
    public ResumeProfile Profile { get; set; } = new();
    public SeniorityAssessment Seniority { get; set; } = new();
}
