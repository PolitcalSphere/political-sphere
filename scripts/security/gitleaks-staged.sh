#!/usr/bin/env bash
set -euo pipefail

# Run gitleaks against staged changes only. Fast pre-commit check.

echo "Running gitleaks against staged changes..."

# If there are no staged changes, exit quickly.
if [ -z "$(git diff --name-only --cached)" ]; then
  echo "No staged changes to scan."
  exit 0
fi

# Use dockerized gitleaks with --staged which reads from the git index.
docker run --rm -v "$(pwd)":/code -w /code zricethezav/gitleaks:latest detect --staged --source=/code

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "Gitleaks detected potential secrets in staged changes. Please remove or move them to env files and add to .gitleaks.toml allowlist if false positive."
  exit $EXIT_CODE
fi

echo "Staged scan passed."
exit 0
