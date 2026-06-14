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
