using InterviewAssistant.Api.Agents;
using InterviewAssistant.Api.Models;
using InterviewAssistant.Api.Services;
using Microsoft.Agents.AI;
using Microsoft.Extensions.Configuration;
using Moq;

namespace InterviewAssistant.Api.Tests;

public class InterviewServiceTests
{
    private readonly Mock<IAgentRunner> _runner;
    private readonly IInterviewService _service;

    public InterviewServiceTests()
    {
        _runner = new Mock<IAgentRunner>();

        // Fake Azure config — values are well-formed but never used
        // (IAgentRunner is mocked so agent.RunAsync() is never called)
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AzureOpenAI:Endpoint"]   = "https://fake.openai.azure.com/",
                ["AzureOpenAI:Deployment"] = "fake-deployment",
                ["AzureOpenAI:ApiKey"]     = "fake-key"
            })
            .Build();

        _service = new InterviewService(config, _runner.Object);
    }

    [Fact]
    public async Task AnalyzeResumeAsync_CallsIngestionThenSeniority_InOrder()
    {
        var callOrder = new List<string>();

        _runner.Setup(r => r.RunJsonAsync<ResumeProfile>(
                    It.IsAny<AIAgent>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .Callback<AIAgent, string, CancellationToken>((_, _, _) => callOrder.Add("ingestion"))
               .ReturnsAsync((new ResumeProfile { CandidateName = "Jane" }, "{}"));

        _runner.Setup(r => r.RunJsonAsync<SeniorityAssessment>(
                    It.IsAny<AIAgent>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .Callback<AIAgent, string, CancellationToken>((_, _, _) => callOrder.Add("seniority"))
               .ReturnsAsync((new SeniorityAssessment { Level = "Senior" }, "{}"));

        var (profile, seniority) = await _service.AnalyzeResumeAsync("resume text", "Engineer");

        Assert.Equal(new[] { "ingestion", "seniority" }, callOrder);
        Assert.Equal("Jane", profile.CandidateName);
        Assert.Equal("Senior", seniority.Level);
    }

    [Fact]
    public async Task GeneratePlanAsync_IncludesRoleProfileSeniorityInPrompt()
    {
        var profile = new ResumeProfile { CandidateName = "Jane" };
        var seniority = new SeniorityAssessment { Level = "Senior" };
        string capturedPrompt = "";

        _runner.Setup(r => r.RunJsonAsync<InterviewPlan>(
                    It.IsAny<AIAgent>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .Callback<AIAgent, string, CancellationToken>((_, prompt, _) => capturedPrompt = prompt)
               .ReturnsAsync((new InterviewPlan { Role = "Engineer" }, "{}"));

        await _service.GeneratePlanAsync(profile, seniority, "Engineer");

        Assert.Contains("Engineer", capturedPrompt);
        Assert.Contains("\"candidateName\":\"Jane\"", capturedPrompt);
        Assert.Contains("\"level\":\"Senior\"", capturedPrompt);
    }

    [Fact]
    public async Task RevisePlanAsync_IncludesFeedbackInPrompt()
    {
        var plan = new InterviewPlan { Role = "Engineer" };
        string capturedPrompt = "";

        _runner.Setup(r => r.RunJsonAsync<InterviewPlan>(
                    It.IsAny<AIAgent>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .Callback<AIAgent, string, CancellationToken>((_, prompt, _) => capturedPrompt = prompt)
               .ReturnsAsync((new InterviewPlan { Role = "Engineer" }, "{}"));

        await _service.RevisePlanAsync(plan, "more system design");

        Assert.Contains("more system design", capturedPrompt);
    }

    [Fact]
    public async Task EvaluateAsync_EmptyNotes_UsesPlaceholder()
    {
        var profile = new ResumeProfile { CandidateName = "Jane" };
        var plan = new InterviewPlan { Role = "Engineer" };
        string capturedPrompt = "";

        _runner.Setup(r => r.RunJsonAsync<EvaluationResult>(
                    It.IsAny<AIAgent>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
               .Callback<AIAgent, string, CancellationToken>((_, prompt, _) => capturedPrompt = prompt)
               .ReturnsAsync((new EvaluationResult { OverallScore = 8 }, "{}"));

        await _service.EvaluateAsync(profile, plan, "   ");

        Assert.Contains("(no notes provided", capturedPrompt);
    }
}
