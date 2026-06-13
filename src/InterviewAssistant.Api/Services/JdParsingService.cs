using UglyToad.PdfPig;

namespace InterviewAssistant.Api.Services;

public sealed class JdParsingService : IJdParsingService
{
    public string ExtractText(byte[] pdfBytes)
    {
        try
        {
            using var doc = PdfDocument.Open(pdfBytes);

            var pages = doc.GetPages()
                .Select(p => string.Join(" ", p.GetWords().Select(w => w.Text)))
                .Where(t => !string.IsNullOrWhiteSpace(t));

            return string.Join("\n", pages).Trim();
        }
        catch (Exception ex) when (ex is not OutOfMemoryException)
        {
            // Corrupt or spoofed PDFs (e.g. non-PDF bytes with a PDF content type)
            // are "no readable text" per the interface contract, not server errors.
            return string.Empty;
        }
    }
}
