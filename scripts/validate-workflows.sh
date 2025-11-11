#!/usr/bin/env bash
# Workflow Security Validator
# Scans GitHub Actions workflows for shell injection vulnerabilities
# Usage: ./scripts/validate-workflows.sh [--fix]

set -euo pipefail

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

VIOLATIONS=0
FIX_MODE=false

if [[ "${1:-}" == "--fix" ]]; then
  FIX_MODE=true
  echo "⚠️  Fix mode is informational only - manual review required"
fi

echo "🔍 Scanning GitHub Actions workflows for security vulnerabilities..."
echo ""

# Function to check a file for unsafe patterns
check_file() {
  local file="$1"
  local found_issues=false
  
  echo "Checking: $file"
  
  # Pattern 1: Direct interpolation in run: steps with github context
  # Matches: run: | ... ${{ github.event.* }} or ${{ inputs.* }}
  if grep -Pzo '(?s)run:\s*\|.*?\$\{\{\s*(github\.event\.|github\.head_ref|github\.base_ref|inputs\.)' "$file" > /dev/null 2>&1; then
    echo -e "  ${RED}✗${NC} Found unsafe interpolation in run: step"
    echo -e "    ${YELLOW}Pattern:${NC} \${{ github.* }} or \${{ inputs.* }} in shell script"
    echo -e "    ${YELLOW}Risk:${NC} Shell injection vulnerability"
    echo -e "    ${YELLOW}Fix:${NC} Use env: block to store value, then reference as \"\${VAR}\""
    found_issues=true
    ((VIOLATIONS++))
  fi
  
  # Pattern 2: Unquoted environment variables in shell
  if grep -n 'run:' "$file" | head -1 | cut -d: -f1 | while read -r line_num; do
    # Get the run block
    sed -n "${line_num},/^[[:space:]]*[a-z-]*:/p" "$file" | grep -E '\$[A-Z_]+[^"]' > /dev/null 2>&1
  done; then
    echo -e "  ${YELLOW}⚠${NC}  Found potentially unquoted environment variables"
    echo -e "    ${YELLOW}Recommendation:${NC} Always quote env vars: \"\${VAR}\" not \$VAR"
    found_issues=true
  fi
  
  if $found_issues; then
    echo ""
    return 1
  else
    echo -e "  ${GREEN}✓${NC} No issues found"
    echo ""
    return 0
  fi
}

# Find all workflow files
WORKFLOW_FILES=$(find .github/workflows libs/ci/workflows libs/ci/actions .github/actions -type f \( -name "*.yml" -o -name "*.yaml" \) 2>/dev/null || true)

if [[ -z "$WORKFLOW_FILES" ]]; then
  echo "No workflow files found!"
  exit 0
fi

# Check each file
while IFS= read -r file; do
  check_file "$file" || true
done <<< "$WORKFLOW_FILES"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ $VIOLATIONS -eq 0 ]]; then
  echo -e "${GREEN}✓ All workflows passed security validation!${NC}"
  exit 0
else
  echo -e "${RED}✗ Found $VIOLATIONS security violation(s)${NC}"
  echo ""
  echo "To fix these issues:"
  echo "1. Move \${{ ... }} expressions from run: steps to env: blocks"
  echo "2. Reference them as quoted environment variables: \"\${VAR}\""
  echo ""
  echo "Example:"
  echo "  # Bad:"
  echo "  run: |"
  echo "    echo \${{ inputs.value }}"
  echo ""
  echo "  # Good:"
  echo "  env:"
  echo "    VALUE: \${{ inputs.value }}"
  echo "  run: |"
  echo "    echo \"\${VALUE}\""
  echo ""
  echo "See: https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions"
  exit 1
fi
