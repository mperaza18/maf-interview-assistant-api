# Interview Assistant — REST API

ASP.NET Core Web API (.NET 9) wrapping the [Microsoft Agent Framework Interview Assistant](https://github.com/mperaza18/maf-interview-assistant-demo) console demo.

---

## Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/interview/analyze` | Resume text → `ResumeProfile` + `SeniorityAssessment` |
| `POST` | `/api/interview/plan` | Profile + seniority + role → `InterviewPlan` |
| `POST` | `/api/interview/plan/revise` | Plan + feedback → revised `InterviewPlan` |
| `POST` | `/api/interview/evaluate` | Profile + plan + notes → `EvaluationResult` |

Swagger UI is available at `http://localhost:5000` in Development mode.

---

## Configuration

Fill in `src/InterviewAssistant.Api/appsettings.Development.json` (or set env vars):

```json
{
  "AzureOpenAI": {
    "Endpoint": "https://<your-resource>.openai.azure.com/",
    "Deployment": "gpt-4o-mini",
    "ApiKey": "<optional — omit to use Azure CLI auth>"
  }
}
```

Environment variable equivalents (useful for CI/CD):

## Mac/ Linux

```bash
export AzureOpenAI__Endpoint="<https://resource.openai.azure.com>"
export AzureOpenAI__Deployment="<deployment-name>"
export AzureOpenAI__ApiKey="<your-key>"
```

List all env variables

```bash
# Displays all environment variables currently set for your shell session
printenv
```

## Windows

```bash
setx AzureOpenAI__Endpoint="<https://resource.openai.azure.com>"
setx AzureOpenAI__Deployment="<deployment-name>"
setx AzureOpenAI__ApiKey="<your-key>"
```


---

## Run locally

```bash
cd src/InterviewAssistant.Api
dotnet run
```

Then open `http://localhost:5000` for the Swagger UI.

---

## Example workflow

```bash
# 1. Analyze resume
curl -s -X POST http://localhost:5000/api/interview/analyze \
  -H "Content-Type: application/json" \
  -d '{"resumeText": "Jane Doe, 8 years ...", "role": "Software Engineer"}' \
  | tee analyze.json

# 2. Generate plan (pass profile + seniority from step 1)
curl -s -X POST http://localhost:5000/api/interview/plan \
  -H "Content-Type: application/json" \
  -d "{\"profile\": $(jq .profile analyze.json), \"seniority\": $(jq .seniority analyze.json), \"role\": \"Software Engineer\"}" \
  | tee plan.json

# 3. Optionally revise
curl -s -X POST http://localhost:5000/api/interview/plan/revise \
  -H "Content-Type: application/json" \
  -d "{\"plan\": $(cat plan.json), \"feedback\": \"more system design, fewer trivia\"}"

# 4. Evaluate
curl -s -X POST http://localhost:5000/api/interview/evaluate \
  -H "Content-Type: application/json" \
  -d "{\"profile\": $(jq .profile analyze.json), \"plan\": $(cat plan.json), \"notes\": \"Strong on distributed systems, struggled with SQL.\"}"
```

---

## Testing

```bash
# Unit tests — no Azure credentials needed, runs in CI
dotnet test tests/InterviewAssistant.Api.Tests/

# Unit tests with coverage report
dotnet test tests/InterviewAssistant.Api.Tests/ \
  --collect:"XPlat Code Coverage" \
  --results-directory ./coverage

# Integration tests — requires appsettings.Development.json with real Azure config
dotnet test tests/InterviewAssistant.Api.IntegrationTests/ \
  --filter "Category=Integration" \
  --logger "console;verbosity=normal"
```

---

## Project structure

```
src/InterviewAssistant.Api/
├── Agents/                  ← AgentFactory, AgentPrompts, JsonAgentRunner
├── Controllers/             ← InterviewController (4 endpoints)
├── Models/                  ← ResumeProfile, SeniorityAssessment, InterviewPlan, EvaluationResult
├── Requests/                ← Request DTOs
├── Services/                ← InterviewService (business logic)
├── Workflows/               ← InterviewWorkflowRunner
├── Program.cs               ← App startup, DI, Swagger
└── appsettings.json
```
