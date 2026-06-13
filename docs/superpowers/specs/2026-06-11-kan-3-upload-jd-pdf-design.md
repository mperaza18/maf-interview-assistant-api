# KAN-3 — Upload & ingest Job Description PDF: Design

**Ticket:** [KAN-3](https://miguelperaza18.atlassian.net/browse/KAN-3) (parent: KAN-19 — JD Analysis & Smart Candidate Matching)
**Branch:** `feat/kan-3-upload-jd-pdf`
**Design reference:** [Figma — Interview Assistant UI Redesign, frame "JD Matching — Upload JD"](https://www.figma.com/design/mXasWj8lUQdu8aneORFiaN/Interview-Assistant-%E2%80%94-UI-Redesign?node-id=103-2)

## Problem

SmartFitter has no way to ingest a Job Description. Without a parsed JD there is
nothing to analyze requirements against or match candidates to. This ticket builds
the entry point of the JD Matching flow: upload a JD PDF, persist it, extract its
text, and show the parsed state in the UI.

## Decisions made during brainstorming

1. **Separate JD Matching flow.** Upload JD is step 1 of a new 3-step flow
   (Upload JD → Analyze → Match Candidates), entered from the HomeScreen. The
   existing 4-step interview wizard is untouched.
2. **Filesystem persistence**, following the existing resume-upload pattern
   (`POST /api/interview/analyze-pdf` saves to a configurable disk path and
   extracts text with PdfPig), but with parsing moved into a dedicated service
   and storage behind an interface.
3. **Upload screen only.** The Figma frame shows a full app-shell redesign with a
   left sidebar; that is out of scope and tracked separately as
   [KAN-24](https://miguelperaza18.atlassian.net/browse/KAN-24). KAN-3 builds the
   New JD Match page inside the current shell (top navbar, centered layout).
4. **"Analyze JD →" CTA is rendered but disabled.** The analyze step is the next
   KAN-19 ticket.
5. **JD state lives in a new `JdMatchContext`**, not the existing
   `SessionContext` — JD matching is job-centric, interview sessions are
   candidate-centric. (The ticket listed `src/web/src/context/SessionContext.tsx`
   with "confirm path"; the actual session store is `src/web/src/store/` and we
   confirmed a separate store is the right boundary.)

## Backend

New files in `src/InterviewAssistant.Api/`:

### Models/JobDescription.cs

| Field | Type | Notes |
|---|---|---|
| `Id` | `string` | GUID, generated server-side |
| `FileName` | `string` | Original upload name (sanitized) |
| `SizeBytes` | `long` | |
| `ExtractedText` | `string` | Normalized plain text |
| `UploadedAtUtc` | `DateTimeOffset` | |
| `Status` | `string` | `"parsed"` (only value for now) |

### Services/JdParsingService.cs (`IJdParsingService`)

`string ExtractText(byte[] pdfBytes)` using **PdfPig** (already a project
dependency). Joins words with spaces within a page, pages with newlines, and
normalizes whitespace. Returns an empty string for image-only/scanned PDFs so
the controller can reject with 422.

### Services/FileSystemJobDescriptionStore.cs (`IJobDescriptionStore`)

- `Task SaveAsync(JobDescription jd, byte[] pdfBytes, CancellationToken ct)`
- `Task<JobDescription?> GetAsync(string id, CancellationToken ct)`

Layout on disk: `{root}/{id}/original.pdf`, `{root}/{id}/extracted.txt`,
`{root}/{id}/metadata.json`. Root comes from config key
`JobDescriptionStorage:Path`, defaulting to
`~/AI Smart Fitter/JobDescriptions` (same convention as `ResumeStorage:Path`).

### Controllers/JobDescriptionController.cs — route `api/job-descriptions`

**`POST /api/job-descriptions`** (multipart/form-data, field `file`):

- 400 (`ProblemDetails`) if the file is missing, not `application/pdf`, or
  larger than 10 MB (`[RequestSizeLimit]` plus explicit length check).
- 422 if no text can be extracted (scanned/image-only PDF).
- 201 with `Location` header and body
  `{ id, fileName, sizeBytes, status, uploadedAt }`. Extracted text is **not**
  echoed back.

**`GET /api/job-descriptions/{id}`**:

- 200 with the metadata **plus** `extractedText` — this satisfies the
  acceptance criterion that extracted text remain available for analysis, and
  is the surface the KAN-19 analyze ticket will consume.
- 404 if the id is unknown.

Registration in `Program.cs`: `IJdParsingService` and `IJobDescriptionStore` as
singletons, consistent with existing services. The existing
`InterviewController.AnalyzePdf` is left as-is (consolidating it onto
`JdParsingService` is out of scope).

## Frontend

All under `src/web/src/`:

- **`App.tsx`** — view type becomes `'home' | 'wizard' | 'jdMatch'`;
  `JdMatchFlow` rendered for the new view, wrapped in `JdMatchProvider`.
- **`pages/HomeScreen.tsx`** — add a "New JD Match" action next to the existing
  new-session action.
- **`pages/JdMatchFlow.tsx`** (new) — "New JD Match" header + subtitle (per
  Figma), 3-step stepper with step 1 active, renders `JdUploadStep`.
- **`components/Stepper.tsx`** — generalized with an optional
  `steps: Array<[number, string]>` prop defaulting to the current four interview
  steps; step type widens from `1 | 2 | 3 | 4` to `number`. Interview wizard
  behavior unchanged.
- **`components/JdUploadStep.tsx`** (new) — dropzone with drag & drop and
  "Browse files" (dashed border, upload icon, "PDF up to 10 MB" hint, per
  Figma). Client-side validation runs **before** any network call: non-PDF or
  >10 MB shows an inline error and does not upload. On success shows a
  "Recently Uploaded" card: file name, size, "Parsed ✓" badge, disabled
  "Analyze JD →" CTA.
- **`api/jobDescriptionApi.ts`** (new) — `uploadJobDescription(file: File)`
  POSTs multipart to `/api/job-descriptions`; reuses `ApiError` from
  `interviewApi.ts`.
- **`types/index.ts`** — add `JobDescriptionUpload`
  (`{ id, fileName, sizeBytes, status, uploadedAt }`) mirroring the backend
  response (manual contract, same as the other types).
- **`store/JdMatchContext.tsx`** and **`store/jdMatchReducer.ts`** (new) —
  context + reducer holding
  `{ jobDescription?: JobDescriptionUpload, currentStep: number }`, persisted
  to localStorage under `jd-match:current` so a refresh keeps the uploaded
  state. Same split as `SessionContext.tsx` / `sessionReducer.ts`, scaled down.

## Error handling

| Failure | Where caught | UX |
|---|---|---|
| Non-PDF file | Client | Inline dropzone error, no upload, "Try another file" reset |
| >10 MB | Client (and server 400 as backstop) | Inline error "File exceeds the 10 MB limit" |
| Server 400 | `JdUploadStep` | "Please select a valid PDF file." |
| Server 422 | `JdUploadStep` | "This PDF doesn't contain readable text. Try a text-based PDF." |
| Network/5xx | `JdUploadStep` | "Upload failed. Please try again." |

Backend failures all return RFC 7807 `ProblemDetails`, consistent with the
existing controllers.

## Testing

**Backend** (xUnit, `tests/InterviewAssistant.Api.Tests/`, no Azure
credentials needed):

- `JdParsingService`: extracts text from a small text-based PDF fixture;
  returns empty for image-only input.
- `FileSystemJobDescriptionStore`: save/get round-trip against a temp
  directory; `GetAsync` returns null for unknown id.
- `JobDescriptionController` (fake parser + store): 400 no file / wrong
  content type / oversize; 422 empty extraction; 201 response shape +
  Location; GET 200 with text; GET 404.

**Frontend** (Vitest + Testing Library, `src/web/`):

- `JdUploadStep`: invalid file rejected without API call; uploading state;
  parsed card with name/size/badge on success; status→message mapping;
  disabled CTA.
- `jobDescriptionApi`: success and `ApiError` paths.
- `Stepper`: renders custom steps prop; default steps unchanged.
- `jdMatchReducer`: upload-success and reset transitions.

## Acceptance criteria → design mapping

| Criterion | Covered by |
|---|---|
| Drag/select valid PDF uploads and shows name, size, "Parsed" | `JdUploadStep` + `POST /api/job-descriptions` |
| Non-PDF or >10 MB shows clear error and is not uploaded | Client-side validation in `JdUploadStep` |
| Backend persists file, returns id, text available for analysis | `FileSystemJobDescriptionStore` + `GET /api/job-descriptions/{id}` |
| Stepper shows "1 Upload JD" active | `JdMatchFlow` + generalized `Stepper` |

## Out of scope

- Sidebar app-shell redesign → [KAN-24](https://miguelperaza18.atlassian.net/browse/KAN-24)
- JD analysis (step 2) and candidate matching (step 3) → later KAN-19 tickets
- Refactoring `InterviewController.AnalyzePdf` onto the new parsing service
- Listing/deleting previously uploaded JDs
