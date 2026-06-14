using InterviewAssistant.Api.Models;

namespace InterviewAssistant.Api.Services;

public interface IJdAnalysisService
{
    Task<JdAnalysisResult> AnalyzeAsync(string extractedText, CancellationToken ct = default);
}
