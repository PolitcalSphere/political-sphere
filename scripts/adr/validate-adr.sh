#!/usr/bin/env bash
set -euo pipefail

# Validate ADR markdown files for required front-matter keys.
# Usage: scripts/adr/validate-adr.sh <path-to-file-or-dir>

TARGET=${1:-docs/adr}

fail=0

check_file() {
  file="$1"
  # Only check .md files
  if [[ "${file##*.}" != "md" ]]; then
    return
  fi

  # Skip README and template files
  base=$(basename "$file")
  if [[ "$base" == "README.md" || "$base" == *template* ]]; then
    return
  fi

  if ! head -n 20 "$file" | grep -q '^---'; then
    echo "ERROR: $file: missing YAML front-matter start '---'"
    fail=1
    return
  fi

  # Extract front-matter until the second ---
  fm=$(awk '/^---/{f=!f; next} f{print}' "$file" | sed -n '1,200p')

  for key in title date status deciders; do
    if ! echo "$fm" | grep -q "^$key:"; then
      echo "ERROR: $file: missing front-matter key '$key'"
      fail=1
    fi
  done

  # date format check (YYYY-MM-DD)
  if ! echo "$fm" | grep -Eo '^date:[[:space:]]*([0-9]{4}-[0-9]{2}-[0-9]{2})' >/dev/null; then
    echo "ERROR: $file: date must be YYYY-MM-DD in front-matter"
    fail=1
  fi
}

if [[ -d "$TARGET" ]]; then
  while IFS= read -r -d $'\0' f; do
    check_file "$f"
  done < <(find "$TARGET" -type f -name "*.md" -print0)
else
  check_file "$TARGET"
fi

if [[ $fail -ne 0 ]]; then
  echo "ADR validation failed"
  exit 1
fi

echo "ADR validation passed"
exit 0
