# CLAUDE.md Working with Claude + Custom Slash Commands — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `## Working with Claude` workflow section to `CLAUDE.md` and create four project-specific slash commands in `.claude/commands/`.

**Architecture:** Two independent changes: (1) a one-section append to an existing markdown file, (2) five new markdown files in a new `.claude/commands/` directory. No C# code is touched. No build or compilation required.

**Tech Stack:** Claude Code custom commands (markdown files in `.claude/commands/`), MCP fetch server (already configured in `.claude/settings.json`).

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Modify | `CLAUDE.md` | Append `## Working with Claude` section |
| Create | `.claude/commands/run-tests.md` | `/run-tests` slash command |
| Create | `.claude/commands/check-env.md` | `/check-env` slash command |
| Create | `.claude/commands/test-endpoint.md` | `/test-endpoint` slash command |
| Create | `.claude/commands/review-agents.md` | `/review-agents` slash command |

---

## Task 1: Add `## Working with Claude` section to `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md` (append to end of file)

- [ ] **Step 1: Append the section**

Open `CLAUDE.md` and append the following block at the very end of the file (after the last line of the Architecture section):

```markdown

## Working with Claude

- Before significant changes, ask Claude to generate a plan first.
- Always create a feature branch; never commit directly to `main`.
- Run `dotnet build` to verify changes before committing.
- Azure CLI must be installed and logged in if no `ApiKey` is set.
```

- [ ] **Step 2: Verify the file ends correctly**

Read `CLAUDE.md` and confirm:
- The new section appears at the end
- No existing sections were modified
- There are no duplicate blank lines between the Architecture section and the new section

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add Working with Claude workflow section to CLAUDE.md"
```

---

## Task 2: Create `.claude/commands/run-tests.md`

**Files:**
- Create: `.claude/commands/run-tests.md`

- [ ] **Step 1: Create the commands directory and file**

Create `.claude/commands/run-tests.md` with this exact content:

```markdown
Run the unit test suite for this project and report results.

Execute: `dotnet test tests/InterviewAssistant.Api.Tests/`

Report:
- Total tests: passed / failed / skipped counts
- For any failures: test name, error message, and the relevant stack trace lines
- Final verdict: ✅ All tests passed — or — ❌ X test(s) failed
```

- [ ] **Step 2: Verify**

Read `.claude/commands/run-tests.md` and confirm the content matches exactly.

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/run-tests.md
git commit -m "feat: add /run-tests slash command"
```

---

## Task 3: Create `.claude/commands/check-env.md`

**Files:**
- Create: `.claude/commands/check-env.md`

- [ ] **Step 1: Create the file**

Create `.claude/commands/check-env.md` with this exact content:

```markdown
Verify the development environment is ready to run the Interview Assistant API. Check each item below and report ✅ or ❌:

1. **.NET SDK version** — run `dotnet --version`. Must be 8.x or higher.
2. **Dev config file** — check that `src/InterviewAssistant.Api/appsettings.Development.json` exists and contains non-empty values for both `AzureOpenAI.Endpoint` and `AzureOpenAI.Deployment`.
3. **Azure CLI** — run `az --version`. Only required if `ApiKey` is not set in the config file.

End with a summary line:
- "✅ Ready to run" — if all required checks pass
- "❌ Action required: [list what is missing]" — if anything is wrong
```

- [ ] **Step 2: Verify**

