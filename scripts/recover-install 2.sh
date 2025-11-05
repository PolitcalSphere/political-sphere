#!/usr/bin/env bash
# Purpose: Safely recover from broken/inconsistent node_modules (e.g., ENOTEMPTY rename errors)
# Usage:
#   bash scripts/recover-install.sh           # dry run (no install) — prepares, backs up, prints next steps
#   bash scripts/recover-install.sh --install # perform clean npm ci after backup (run outside VS Code)
#
# Notes:
# - Run this OUTSIDE VS Code or with extensions disabled to avoid file-watcher thrash:
#     code --disable-extensions
# - This script is idempotent and will not delete node_modules without first creating a backup.
# - Restoring is as simple as: mv node_modules.bak node_modules

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

echo "[recover-install] Repo: $ROOT_DIR"

if pgrep -f "(npm|node)" >/dev/null 2>&1; then
  echo "[recover-install] Stopping lingering npm/node processes..."
  pkill -f npm || true
  pkill -f node || true
fi

echo "[recover-install] Checking workspace state..."
if [ -d node_modules.bak ]; then
  echo "[recover-install] node_modules.bak already exists (previous backup)."
fi

if [ -d node_modules ]; then
  echo "[recover-install] Backing up current node_modules -> node_modules.bak"
  # If a previous backup exists, keep it and create a timestamped one
  if [ -d node_modules.bak ]; then
    ts="$(date +%Y%m%d-%H%M%S)"
    mv node_modules "node_modules.bak.$ts"
    echo "[recover-install] Created backup: node_modules.bak.$ts"
  else
    mv node_modules node_modules.bak
    echo "[recover-install] Created backup: node_modules.bak"
  fi
else
  echo "[recover-install] No node_modules present — nothing to back up."
fi

echo "[recover-install] Cleaning safe npm temp subdirectories under node_modules (if present)..."
if [ -d node_modules ]; then
  for d in ".staging" ".pnpm" ".cache" ".vite" ".turbo"; do
    if [ -d "node_modules/$d" ]; then
      echo "[recover-install]   - removing node_modules/$d"
      rm -rf "node_modules/$d"
    fi
  done
else
  echo "[recover-install] node_modules not present; skipping temp subdir cleanup."
fi

if [ "${1:-}" = "--install" ]; then
  echo "[recover-install] Running npm ci (no audit/fund). This may take several minutes..."
  npm ci --no-audit --no-fund
  echo "[recover-install] npm ci completed."
else
  cat <<'EON'
[recover-install] Dry run complete.

Next steps (manual):
  1) Close VS Code or start with extensions disabled: `code --disable-extensions`
  2) Run a clean install:
       npm ci --no-audit --no-fund
     (fallback if lockfile issues):
       npm install --no-audit --no-fund
  3) Optional: run a quick smoke test (no coverage):
       npx vitest --run "libs/shared/src/__tests__/security.spec.js"
  4) If everything looks good, remove old backups to free space:
       ls -d node_modules.bak* | xargs -I{} rm -rf {}

Alternatively, rerun this script with --install to perform step 2 automatically:
  bash scripts/recover-install.sh --install
EON
fi

exit 0
