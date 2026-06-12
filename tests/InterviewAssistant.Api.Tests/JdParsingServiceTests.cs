using InterviewAssistant.Api.Services;
using UglyToad.PdfPig.Fonts.Standard14Fonts;
using UglyToad.PdfPig.Writer;

namespace InterviewAssistant.Api.Tests;

public class JdParsingServiceTests
{
    private readonly IJdParsingService _service = new JdParsingService();

    private static byte[] CreatePdfWithText(params string[] pageTexts)
    {
        var builder = new PdfDocumentBuilder();
        var font = builder.AddStandard14Font(Standard14Font.Helvetica);
        foreach (var text in pageTexts)
        {
            var page = builder.AddPage(612, 792);
            page.AddText(text, 12, new UglyToad.PdfPig.Core.PdfPoint(100, 700), font);
        }
        return builder.Build();
    }

    private static byte[] CreateEmptyPagePdf()
    {
        var builder = new PdfDocumentBuilder();
        builder.AddPage(612, 792);
        return builder.Build();
    }

    [Fact]
    public void ExtractText_TextPdf_ReturnsWords()
    {
        var pdf = CreatePdfWithText("Senior .NET Engineer required");

        var text = _service.ExtractText(pdf);

        Assert.Contains("Senior", text);
        Assert.Contains("Engineer", text);
    }

    [Fact]
    public void ExtractText_MultiPagePdf_JoinsPagesWithNewline()
    {
        var pdf = CreatePdfWithText("Page one text", "Page two text");

        var text = _service.ExtractText(pdf);

        Assert.Contains("Page one text\nPage two text", text);
    }

    [Fact]
    public void ExtractText_EmptyPagePdf_ReturnsEmpty()
    {
        var pdf = CreateEmptyPagePdf();

        var text = _service.ExtractText(pdf);

        Assert.Equal(string.Empty, text);
    }

    [Fact]
    public void ExtractText_NonPdfBytes_ReturnsEmpty()
    {
        var notAPdf = "This is plain text, not a PDF."u8.ToArray();

        var text = _service.ExtractText(notAPdf);

        Assert.Equal(string.Empty, text);
    }
}
