Verify the development environment is ready to run the Interview Assistant API. Check each item below and report ✅ or ❌:

1. **.NET SDK version** — run `dotnet --version`. Must be 8.x or higher.
2. **Dev config file** — check that `src/InterviewAssistant.Api/appsettings.Development.json` exists and contains non-empty values for both `AzureOpenAI.Endpoint` and `AzureOpenAI.Deployment`.
3. **Azure CLI** — run `az --version`. Only required if `ApiKey` is not set in the config file.

End with a summary line:
- "✅ Ready to run" — if all required checks pass
- "❌ Action required: [list what is missing]" — if anything is wrong
