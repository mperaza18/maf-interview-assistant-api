using InterviewAssistant.Api.Agents;
using InterviewAssistant.Api.Models;
using InterviewAssistant.Api.Services;
using Microsoft.Agents.AI;
using Microsoft.Extensions.Configuration;
using Moq;

namespace InterviewAssistant.Api.Tests;

public class JdAnalysisServiceTests
{
    private readonly Mock<IAgentRunner> _runner;
    private readonly IJdAnalysisService _service;

    public JdAnalysisServiceTests()
    {
        _runner = new Mock<IAgentRunner>();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AzureOpenAI:Endpoint"]   = "https://fake.openai.azure.com/",
                ["AzureOpenAI:Deployment"] = "fake-deployment",
                ["AzureOpenAI:ApiKey"]     = "fake-key"
            })
            .Build();

        _service = new JdAnalysisService(config, _runner.Object);
    }

    [Fact]
    public async Task AnalyzeAsync_ReturnsDeserializedResult()
    {
        var expected = new JdAnalysisResult
        {
            Score = 85,
            Seniority = "Senior",
            MustHave = ["C#", ".NET"],
            NiceToHave = ["Docker"],
            Summary = "Backend role.",
            Confidence = 0.9f
        };

        _runner.Setup(r => r.RunJsonAsync<JdAnalysisResult>(
                It.IsAny<AIAgent>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .ReturnsAsync((expected, "{}"));

        var result = await _service.AnalyzeAsync("Senior .NET Engineer wanted.");

        Assert.Equal(85, result.Score);
        Assert.Equal("Senior", result.Seniority);
        Assert.Equal(new[] { "C#", ".NET" }, result.MustHave);
    }

    [Fact]
    public async Task AnalyzeAsync_PassesExtractedTextAsPrompt()
    {
        string capturedPrompt = "";

        _runner.Setup(r => r.RunJsonAsync<JdAnalysisResult>(
                It.IsAny<AIAgent>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .Callback<AIAgent, string, CancellationToken>((_, prompt, _) => capturedPrompt = prompt)
               .ReturnsAsync((new JdAnalysisResult { Score = 70 }, "{}"));

        await _service.AnalyzeAsync("Looking for a senior .NET engineer.");

        Assert.Contains("Looking for a senior .NET engineer.", capturedPrompt);
    }

    [Fact]
    public async Task AnalyzeAsync_WhenRunnerThrows_PropagatesException()
    {
        _runner.Setup(r => r.RunJsonAsync<JdAnalysisResult>(
                It.IsAny<AIAgent>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .ThrowsAsync(new InvalidOperationException("Agent returned non-JSON"));

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _service.AnalyzeAsync("Some JD text."));
    }
}
