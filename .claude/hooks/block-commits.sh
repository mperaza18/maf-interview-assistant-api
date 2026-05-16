#!/bin/bash
COMMAND=$(jq -r '.tool_input.command')

if echo "$COMMAND" | grep -qE '^\s*git commit'; then
  printf '{"reason": "Do not commit automatically. Wait until ALL tasks are done, then the user will commit manually."}\n'
  exit 2
fi