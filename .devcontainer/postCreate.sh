#!/bin/bash
set -e

echo "=== Restoring .NET packages ==="
dotnet restore

echo "=== Installing frontend dependencies ==="
cd src/web
npm install
# Create .env if it doesn't exist
if [ ! -f .env ]; then
  cp .env.example .env
fi
cd ../..

echo "=== Creating appsettings.Development.json from secrets ==="
APPSETTINGS="src/InterviewAssistant.Api/appsettings.Development.json"

if [ ! -f "$APPSETTINGS" ]; then
  cat > "$APPSETTINGS" <<EOF
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug",
      "Microsoft.AspNetCore": "Information"
    }
  },
  "AzureOpenAI": {
    "Endpoint": "${AZURE_OPENAI_ENDPOINT:-}",
    "Deployment": "${AZURE_OPENAI_DEPLOYMENT:-}",
    "ApiKey": "${AZURE_OPENAI_API_KEY:-}"
  }
}
EOF
  echo "  Created $APPSETTINGS from environment variables."
else
  echo "  $APPSETTINGS already exists — skipping."
fi

echo "=== Setup complete ==="
echo ""
echo "To start the API:  dotnet run --project src/InterviewAssistant.Api"
echo "To start the web:  cd src/web && npm run dev"
