using InterviewAssistant.Api.Controllers;
using InterviewAssistant.Api.Models;
using InterviewAssistant.Api.Requests;
using InterviewAssistant.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using UglyToad.PdfPig.Fonts.Standard14Fonts;
using UglyToad.PdfPig.Writer;

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
            Mock.Of<ILogger<InterviewController>>(),
            Mock.Of<IConfiguration>());
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

public class InterviewControllerAnalyzePdfTests
{
    private readonly Mock<IInterviewService> _service = new();
    private readonly string _tempDir =
        Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

    private InterviewController CreateController()
    {
        var config = new Mock<IConfiguration>();
        config.Setup(c => c["ResumeStorage:Path"]).Returns(_tempDir);
        return new InterviewController(
            _service.Object,
            Mock.Of<ILogger<InterviewController>>(),
            config.Object);
    }

    private static byte[] CreatePdfWithText(string text)
    {
        var builder = new PdfDocumentBuilder();
        var page = builder.AddPage(612, 792);
        var font = builder.AddStandard14Font(Standard14Font.Helvetica);
        page.AddText(text, 12, new UglyToad.PdfPig.Core.PdfPoint(100, 700), font);
        return builder.Build();
    }

    private static byte[] CreateEmptyPagePdf()
    {
        var builder = new PdfDocumentBuilder();
        builder.AddPage(612, 792);
        return builder.Build();
    }

    private static Mock<IFormFile> CreateMockPdfFile(byte[] bytes, string name = "resume.pdf")
    {
        var mock = new Mock<IFormFile>();
        mock.Setup(f => f.ContentType).Returns("application/pdf");
        mock.Setup(f => f.FileName).Returns(name);
        mock.Setup(f => f.CopyToAsync(
                It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .Callback<Stream, CancellationToken>(
                async (s, _) => await s.WriteAsync(bytes))
            .Returns(Task.CompletedTask);
        return mock;
    }

    [Fact]
    public async Task AnalyzePdf_NullFile_Returns400()
    {
        var result = await CreateController()
            .AnalyzePdf(null, "Engineer", CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task AnalyzePdf_WrongMimeType_Returns400()
    {
        var mock = new Mock<IFormFile>();
        mock.Setup(f => f.ContentType).Returns("text/plain");

        var result = await CreateController()
            .AnalyzePdf(mock.Object, "Engineer", CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task AnalyzePdf_ValidPdf_Returns200WithAnalysisResult()
    {
        var profile = new ResumeProfile { CandidateName = "Jane" };
        var seniority = new SeniorityAssessment { Level = "Senior" };
        _service
            .Setup(s => s.AnalyzeResumeAsync(
                It.IsAny<string>(), "Engineer", It.IsAny<CancellationToken>()))
            .ReturnsAsync((profile, seniority));

        var pdfBytes = CreatePdfWithText("Jane Doe Senior Software Engineer");
        var result = await CreateController()
            .AnalyzePdf(CreateMockPdfFile(pdfBytes).Object, "Engineer", CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<AnalyzeResumeResponse>(ok.Value);
        Assert.Equal("Jane", response.Profile.CandidateName);
        Assert.Equal("Senior", response.Seniority.Level);

        if (Directory.Exists(_tempDir)) Directory.Delete(_tempDir, recursive: true);
    }

    [Fact]
    public async Task AnalyzePdf_EmptyPagePdf_Returns422()
    {
        var pdfBytes = CreateEmptyPagePdf();
        var result = await CreateController()
            .AnalyzePdf(CreateMockPdfFile(pdfBytes).Object, "Engineer", CancellationToken.None);

        Assert.IsType<UnprocessableEntityObjectResult>(result);

        if (Directory.Exists(_tempDir)) Directory.Delete(_tempDir, recursive: true);
    }

    [Fact]
    public async Task AnalyzePdf_FileReadThrowsIOException_Returns500()
    {
        var mock = new Mock<IFormFile>();
        mock.Setup(f => f.ContentType).Returns("application/pdf");
        mock.Setup(f => f.FileName).Returns("resume.pdf");
        mock.Setup(f => f.CopyToAsync(
                It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new IOException("disk full"));

        var result = await CreateController()
            .AnalyzePdf(mock.Object, "Engineer", CancellationToken.None);

        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status500InternalServerError, statusResult.StatusCode);
    }
}
