#!/usr/bin/env bash
set -euo pipefail

# Run Prisma migrations for any workspace package that declares a prisma script.
# This is a convenience script for CI and local dev. It attempts to detect
# packages with prisma and runs `npx prisma migrate deploy` in each.

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

echo "Scanning workspaces for Prisma migrations..."

# Find package.json files in the repo (excluding node_modules)
mapfile -t packages < <(jq -r 'paths | select(.[-1]=="package.json") | join("/")' <<< "[]" 2>/dev/null || true)

# Instead, fallback to scanning common locations
packages=(
  "apps/api"
  "apps/worker"
  "apps/frontend"
  "libs"
)

# Better approach: look for package.json files with "prisma" in scripts
while IFS= read -r pkg; do
  if [[ -f "$pkg" ]]; then
    if jq -e '.scripts.prisma' "$pkg" >/dev/null 2>&1 || jq -e '.dependencies.prisma' "$pkg" >/dev/null 2>&1 || jq -e '.devDependencies.prisma' "$pkg" >/dev/null 2>&1; then
      dir=$(dirname "$pkg")
      echo "Found Prisma in $dir"
      pushd "$dir" >/dev/null
      # Install deps if node_modules missing
      if [[ ! -d node_modules ]]; then
        echo "Installing npm dependencies in $dir (local)"
        npm ci --ignore-scripts --no-audit --no-fund || npm install --no-audit --no-fund
      fi
      if npm run | grep -q "prisma"; then
        echo "Running Prisma migrate deploy in $dir"
        npx prisma migrate deploy
      else
        echo "No prisma migrate script found in $dir; skipping"
      fi
      popd >/dev/null
    fi
  fi
done < <(git ls-files -- "*/package.json")

echo "Migrations completed."
