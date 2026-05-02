using InterviewAssistant.Api.Agents;
using InterviewAssistant.Api.Models;

namespace InterviewAssistant.Api.Tests;

public class JsonAgentRunnerTests
{
    [Fact]
    public void ParseJson_ValidJson_ReturnsDeserializedValue()
    {
        var json = """{"candidateName":"Jane","confidence":0}""";

        var (value, raw) = JsonAgentRunner.ParseJson<ResumeProfile>(json);

        Assert.Equal("Jane", value.CandidateName);
        Assert.Equal(json, raw);
    }

    [Fact]
    public void ParseJson_InvalidJson_ThrowsInvalidOperationException()
    {
        var ex = Assert.Throws<InvalidOperationException>(
            () => JsonAgentRunner.ParseJson<ResumeProfile>("not json at all"));

        Assert.Contains("not json at all", ex.Message);
    }

    [Fact]
    public void ParseJson_JsonWithTrailingComma_Succeeds()
    {
        var json = """{"candidateName":"Jane",}""";

        var (value, _) = JsonAgentRunner.ParseJson<ResumeProfile>(json);

        Assert.Equal("Jane", value.CandidateName);
    }
}
