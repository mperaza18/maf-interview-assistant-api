using System.Text.Json.Serialization;

namespace InterviewAssistant.Api.Models;

public sealed class JobDescriptionDetailResponse
{
    [JsonPropertyName("id")] public string Id { get; set; } = "";
    [JsonPropertyName("fileName")] public string FileName { get; set; } = "";
    [JsonPropertyName("sizeBytes")] public long SizeBytes { get; set; }
    [JsonPropertyName("status")] public string Status { get; set; } = "";
    [JsonPropertyName("uploadedAt")] public DateTimeOffset UploadedAt { get; set; }
    [JsonPropertyName("extractedText")] public string ExtractedText { get; set; } = "";
}
