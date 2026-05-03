# Design: CLAUDE.md Working with Claude Section + Custom Slash Commands
Generated: 2026-05-02

## Scope

Two independent improvements from the Mastering-Claude-Code validation report (items 5 and 6):

1. Add a `## Working with Claude` section to `CLAUDE.md`
2. Create `.claude/commands/` with 4 project-specific slash commands

---

## Point 5 — `## Working with Claude` section

### What

Append a new section to the end of `CLAUDE.md` with workflow rules for collaborating with Claude on this project.

### Content

```markdown
## Working with Claude

- Before significant changes, ask Claude to generate a plan first.
- Always create a feature branch; never commit directly to `main`.
- Run `dotnet build` to verify changes before committing.
- Azure CLI must be installed and logged in if no `ApiKey` is set.
```

### Constraints

- Append only — no changes to existing sections.
- No formatting changes to the rest of the file.

---

## Point 6 — `.claude/commands/` slash commands

### How Claude Commands Work

Custom slash commands are markdown files in `.claude/commands/`. Each file name becomes the command name (`run-tests.md` → `/run-tests`). The file content is the prompt Claude receives when the command is invoked. `$ARGUMENTS` is a special placeholder replaced by anything the user types after the command name.

### Commands

#### `/run-tests`
**File:** `.claude/commands/run-tests.md`

Runs `dotnet test tests/InterviewAssistant.Api.Tests/` and reports:
- Total tests run, passed, failed, skipped
- Full error messages and stack traces for any failures
- A pass/fail summary line at the end

#### `/check-env`
**File:** `.claude/commands/check-env.md`

Verifies the development environment is ready to run the API:
- .NET SDK version installed (`dotnet --version`)
- `src/InterviewAssistant.Api/appsettings.Development.json` exists and contains `AzureOpenAI.Endpoint` and `AzureOpenAI.Deployment`
- Azure CLI is available (`az --version`) — only required if `ApiKey` is not set in config

Reports each check as ready or missing, with a final "ready to run" or "action required" verdict.

#### `/test-endpoint`
**File:** `.claude/commands/test-endpoint.md`

Takes `$ARGUMENTS` as the endpoint name (`analyze`, `plan`, `revise`, or `evaluate`). Builds a realistic sample payload for that endpoint and uses the MCP fetch server to POST it to the corresponding route. Displays the raw response and a brief interpretation.

Route and payload mapping:
- `analyze` → `POST /api/interview/analyze` — short resume text
- `plan` → `POST /api/interview/plan` — pre-built ResumeProfile + SeniorityAssessment + target role
- `revise` → `POST /api/interview/plan/revise` — existing InterviewPlan + feedback string
- `evaluate` → `POST /api/interview/evaluate` — ResumeProfile + InterviewPlan + interview notes

#### `/review-agents`
**File:** `.claude/commands/review-agents.md`

Reads `src/InterviewAssistant.Api/AgentPrompts.cs` and evaluates all 4 agent prompts (`_ingestionAgent`, `_seniorityAgent`, `_plannerAgent`, `_evaluatorAgent`) for:
- Vague or ambiguous instructions
- JSON schema inconsistencies between the prompt and the models in `Models/`
- Missing edge case handling
- Prompt length and clarity

Outputs a per-agent review with specific improvement suggestions.

---

## Files Changed

| File | Change |
|---|---|
| `CLAUDE.md` | Append `## Working with Claude` section |
| `.claude/commands/run-tests.md` | New file |
| `.claude/commands/check-env.md` | New file |
| `.claude/commands/test-endpoint.md` | New file |
| `.claude/commands/review-agents.md` | New file |

---

## Out of Scope

- Changes to existing `CLAUDE.md` sections
- Changes to `.claude/settings.json`
- Any implementation code changes
