#!/usr/bin/env bash
# Kill common runaway dev processes that hog CPU/memory in this workspace
# Owner: Platform Engineering
# Usage: bash scripts/dev/kill-resource-hogs.sh
set -euo pipefail

if [[ "${OSTYPE:-}" != darwin* && "${OSTYPE:-}" != linux* ]]; then
  echo "This script is intended for macOS/Linux. Please kill processes manually on Windows."
fi

# Helper to kill processes matching a pattern
kill_by_pattern() {
  local pattern="$1"
  if pgrep -f "$pattern" >/dev/null 2>&1; then
    echo "➡️  Stopping: $pattern"
    pkill -f "$pattern" || true
  else
    echo "✅ Not running: $pattern"
  fi
}

# Nx long-running tasks
kill_by_pattern "nx run-many --target=build"
kill_by_pattern "nx run-many --target=test"
kill_by_pattern "/node_modules/nx/src/daemon/server/start.js"

# Playwright test server
kill_by_pattern "@playwright/test/cli.js test-server"

# Stuck lefthook (pre-commit) runners
kill_by_pattern "lefthook run pre-commit"

# Optional: any lingering webpack dev servers
kill_by_pattern "webpack serve"

# Optional: puppeteer/chrome from MCP
kill_by_pattern "chrome-devtools-mcp"
kill_by_pattern "puppeteer"

# Clear Nx cache safely to reduce CPU from cache invalidations
if command -v npx >/dev/null 2>&1; then
  echo "🧹 Running: npx nx reset (clears Nx cache and stops daemon)"
  npx nx reset || true
fi

echo "Done. If the IDE still feels slow, try:"
echo " - Reload Window (Developer: Reload Window)"
echo " - Temporarily disable Nx Console extension"
