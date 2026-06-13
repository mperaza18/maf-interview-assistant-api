using System.Text.Json.Serialization;

namespace InterviewAssistant.Api.Models;

public sealed class JobDescription
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("fileName")] public string FileName { get; set; } = "";
    [JsonPropertyName("sizeBytes")] public long SizeBytes { get; set; }
    [JsonPropertyName("extractedText")] public string ExtractedText { get; set; } = "";
    [JsonPropertyName("uploadedAtUtc")] public DateTimeOffset UploadedAtUtc { get; set; }
    [JsonPropertyName("status")] public string Status { get; set; } = "parsed";
}
