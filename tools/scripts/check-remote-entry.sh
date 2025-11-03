#!/usr/bin/env bash
# Simple smoke-check script used by CI or locally to verify remoteEntry is served
set -euo pipefail
URL=${1:-http://localhost:3001/remoteEntry.js}
HTTP_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "$URL" || true)
if [ "$HTTP_STATUS" != "200" ]; then
  echo "remoteEntry not available at $URL (status=$HTTP_STATUS)"
  exit 2
fi
echo "remoteEntry OK: $URL"
exit 0
