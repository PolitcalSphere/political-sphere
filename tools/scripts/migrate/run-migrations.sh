#!/usr/bin/env bash
set -euo pipefail

# Run Prisma migrations for any workspace package that declares a prisma script.
# This is a convenience script for CI and local dev. It attempts to detect
# packages with prisma and runs `npx prisma migrate deploy` in each.

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
PRISMA_VERSION="${PRISMA_VERSION:-5.20.0}"

echo "🔍 Scanning workspaces for Prisma migrations..."

# Check if git is available
if ! command -v git >/dev/null 2>&1; then
  echo "❌ ERROR: git not found. This script requires git to scan for package.json files." >&2
  exit 1
fi

# Check if jq is available
if ! command -v jq >/dev/null 2>&1; then
  echo "❌ ERROR: jq not found. Install with: brew install jq (macOS) or apt-get install jq (Linux)" >&2
  exit 1
fi

MIGRATION_COUNT=0
FAILED_COUNT=0

# Better approach: look for package.json files with "prisma" in scripts
while IFS= read -r pkg; do
  if [[ -f "$pkg" ]]; then
    if jq -e '.scripts.prisma' "$pkg" >/dev/null 2>&1 || jq -e '.dependencies.prisma' "$pkg" >/dev/null 2>&1 || jq -e '.devDependencies.prisma' "$pkg" >/dev/null 2>&1; then
      dir=$(dirname "$pkg")
      echo "📦 Found Prisma in $dir"
      pushd "$dir" >/dev/null
      
      # Install deps if node_modules missing
      if [[ ! -d node_modules ]]; then
        echo "   Installing npm dependencies in $dir..."
        if ! npm ci --ignore-scripts --no-audit --no-fund 2>/dev/null && ! npm install --no-audit --no-fund 2>/dev/null; then
          echo "   ⚠️  WARNING: Failed to install dependencies in $dir; skipping migrations" >&2
          FAILED_COUNT=$((FAILED_COUNT + 1))
          popd >/dev/null
          continue
        fi
      fi
      
      if npm run | grep -q "prisma"; then
        echo "   Running Prisma migrate deploy..."
        if npx "prisma@${PRISMA_VERSION}" migrate deploy; then
          echo "   ✅ Migrations completed for $dir"
          MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
        else
          echo "   ❌ ERROR: Migration failed for $dir" >&2
          FAILED_COUNT=$((FAILED_COUNT + 1))
        fi
      else
        echo "   ⚠️  No prisma migrate script found in $dir; skipping"
      fi
      popd >/dev/null
    fi
  fi
done < <(git ls-files -- "*/package.json")

echo ""
echo "📊 Migration Summary:"
echo "   Successful: $MIGRATION_COUNT"
echo "   Failed: $FAILED_COUNT"

if [[ $FAILED_COUNT -gt 0 ]]; then
  echo "❌ Some migrations failed. Review errors above." >&2
  exit 1
fi

if [[ $MIGRATION_COUNT -eq 0 ]]; then
  echo "⚠️  No Prisma projects found to migrate."
fi

echo "✅ All migrations completed successfully."
