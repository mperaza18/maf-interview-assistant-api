using System.Text.Json;
using InterviewAssistant.Api.Models;
using Microsoft.Extensions.Configuration;

namespace InterviewAssistant.Api.Services;

/// <summary>
/// Stores each Job Description under {root}/{id}/ as original.pdf,
/// extracted.txt, and metadata.json. Root is configurable via
/// "JobDescriptionStorage:Path" (same convention as "ResumeStorage:Path").
/// </summary>
public sealed class FileSystemJobDescriptionStore : IJobDescriptionStore
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    private readonly string _root;

    public FileSystemJobDescriptionStore(IConfiguration configuration)
    {
        _root = configuration["JobDescriptionStorage:Path"]
            ?? Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                "AI Smart Fitter", "JobDescriptions");
    }

    public async Task SaveAsync(JobDescription jobDescription, byte[] pdfBytes, CancellationToken ct)
    {
        var dir = Path.Combine(_root, jobDescription.Id);
        Directory.CreateDirectory(dir);

        // metadata.json is written last: a record without it is treated as missing
        // by GetAsync, so an interrupted save never surfaces as corrupted data.
        await File.WriteAllBytesAsync(Path.Combine(dir, "original.pdf"), pdfBytes, ct);
        await File.WriteAllTextAsync(Path.Combine(dir, "extracted.txt"), jobDescription.ExtractedText, ct);
        await File.WriteAllTextAsync(
            Path.Combine(dir, "metadata.json"),
            JsonSerializer.Serialize(jobDescription, JsonOptions), ct);
    }

    public async Task<JobDescription?> GetAsync(string id, CancellationToken ct)
    {
        var metadataPath = Path.Combine(_root, id, "metadata.json");
        try
        {
            var json = await File.ReadAllTextAsync(metadataPath, ct);
            return JsonSerializer.Deserialize<JobDescription>(json);
        }
        catch (Exception ex) when (ex is FileNotFoundException or DirectoryNotFoundException)
        {
            return null;
        }
    }

    public async Task SaveAnalysisAsync(string id, JdAnalysisResult result, CancellationToken ct)
    {
        var dir = Path.Combine(_root, id);
        Directory.CreateDirectory(dir);

        var path = Path.Combine(dir, "analysis.json");
        var json = JsonSerializer.Serialize(result, JsonOptions);
        await File.WriteAllTextAsync(path, json, ct);
    }
}
