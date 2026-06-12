using InterviewAssistant.Api.Models;
using InterviewAssistant.Api.Services;
using Microsoft.Extensions.Configuration;
using Moq;

namespace InterviewAssistant.Api.Tests;

public class FileSystemJobDescriptionStoreTests : IDisposable
{
    private readonly string _tempDir =
        Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());

    private FileSystemJobDescriptionStore CreateStore()
    {
        var config = new Mock<IConfiguration>();
        config.Setup(c => c["JobDescriptionStorage:Path"]).Returns(_tempDir);
        return new FileSystemJobDescriptionStore(config.Object);
    }

    private static JobDescription SampleJd() => new()
    {
        Id = Guid.NewGuid().ToString(),
        FileName = "senior-dotnet-engineer-jd.pdf",
        SizeBytes = 1234,
        ExtractedText = "Senior .NET Engineer required",
        UploadedAtUtc = DateTimeOffset.UtcNow,
        Status = "parsed"
    };

    [Fact]
    public async Task SaveAsync_WritesPdfTextAndMetadata()
    {
        var store = CreateStore();
        var jd = SampleJd();

        await store.SaveAsync(jd, new byte[] { 1, 2, 3 }, CancellationToken.None);

        var dir = Path.Combine(_tempDir, jd.Id);
        Assert.True(File.Exists(Path.Combine(dir, "original.pdf")));
        Assert.True(File.Exists(Path.Combine(dir, "extracted.txt")));
        Assert.True(File.Exists(Path.Combine(dir, "metadata.json")));
        Assert.Equal("Senior .NET Engineer required",
            await File.ReadAllTextAsync(Path.Combine(dir, "extracted.txt")));
    }

    [Fact]
    public async Task GetAsync_AfterSave_RoundTripsMetadata()
    {
        var store = CreateStore();
        var jd = SampleJd();
        await store.SaveAsync(jd, new byte[] { 1 }, CancellationToken.None);

        var loaded = await store.GetAsync(jd.Id, CancellationToken.None);

        Assert.NotNull(loaded);
        Assert.Equal(jd.Id, loaded!.Id);
        Assert.Equal(jd.FileName, loaded.FileName);
        Assert.Equal(jd.SizeBytes, loaded.SizeBytes);
        Assert.Equal(jd.ExtractedText, loaded.ExtractedText);
        Assert.Equal(jd.UploadedAtUtc, loaded.UploadedAtUtc);
        Assert.Equal("parsed", loaded.Status);
    }

    [Fact]
    public async Task GetAsync_UnknownId_ReturnsNull()
    {
        var store = CreateStore();

        var loaded = await store.GetAsync(Guid.NewGuid().ToString(), CancellationToken.None);

        Assert.Null(loaded);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir)) Directory.Delete(_tempDir, recursive: true);
    }
}
