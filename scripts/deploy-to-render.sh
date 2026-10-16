#!/usr/bin/env bash
# Deploy to Render Trigger Script
set -e

DEPLOY_HOOK_URL="${RENDER_DEPLOY_HOOK_URL:-https://api.render.com/deploy/srv-d9acni5aeets73dk554g?key=BULyDDcebf8}"

echo "🚀 Sending instant deployment trigger to Render..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$DEPLOY_HOOK_URL")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Status Code: $HTTP_CODE"
echo "Render Response: $BODY"

if [[ "$HTTP_CODE" =~ ^2 ]]; then
  echo "✅ Render deployment initiated successfully!"
  exit 0
else
  echo "❌ Failed to trigger Render deployment. (Code: $HTTP_CODE)"
  exit 1
fi
