# Claude Code Settings & MCP Server — Design Spec

**Date:** 2026-05-02
**Branch:** feat/Improve-claude-code-settings
**Items covered:** Medium-priority items 2, 3, and 4 from `Mastering-Claude-Code.md`

---

## Overview

Three related improvements to the Claude Code configuration for this repo:

1. **Create a versioned `.claude/settings.json`** with all team-safe permissions so collaborators get a working allowlist out of the box.
2. **Remove the hardcoded absolute path** from `.claude/settings.local.json` (`git -C /Users/mikeperaza/...`), replacing it with the generic `git log*` in the shared file.
3. **Configure an HTTP MCP server** (`@modelcontextprotocol/server-fetch` via npx) in the versioned settings so Claude can test live API endpoints during development.

---

## Design

### 1. `.claude/settings.json` (new — versioned, committed)

Contains all permissions safe for any collaborator plus the MCP server definition.

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

### 2. `.claude/settings.local.json` (personal — git-ignored, trimmed)

The hardcoded `git -C /Users/mikeperaza/Dev/maf-interview-assistant-api log --oneline -10` entry is removed. All previously listed permissions migrate to `settings.json`. The local file is kept as an empty placeholder for future personal overrides.

```json
{
  "permissions": {
    "allow": []
  }
}
```

### 3. MCP Server — `@modelcontextprotocol/server-fetch`

- **Transport:** stdio (Claude Code default)
- **Command:** `npx -y @modelcontextprotocol/server-fetch` — runs on-demand, no global install required
- **Use case:** Claude calls the `fetch` tool to hit `http://localhost:5001/api/interview/*` endpoints and inspect responses while the API is running
- **Prerequisite:** Node.js/npm must be installed; API must be running (`dotnet run --project src/InterviewAssistant.Api`)
- **Scope:** Local endpoint testing only. External URL access is not blocked at the MCP level but is not the intended use case.

### 4. CLAUDE.md fix (bonus)

The Swagger UI URL in `CLAUDE.md` incorrectly states `http://localhost:5000`. The actual port per `launchSettings.json` is `http://localhost:5001` (HTTP profile). Update the reference accordingly.

---

## Files Changed

| File | Action |
| --- | --- |
| `.claude/settings.json` | Create — versioned permissions + MCP server |
| `.claude/settings.local.json` | Modify — remove hardcoded path, empty allow list |
| `CLAUDE.md` | Modify — fix Swagger port 5000 → 5001 |

---

## Out of Scope

- Global `~/.claude/CLAUDE.md` (low-priority item 7, separate effort)
- Custom slash commands under `.claude/commands/` (low-priority item 6, separate effort)
- Additional MCP servers for external docs or Azure
