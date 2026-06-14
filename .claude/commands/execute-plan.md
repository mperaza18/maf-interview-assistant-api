Execute a superpowers plan end-to-end, automatically routing each step to the right executor.

Usage: `/execute-plan docs/superpowers/plans/PLAN-FILE.md`

## What this command does

1. Read the plan file at $ARGUMENTS.
2. Parse all unchecked tasks (`- [ ]`) in order.
3. For each unchecked task, classify it:

   **Route to `codex-executor` subagent if the step is:**
   - Creating a new file from scratch (component, hook, test, DTO, config)
   - Adding a field to an existing model with no logic change
   - Writing a test file for an already-implemented unit
   - Installing a package (`npm install`, `dotnet add package`)
   - Pure Tailwind/styling changes with no logic

   **Implement directly using `backend-dotnet` or `frontend-react` subagent if the step is:**
   - Modifying existing business logic or service methods
   - Wiring DI in `Program.cs`
   - Changing agent prompts or workflow graphs
   - Multi-file coordination where order and correctness matter
   - Architectural decisions or refactors

4. Execute the step via the chosen route. On success, tick the checkbox in the plan file:
   replace `- [ ]` with `- [x]` for that specific task.

5. If a step fails (tests break, Codex errors), STOP immediately. Report:
   - Which step failed
   - The error output
   - Suggested fix
   Do NOT continue to the next step.

6. After all steps complete, invoke the `test-runner` subagent for a full suite run.

7. Print a final summary:
   - Steps completed (n / total)
   - Steps routed to Codex vs. Claude Code
   - Final test result
   - Files changed (`git diff --stat main`)

## Notes

- Always process steps in the order they appear in the plan — dependencies between steps are intentional.
- If the plan has no `[Codex]` or `[Claude Code]` tags, use the classification rules above.
- If a step is ambiguous, default to Claude Code (safer).
- Never skip a step without explicitly reporting it as skipped and why.
