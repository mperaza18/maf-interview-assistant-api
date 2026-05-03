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
