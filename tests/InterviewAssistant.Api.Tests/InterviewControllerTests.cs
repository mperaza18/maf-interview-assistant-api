using InterviewAssistant.Api.Controllers;
using InterviewAssistant.Api.Models;
using InterviewAssistant.Api.Requests;
using InterviewAssistant.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace InterviewAssistant.Api.Tests;

public class InterviewControllerTests
{
    private readonly Mock<IInterviewService> _service;
    private readonly InterviewController _controller;

    public InterviewControllerTests()
    {
        _service = new Mock<IInterviewService>();
        _controller = new InterviewController(
            _service.Object,
            Mock.Of<ILogger<InterviewController>>());
    }

    [Fact]
    public async Task Analyze_Returns200_WithProfileAndSeniority()
    {
        var profile = new ResumeProfile { CandidateName = "Jane" };
        var seniority = new SeniorityAssessment { Level = "Senior" };
        _service.Setup(s => s.AnalyzeResumeAsync("resume text", "Engineer", It.IsAny<CancellationToken>()))
                .ReturnsAsync((profile, seniority));

        var result = await _controller.Analyze(
            new AnalyzeResumeRequest { ResumeText = "resume text", Role = "Engineer" },
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AnalyzeResumeResponse>(ok.Value);
        Assert.Equal("Jane", response.Profile.CandidateName);
        Assert.Equal("Senior", response.Seniority.Level);
    }

    [Fact]
    public async Task GeneratePlan_WorkflowMode_WithoutResumeText_Returns400()
    {
        var result = await _controller.GeneratePlan(
            new GeneratePlanRequest { Mode = "workflow", ResumeText = null },
            CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GeneratePlan_SimpleMode_Returns200()
    {
        var plan = new InterviewPlan { Role = "Engineer" };
        _service.Setup(s => s.GeneratePlanAsync(
                    It.IsAny<ResumeProfile>(),
                    It.IsAny<SeniorityAssessment>(),
                    "Engineer",
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(plan);

        var result = await _controller.GeneratePlan(
            new GeneratePlanRequest { Mode = "simple", Role = "Engineer" },
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var responsePlan = Assert.IsType<InterviewPlan>(ok.Value);
        Assert.Equal("Engineer", responsePlan.Role);
    }

    [Fact]
    public async Task RevisePlan_Returns200_WithRevisedPlan()
    {
        var revised = new InterviewPlan { Role = "Engineer", Summary = "Revised" };
        _service.Setup(s => s.RevisePlanAsync(
                    It.IsAny<InterviewPlan>(),
                    "more depth",
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(revised);

        var result = await _controller.RevisePlan(
            new RevisePlanRequest { Plan = new InterviewPlan(), Feedback = "more depth" },
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<InterviewPlan>(ok.Value);
        Assert.Equal("Revised", response.Summary);
    }

    [Fact]
    public async Task Evaluate_Returns200_WithEvaluationResult()
    {
        var evaluation = new EvaluationResult { OverallScore = 8, Recommendation = "Hire" };
        _service.Setup(s => s.EvaluateAsync(
                    It.IsAny<ResumeProfile>(),
                    It.IsAny<InterviewPlan>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()))
                .ReturnsAsync(evaluation);

        var result = await _controller.Evaluate(
            new EvaluateRequest
            {
                Profile = new ResumeProfile(),
                Plan = new InterviewPlan(),
                Notes = ""
            },
            CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<EvaluationResult>(ok.Value);
        Assert.Equal(8, response.OverallScore);
        Assert.Equal("Hire", response.Recommendation);
    }
}
