namespace InterviewAssistant.Api.Services;

/// <summary>Extracts normalized plain text from a Job Description PDF.</summary>
public interface IJdParsingService
{
    /// <summary>Returns the extracted text, or an empty string if the PDF has no readable text.</summary>
    string ExtractText(byte[] pdfBytes);
}
