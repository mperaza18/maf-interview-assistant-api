using System.Text.Json.Serialization;

namespace InterviewAssistant.Api.Models;

public sealed class JdAnalysisResult
{
    [JsonPropertyName("score")]      public int Score { get; set; }
    [JsonPropertyName("seniority")]  public string Seniority { get; set; } = "";
    [JsonPropertyName("mustHave")]   public string[] MustHave { get; set; } = [];
    [JsonPropertyName("niceToHave")] public string[] NiceToHave { get; set; } = [];
    [JsonPropertyName("summary")]    public string Summary { get; set; } = "";
    [JsonPropertyName("confidence")] public float Confidence { get; set; }
}
