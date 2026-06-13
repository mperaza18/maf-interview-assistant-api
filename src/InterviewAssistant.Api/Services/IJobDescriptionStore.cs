using InterviewAssistant.Api.Models;

namespace InterviewAssistant.Api.Services;

/// <summary>Persists uploaded Job Descriptions (PDF, extracted text, metadata).</summary>
public interface IJobDescriptionStore
{
    Task SaveAsync(JobDescription jobDescription, byte[] pdfBytes, CancellationToken ct);
    Task<JobDescription?> GetAsync(string id, CancellationToken ct);
}
