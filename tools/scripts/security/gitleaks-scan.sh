#!/usr/bin/env bash
set -euo pipefail

# Run a repository-wide gitleaks scan using the official docker image.
# This script is intended for CI use. It will exit non-zero if leaks are found.

REPORT_DIR="artifacts"
REPORT_PATH="$REPORT_DIR/gitleaks-report.json"

mkdir -p "$REPORT_DIR"

echo "Running gitleaks scan via Docker..."

docker run --rm -v "$(pwd)":/code -w /code zricethezav/gitleaks:latest detect --source=/code --report-format=json --report-path="$REPORT_PATH"

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "Gitleaks detected potential secrets. Report available at $REPORT_PATH"
  cat "$REPORT_PATH" || true
  exit $EXIT_CODE
fi

echo "No leaks detected by gitleaks."
exit 0
