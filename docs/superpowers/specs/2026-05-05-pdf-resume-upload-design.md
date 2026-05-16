# PDF Resume Upload — Design Spec

**Jira:** KAN-1  
**Date:** 2026-05-05  
**Status:** Approved

## Summary

Replace the manual resume text textarea in Step 1 (Analyze Resume) with a PDF upload button. Selecting a PDF automatically saves it server-side, extracts its text, and runs the existing AI analysis — all in one round trip. The GK sees a status indicator (green check on success, red X on failure) and can retry with a different file if something goes wrong.

## Architecture & Components

### Backend

**New endpoint:** `POST /api/interview/analyze-pdf`  
Added to the existing `InterviewController`. Accepts `multipart/form-data` with two fields:
- `file` — the PDF file
- `role` — target role string (e.g. "Software Engineer")

**Responsibility of the action:**
1. Validate that a file was provided and that it is a PDF (`application/pdf` MIME type)
2. Save the file to `C:\AI Smart Fitter\Resumes\{originalFilename}` (create directory if it doesn't exist; overwrite if the file already exists)
3. Open the saved file with **PdfPig** (`UglyToad.PdfPig` NuGet, MIT license) and concatenate all page words into a plain-text string
4. Call the existing `_service.AnalyzeResumeAsync(extractedText, role, ct)` 
5. Return `AnalyzeResumeResponse` (same shape as the existing `/analyze` endpoint)

PDF I/O and text extraction live in the controller action — not in `InterviewService`, which is reserved for AI agent operations.

**No changes to existing endpoints.** The JSON-based `POST /api/interview/analyze` remains untouched.

### Frontend

**Modified file:** `src/web/src/pages/AnalyzeStep.tsx`
- Remove `<Textarea>` and `resumeText` state
- Add a hidden `<input type="file" accept=".pdf" />` triggered by a visible upload button
- Add upload status state: `'idle' | 'uploading' | 'success' | 'error'`
- On file selection (`onChange`): automatically call `analyzeResumePdf(file, role)` — no separate "Analyze" button click needed
- Render status indicator based on state (see UI States below)

**Modified file:** `src/web/src/api/interviewApi.ts`
- Add `analyzeResumePdf(file: File, role: string): Promise<AnalyzeResumeResponse>`
- Uses `FormData` and `fetch` without manually setting `Content-Type` (browser sets the multipart boundary automatically)
- Endpoint: `POST /api/interview/analyze-pdf`

## Data Flow

```
GK selects PDF → file input onChange fires
  → AnalyzeStep sets status: 'uploading', calls analyzeResumePdf(file, role)
    → POST /api/interview/analyze-pdf  (multipart: file + role)
      → controller saves PDF to C:\AI Smart Fitter\Resumes\{originalFilename}
        ├─ save fails → 500 → frontend: status 'error', red X, retry available
        → PdfPig extracts text from saved file
          ├─ empty/unreadable → 422 → frontend: status 'error', red X, retry available
          → _service.AnalyzeResumeAsync(extractedText, role, ct)
            → returns AnalyzeResumeResponse
              → frontend: status 'success', green check, dispatch LOAD_SESSION, show results
```

**File naming:** original filename is preserved as-is. Existing files with the same name are overwritten.

## UI States

| State | UI |
|---|---|
| `idle` | Upload button only |
| `uploading` | Button disabled + spinner |
| `success` | PDF icon + green check + analysis results panel (same panel as today) |
| `error` | PDF icon + red X + error message + "Try another file" link (resets to `idle`) |

The `role` input field remains unchanged alongside the upload button.

## Error Handling

### Backend — HTTP status codes

| Failure | HTTP | ProblemDetails message |
|---|---|---|
| No file or non-PDF MIME type | 400 | "A PDF file is required." |
| Directory or disk write fails | 500 | "Failed to save the resume file." |
| PDF has no extractable text (scanned/image-only) | 422 | "Could not extract text from the PDF. The file may be scanned or image-only." |

AI analysis errors (OpenAI timeout, JSON parse failure) continue to surface as 500 via the existing error middleware in `Program.cs` — no change needed.

### Frontend — user-facing messages

| HTTP status | Message shown |
|---|---|
| 400 | "Please select a valid PDF file." |
| 422 | "This PDF doesn't contain readable text. Try a text-based PDF." |
| Any other | "Upload failed. Please try again." |

In all error cases: PDF icon + red X + message + "Try another file" link that resets state to `idle` and clears the file input ref so the GK can pick a new file.

## Testing

### Backend (xUnit — `tests/InterviewAssistant.Api.Tests/`)

- Happy path: mock `IFormFile` with a valid in-memory PDF → assert `200 OK` + correct `AnalyzeResumeResponse` shape
- No file submitted → assert `400`
- File submitted with wrong MIME type → assert `400`
- PDF with no extractable words → assert `422`
- Directory write throws `IOException` → assert `500`

PdfPig is used directly against a real in-memory PDF stream — no mocking of the library needed.

### Frontend (Vitest + Testing Library — `src/web/src/`)

- `<Textarea>` is not rendered; file input is present
- Selecting a valid PDF triggers `analyzeResumePdf` and shows the spinner
- On success response: green check + analysis results panel visible
- On 422 response: red X + correct message + "Try another file" resets state to `idle`
- `analyzeResumePdf` unit test: verifies `FormData` is used (not JSON body) and the correct endpoint path is called

## Out of Scope

- AC4 (Send PDF content to OpenAI) is marked TBD in the ticket. The extracted text is already passed to the existing OpenAI-backed `AnalyzeResumeAsync`, so this is effectively satisfied — but no changes to agent prompts are included in this spec.
- PDF versioning or deduplication of saved files
- Support for non-PDF resume formats (DOCX, etc.)
- OCR for scanned PDFs