Read `.claude/commands/check-env.md` and confirm the content matches exactly.

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/check-env.md
git commit -m "feat: add /check-env slash command"
```

---

## Task 4: Create `.claude/commands/test-endpoint.md`

**Files:**
- Create: `.claude/commands/test-endpoint.md`

- [ ] **Step 1: Create the file**

Create `.claude/commands/test-endpoint.md` with this exact content:

````markdown
Send a test HTTP request to the Interview Assistant API endpoint specified by: $ARGUMENTS

The API must be running at http://localhost:5001. Use the fetch tool to make the POST request.

Match $ARGUMENTS to the route and payload below:

---

**analyze** → POST http://localhost:5001/api/interview/analyze

```json
{
  "resumeText": "Jane Smith\njane@example.com\n\nSoftware Engineer with 5 years of experience in backend development.\n\nSkills: C#, .NET 8, Azure, SQL Server, Docker, Kubernetes\n\nExperience:\n- Senior Developer at Acme Corp (2021-2024): Led migration of monolith to microservices, reduced API latency by 40%\n- Developer at Beta Inc (2019-2021): Built REST APIs for e-commerce platform serving 500k users",
  "role": "Senior Software Engineer"
}
```

---

**plan** → POST http://localhost:5001/api/interview/plan

```json
{
  "profile": {
    "candidateName": "Jane Smith",
    "email": "jane@example.com",
    "currentTitle": "Senior Developer",
    "yearsExperience": 5,
    "coreSkills": ["C#", ".NET 8", "Azure", "SQL Server", "Docker"],
    "roles": ["Senior Developer at Acme Corp (2021-2024)", "Developer at Beta Inc (2019-2021)"],
    "notableProjects": ["Microservices migration at Acme Corp — 40% latency reduction"],
    "redFlags": []
  },
  "seniority": {
    "level": "Senior",
    "confidence": 0.87,
    "rationale": "5 years with demonstrated technical leadership and measurable impact"
  },
  "role": "Senior Software Engineer",
  "mode": "simple"
}
```

---

**revise** → POST http://localhost:5001/api/interview/plan/revise

```json
{
  "plan": {
    "role": "Senior Software Engineer",
    "level": "Senior",
    "summary": "A balanced interview plan covering technical and behavioral competencies",
    "rounds": [
      {
        "name": "Technical Screen",
        "durationMinutes": 45,
        "questions": ["What is the difference between a process and a thread?", "What is a REST API?"]
      },
      {
        "name": "System Design",
        "durationMinutes": 60,
        "questions": ["Design a URL shortener"]
      }
    ],
    "rubric": [
      {
        "dimension": "Problem Solving",
        "signals": ["Breaks problems into steps", "Considers edge cases"]
      }
    ]
  },
  "feedback": "Reduce trivia questions and add more practical system design and debugging scenarios"
}
```

---

**evaluate** → POST http://localhost:5001/api/interview/evaluate

```json
{
  "profile": {
    "candidateName": "Jane Smith",
    "email": "jane@example.com",
    "currentTitle": "Senior Developer",
    "yearsExperience": 5,
    "coreSkills": ["C#", ".NET 8", "Azure"],
    "roles": ["Senior Developer at Acme Corp"],
    "notableProjects": ["Microservices migration"],
    "redFlags": []
  },
  "plan": {
    "role": "Senior Software Engineer",
    "level": "Senior",
    "summary": "Balanced technical interview for senior backend role",
    "rounds": [
      {
        "name": "System Design",
        "durationMinutes": 60,
        "questions": ["Design a distributed job queue"]
      }
    ],
    "rubric": [
      {
        "dimension": "System Design",
        "signals": ["Understands trade-offs", "Considers scalability"]
      }
    ]
  },
  "notes": "Candidate showed strong understanding of distributed systems. Hesitated on database normalization. Excellent communication and structured thinking."
}
```

---

After receiving the response:
1. Show the raw JSON response
2. Summarize what the response contains in 2-3 sentences
3. Flag any unexpected fields, errors, or non-200 status codes
````

- [ ] **Step 2: Verify**

Read `.claude/commands/test-endpoint.md` and confirm all four endpoint blocks are present with correct routes:
- `analyze` → `/api/interview/analyze`
- `plan` → `/api/interview/plan`
- `revise` → `/api/interview/plan/revise`
- `evaluate` → `/api/interview/evaluate`

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/test-endpoint.md
git commit -m "feat: add /test-endpoint slash command"
```

---

## Task 5: Create `.claude/commands/review-agents.md`

**Files:**
- Create: `.claude/commands/review-agents.md`

- [ ] **Step 1: Create the file**

Create `.claude/commands/review-agents.md` with this exact content:

```markdown
Read `src/InterviewAssistant.Api/AgentPrompts.cs` and review all 4 agent system prompts (ingestion, seniority, planner, evaluator).

Also read the following model files for schema comparison:
- `src/InterviewAssistant.Api/Models/ResumeProfile.cs`
- `src/InterviewAssistant.Api/Models/SeniorityAssessment.cs`
- `src/InterviewAssistant.Api/Models/InterviewPlan.cs`
- `src/InterviewAssistant.Api/Models/EvaluationResult.cs`

For each agent, evaluate:
1. **Clarity** — Are the instructions unambiguous? Could the model interpret them in more than one way?
2. **JSON schema alignment** — Does the schema described in the prompt match the C# model it deserializes into (field names, types, nesting)?
3. **Edge case handling** — Are there instructions for incomplete resumes, missing fields, or ambiguous seniority?
4. **Output format enforcement** — Does the prompt clearly forbid markdown wrappers and require raw JSON only?

Format the output as:

## Ingestion Agent
**Issues found:** ...
**Suggestions:** ...

## Seniority Agent
**Issues found:** ...
**Suggestions:** ...

## Planner Agent
**Issues found:** ...
**Suggestions:** ...

## Evaluator Agent
**Issues found:** ...
**Suggestions:** ...

## Summary
Overall quality score (1–10) and the top 3 highest-impact improvements across all agents.
```

- [ ] **Step 2: Verify**

Read `.claude/commands/review-agents.md` and confirm the four model file paths are listed correctly.

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/review-agents.md
git commit -m "feat: add /review-agents slash command"
```

---

## Final Verification

- [ ] **Confirm all files exist**

```bash
ls .claude/commands/
```

Expected output:
```
check-env.md
review-agents.md
run-tests.md
test-endpoint.md
```

- [ ] **Confirm CLAUDE.md ends with the new section**

Read the last 10 lines of `CLAUDE.md` and verify `## Working with Claude` and its 4 bullet points are present.

- [ ] **Confirm commands appear in Claude Code**

Type `/` in Claude Code and verify all four commands appear in the autocomplete list:
- `/run-tests`
- `/check-env`
- `/test-endpoint`
- `/review-agents`
