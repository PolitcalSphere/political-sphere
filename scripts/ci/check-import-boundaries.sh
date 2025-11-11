#!/usr/bin/env bash
set -euo pipefail

# Simple import boundary checker.
# Fails if any source file contains an import/require that traverses two or more directory levels upward ("../../").
# Excludes node_modules, dev/docker, docs, and generated folders.

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT_DIR"

REPORT_DIR="artifacts"
REPORT_FILE="$REPORT_DIR/import-boundary-report.txt"
mkdir -p "$REPORT_DIR"

echo "Scanning for disallowed cross-package relative imports ('../../')..."

# Prefer Node-based checker if Node is available (better comment/string stripping). Fall back to grep-based check.
if command -v node >/dev/null 2>&1; then
  echo "Node found; running JS-based import boundary checker"
  if node scripts/ci/check-import-boundaries.mjs; then
    echo "Import boundary check passed."
    exit 0
  else
    echo "Import boundary check failed (see artifacts/import-boundary-report.txt)"
    exit 2
  fi
fi

echo "Node not found; falling back to grep heuristic."

EXCLUDE_PATTERN='(^|/)node_modules/|(^|/)dev/docker/|(^|/)docs/|(^|/)dist/|(^|/)build/'

# Find JS/TS files and scan for ../../ import patterns
files=$(git ls-files '*.js' '*.ts' '*.jsx' '*.tsx' || true)
if [[ -z "$files" ]]; then
  echo "No source files found to scan."
  exit 0
fi

rm -f "$REPORT_FILE" || true
bad=0
while IFS= read -r f; do
  if echo "$f" | grep -Eq "$EXCLUDE_PATTERN"; then
    continue
  fi
  matches=$(grep -nH --line-number "\.{2}/\.{0,1}\.{0,1}/" -- "$f" || true)
  if [[ -n "$matches" ]]; then
    echo "---- $f ----" >> "$REPORT_FILE"
    echo "$matches" >> "$REPORT_FILE"
    echo >> "$REPORT_FILE"
    bad=1
  fi
done <<< "$files"

if [[ $bad -ne 0 ]]; then
  echo "Import boundary check failed: see $REPORT_FILE for offending files."
  echo "---- Report: ----"
  cat "$REPORT_FILE" || true
  exit 2
fi

echo "Import boundary check passed."
exit 0
