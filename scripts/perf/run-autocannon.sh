#!/usr/bin/env bash
set -euo pipefail

# Run a short autocannon smoke test and write JSON output to artifacts/autocannon.json
# Usage: ./run-autocannon.sh [URL] [DURATION] [CONCURRENCY] [PIPES]
MAIN_URL=${1:-http://localhost:4000/health}
DURATION=${2:-10}
CONCURRENCY=${3:-50}
PIPES=${4:-10}

mkdir -p artifacts

echo "Running autocannon against ${MAIN_URL} for ${DURATION}s (c=${CONCURRENCY} pipes=${PIPES})"
# prefer npx if available, otherwise try global autocannon
if command -v npx >/dev/null 2>&1; then
  npx autocannon -j -d "${DURATION}" -c "${CONCURRENCY}" -p "${PIPES}" "${MAIN_URL}" > artifacts/autocannon.json
else
  if command -v autocannon >/dev/null 2>&1; then
    autocannon -j -d "${DURATION}" -c "${CONCURRENCY}" -p "${PIPES}" "${MAIN_URL}" > artifacts/autocannon.json
  else
    echo "autocannon not found. Install with 'npm i -g autocannon' or ensure npx is available." >&2
    exit 2
  fi
fi

echo "Wrote artifacts/autocannon.json"

# Optionally run the result checker if Node is available
if command -v node >/dev/null 2>&1; then
  echo "Running perf checker..."
  node "$(dirname "$0")/check-results.js" || RC=$?
  # propagate non-zero exit code if checker failed
  if [ "${RC-0}" != "0" ]; then
    echo "Perf checker failed with exit code ${RC}." >&2
    exit ${RC}
  fi
fi
