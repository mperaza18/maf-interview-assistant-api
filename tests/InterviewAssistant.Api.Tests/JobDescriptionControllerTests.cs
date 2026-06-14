using InterviewAssistant.Api.Controllers;
using InterviewAssistant.Api.Models;
using InterviewAssistant.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;

namespace InterviewAssistant.Api.Tests;

public class JobDescriptionControllerTests
{
    private readonly Mock<IJdParsingService> _parser = new();
    private readonly Mock<IJobDescriptionStore> _store = new();
    private readonly Mock<IJdAnalysisService> _analysisService = new();

    private JobDescriptionController CreateController() => new(
        _parser.Object,
        _store.Object,
        _analysisService.Object,
        Mock.Of<ILogger<JobDescriptionController>>());

    private static Mock<IFormFile> CreateMockPdfFile(
        long length = 1234,
        string contentType = "application/pdf",
        string name = "jd.pdf")
    {
        var mock = new Mock<IFormFile>();
        mock.Setup(f => f.ContentType).Returns(contentType);
        mock.Setup(f => f.FileName).Returns(name);
        mock.Setup(f => f.Length).Returns(length);
        mock.Setup(f => f.CopyToAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        return mock;
    }

    [Fact]
    public async Task Upload_NullFile_Returns400()
    {
        var result = await CreateController().Upload(null, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Upload_WrongContentType_Returns400()
    {
        var file = CreateMockPdfFile(contentType: "text/plain");

        var result = await CreateController().Upload(file.Object, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Upload_FileOver10Mb_Returns400()
    {
        var file = CreateMockPdfFile(length: 10 * 1024 * 1024 + 1);

        var result = await CreateController().Upload(file.Object, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Upload_UnreadablePdf_Returns422()
    {
        _parser.Setup(p => p.ExtractText(It.IsAny<byte[]>())).Returns(string.Empty);
        var file = CreateMockPdfFile();

        var result = await CreateController().Upload(file.Object, CancellationToken.None);

        Assert.IsType<UnprocessableEntityObjectResult>(result);
        _store.Verify(
            s => s.SaveAsync(It.IsAny<JobDescription>(), It.IsAny<byte[]>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Upload_ValidPdf_Returns201WithMetadata()
    {
        _parser.Setup(p => p.ExtractText(It.IsAny<byte[]>())).Returns("Senior .NET Engineer");
        var file = CreateMockPdfFile(length: 2048, name: "senior-jd.pdf");

        var result = await CreateController().Upload(file.Object, CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        var response = Assert.IsType<JobDescriptionUploadResponse>(created.Value);
        Assert.False(string.IsNullOrEmpty(response.Id));
        Assert.Equal("senior-jd.pdf", response.FileName);
        Assert.Equal(2048, response.SizeBytes);
        Assert.Equal("parsed", response.Status);
        Assert.NotEqual(default, response.UploadedAt);
        _store.Verify(
            s => s.SaveAsync(
                It.Is<JobDescription>(jd => jd.ExtractedText == "Senior .NET Engineer"),
                It.IsAny<byte[]>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task GetById_KnownId_Returns200WithExtractedText()
    {
        var id = Guid.NewGuid().ToString();
        _store.Setup(s => s.GetAsync(id, It.IsAny<CancellationToken>()))
              .ReturnsAsync(new JobDescription
              {
                  Id = id,
                  FileName = "jd.pdf",
                  SizeBytes = 2048,
                  ExtractedText = "Senior .NET Engineer",
                  UploadedAtUtc = DateTimeOffset.UtcNow,
                  Status = "parsed"
              });

        var result = await CreateController().GetById(id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<JobDescriptionDetailResponse>(ok.Value);
        Assert.Equal(id, response.Id);
        Assert.Equal("jd.pdf", response.FileName);
        Assert.Equal(2048, response.SizeBytes);
        Assert.Equal("Senior .NET Engineer", response.ExtractedText);
        Assert.Equal("parsed", response.Status);
    }

    [Fact]
    public async Task GetById_UnknownId_Returns404()
    {
        _store.Setup(s => s.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync((JobDescription?)null);

        var result = await CreateController().GetById(Guid.NewGuid().ToString(), CancellationToken.None);

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        Assert.IsType<ProblemDetails>(notFound.Value);
    }

    [Fact]
    public async Task GetById_NonGuidId_Returns404WithoutHittingStore()
    {
        var result = await CreateController().GetById("../etc/passwd", CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(result);
        _store.Verify(s => s.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Analyze_ValidIdAndJdFound_Returns200WithResult()
    {
        var id = Guid.NewGuid().ToString();
        var jd = new JobDescription { Id = id, ExtractedText = "Senior .NET Engineer" };
        var analysis = new JdAnalysisResult { Score = 85, Seniority = "Senior" };
        _store.Setup(s => s.GetAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(jd);
        _analysisService
            .Setup(a => a.AnalyzeAsync("Senior .NET Engineer", It.IsAny<CancellationToken>()))
            .ReturnsAsync(analysis);

        var result = await CreateController().Analyze(id, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<JdAnalysisResult>(ok.Value);
        Assert.Equal(85, response.Score);
        Assert.Equal("Senior", response.Seniority);
        _store.Verify(
            s => s.SaveAnalysisAsync(id, analysis, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Analyze_NonGuidId_Returns404WithoutHittingStore()
    {
        var result = await CreateController().Analyze("not-a-guid", CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(result);
        _store.Verify(s => s.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Analyze_JdNotFound_Returns404WithoutCallingService()
    {
        _store.Setup(s => s.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
              .ReturnsAsync((JobDescription?)null);

        var result = await CreateController().Analyze(Guid.NewGuid().ToString(), CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(result);
        _analysisService.Verify(
            a => a.AnalyzeAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
