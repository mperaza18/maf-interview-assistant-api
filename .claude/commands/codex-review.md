Review a Codex-authored branch (`cx/*`) before merging.

Usage: `/codex-review cx/your-branch-name`

Steps:
1. Check out (or diff against) the branch: `git diff main...cx/$ARGUMENTS`
2. Invoke the `codex-reviewer` subagent to run the full review checklist
3. Present the structured report (Summary / Blockers / Warnings / Passed / Test Results)
4. If there are blockers, stop and ask the user how to proceed
