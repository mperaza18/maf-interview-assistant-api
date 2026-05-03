# Claude Code Settings & MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a versioned `.claude/settings.json` with shared permissions and MCP fetch server, clean up the personal `settings.local.json`, and fix an incorrect port in `CLAUDE.md`.

**Architecture:** Three config-only file changes. No code, no tests. All changes are in `.claude/` (Claude Code config) and `CLAUDE.md` (project docs). The versioned `settings.json` is new; the other two files are modified.

**Tech Stack:** Claude Code settings JSON, Markdown

---

## File Map

| File | Action | Responsibility |
| --- | --- | --- |
| `.claude/settings.json` | Create | Shared team permissions + MCP server definition |
| `.claude/settings.local.json` | Modify | Personal overrides — strip hardcoded path, empty allow list |
| `CLAUDE.md` | Modify | Fix Swagger UI port 5000 → 5001 |

---

### Task 1: Create `.claude/settings.json`

**Files:**
- Create: `.claude/settings.json`

- [ ] **Step 1: Create the file with full content**

```json
{
  "permissions": {
    "allow": [
      "Bash(dotnet build*)",
      "Bash(dotnet run*)",
      "Bash(dotnet restore*)",
      "Bash(dotnet test*)",
      "Bash(dotnet new*)",
      "Bash(dotnet sln*)",
      "Bash(dotnet add*)",
      "Bash(git log*)",
      "Bash(git diff*)",
      "Bash(git status*)",
      "Bash(git commit*)",
      "Bash(git push*)",
      "Bash(gh repo*)",
      "Bash(gh pr*)"
    ]
  },
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    }
  }
}
```

- [ ] **Step 2: Verify the file is valid JSON**

Run: `cat .claude/settings.json | python3 -m json.tool`
Expected: The JSON prints back without errors.

- [ ] **Step 3: Verify the file is NOT in .gitignore**

Run: `git check-ignore -v .claude/settings.json`
Expected: No output (file is not ignored — it should be committed).

- [ ] **Step 4: Commit**

```bash
git add .claude/settings.json
git commit -m "feat: add versioned .claude/settings.json with shared permissions and MCP fetch server"
```

---

### Task 2: Clean up `.claude/settings.local.json`

**Files:**
- Modify: `.claude/settings.local.json`

- [ ] **Step 1: Replace the file content**

Replace the entire file with:

```json
{
  "permissions": {
    "allow": []
  }
}
```

This removes the hardcoded `"Bash(git -C /Users/mikeperaza/Dev/maf-interview-assistant-api log --oneline -10)"` entry and all permissions that have migrated to `settings.json`.

- [ ] **Step 2: Verify the file is valid JSON**

Run: `cat .claude/settings.local.json | python3 -m json.tool`
Expected: The JSON prints back without errors.

- [ ] **Step 3: Verify the file IS in .gitignore**

Run: `git check-ignore -v .claude/settings.local.json`
Expected: Output shows the file is ignored (e.g., `.gitignore:... .claude/settings.local.json`).

If it is not ignored, add `.claude/settings.local.json` to `.gitignore` before committing.

- [ ] **Step 4: Commit**

```bash
git add .claude/settings.local.json
git commit -m "chore: remove hardcoded path from settings.local.json, permissions migrated to settings.json"
```

---

### Task 3: Fix Swagger port in `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Find and replace the incorrect port**

Locate this line in `CLAUDE.md`:
```
Swagger UI is served at `http://localhost:5000` when running in Development mode (the default for `dotnet run`).
```

Replace with:
```
Swagger UI is served at `http://localhost:5001` when running in Development mode (the default for `dotnet run`).
```

The correct port comes from `src/InterviewAssistant.Api/Properties/launchSettings.json`, which defines the HTTP profile as `http://localhost:5001`.

- [ ] **Step 2: Verify the change**

Run: `grep "localhost" CLAUDE.md`
Expected: Output shows `http://localhost:5001` — no remaining `5000` references.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "fix: correct Swagger UI port from 5000 to 5001 in CLAUDE.md"
```
