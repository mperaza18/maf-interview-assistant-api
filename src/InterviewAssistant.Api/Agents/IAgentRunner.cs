using Microsoft.Agents.AI;

namespace InterviewAssistant.Api.Agents;

public interface IAgentRunner
{
    Task<(T Value, string Raw)> RunJsonAsync<T>(
        AIAgent agent,
        string prompt,
        CancellationToken ct = default);
}
