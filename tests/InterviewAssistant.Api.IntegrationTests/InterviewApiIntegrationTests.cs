using System.Net;
using System.Net.Http.Json;
using InterviewAssistant.Api.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace InterviewAssistant.Api.IntegrationTests;

public class InterviewApiIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public InterviewApiIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.WithWebHostBuilder(builder =>
            builder.UseEnvironment("Development"))
            .CreateClient();
    }

    [Fact, Trait("Category", "Integration")]
    public async Task Analyze_WithRealResume_Returns200()
    {
        var request = new
        {
            ResumeText = "Jane Doe. 8 years .NET experience. Led teams of 5. Skills: C#, Azure, SQL.",
            Role = "Senior Software Engineer"
        };

        var response = await _client.PostAsJsonAsync("/api/interview/analyze", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<AnalyzeResumeResponse>();
        Assert.NotNull(body?.Profile);
        Assert.NotNull(body?.Seniority);
    }

    [Fact, Trait("Category", "Integration")]
    public async Task GeneratePlan_SimpleMode_Returns200()
    {
        var request = new
        {
            Profile = new ResumeProfile { CandidateName = "Jane", YearsExperience = 8.0 },
            Seniority = new SeniorityAssessment { Level = "Senior", Confidence = 0.9 },
            Role = "Software Engineer",
            Mode = "simple"
        };

        var response = await _client.PostAsJsonAsync("/api/interview/plan", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<InterviewPlan>();
        Assert.NotNull(body);
        Assert.NotEmpty(body!.Rounds);
    }

    [Fact, Trait("Category", "Integration")]
    public async Task GeneratePlan_WorkflowMode_Returns200()
    {
        var request = new
        {
            ResumeText = "Jane Doe. 8 years .NET experience. Led teams of 5.",
            Role = "Software Engineer",
            Mode = "workflow"
        };

        var response = await _client.PostAsJsonAsync("/api/interview/plan", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<InterviewPlan>();
        Assert.NotNull(body);
        Assert.NotEmpty(body!.Rounds);
    }

    [Fact, Trait("Category", "Integration")]
    public async Task RevisePlan_Returns200_WithChangedPlan()
    {
        var request = new
        {
            Plan = new InterviewPlan
            {
                Role = "Software Engineer",
                Level = "Senior",
                Summary = "Standard plan",
                Rounds = new List<InterviewRound>
                {
                    new() { Name = "Coding", DurationMinutes = 60, Questions = new() { "Write fizzbuzz" } }
                }
            },
            Feedback = "Add more system design questions"
        };

        var response = await _client.PostAsJsonAsync("/api/interview/plan/revise", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<InterviewPlan>();
        Assert.NotNull(body);
        Assert.NotEmpty(body!.Rounds);
    }

    [Fact, Trait("Category", "Integration")]
    public async Task Evaluate_Returns200_WithScore()
    {
        var request = new
        {
            Profile = new ResumeProfile { CandidateName = "Jane", YearsExperience = 8.0 },
            Plan = new InterviewPlan
            {
                Role = "Software Engineer",
                Level = "Senior",
                Summary = "Standard plan",
                Rounds = new List<InterviewRound>
                {
                    new() { Name = "Coding", DurationMinutes = 60, Questions = new() { "Write fizzbuzz" } }
                }
            },
            Notes = "Candidate solved all problems efficiently and communicated well."
        };

        var response = await _client.PostAsJsonAsync("/api/interview/evaluate", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<EvaluationResult>();
        Assert.True(body!.OverallScore > 0);
    }
}
