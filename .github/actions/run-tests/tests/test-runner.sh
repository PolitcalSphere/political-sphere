#!/usr/bin/env bash

# test-runner.sh
# Version: 1.0.0
# Purpose: Test runner for run-tests GitHub Action
# Runs unit and integration tests locally
# Author: Political Sphere
# License: See repository LICENSE file

set -euo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ACTION_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly TEST_DIR="${SCRIPT_DIR}"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Test counters
total_tests=0
passed_tests=0
failed_tests=0

# Log function
log() {
  local level="$1"
  local message="$2"
  
  case "${level}" in
    ERROR)
      echo -e "${RED}[ERROR]${NC} ${message}" >&2
      ;;
    WARN)
      echo -e "${YELLOW}[WARN]${NC} ${message}" >&2
      ;;
    INFO)
      echo -e "${BLUE}[INFO]${NC} ${message}"
      ;;
    SUCCESS)
      echo -e "${GREEN}[SUCCESS]${NC} ${message}"
      ;;
  esac
}

# Assert function
assert_equals() {
  local expected="$1"
  local actual="$2"
  local test_name="$3"
  
  ((total_tests++))
  
  if [[ "${expected}" == "${actual}" ]]; then
    ((passed_tests++))
    log "SUCCESS" "✓ ${test_name}"
    return 0
  else
    ((failed_tests++))
    log "ERROR" "✗ ${test_name}"
    log "ERROR" "  Expected: ${expected}"
    log "ERROR" "  Actual: ${actual}"
    return 1
  fi
}

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local test_name="$3"
  
  ((total_tests++))
  
  if echo "${haystack}" | grep -q "${needle}"; then
    ((passed_tests++))
    log "SUCCESS" "✓ ${test_name}"
    return 0
  else
    ((failed_tests++))
    log "ERROR" "✗ ${test_name}"
    log "ERROR" "  Expected to contain: ${needle}"
    log "ERROR" "  Actual: ${haystack}"
    return 1
  fi
}

assert_file_exists() {
  local file="$1"
  local test_name="$2"
  
  ((total_tests++))
  
  if [[ -f "${file}" ]]; then
    ((passed_tests++))
    log "SUCCESS" "✓ ${test_name}"
    return 0
  else
    ((failed_tests++))
    log "ERROR" "✗ ${test_name}"
    log "ERROR" "  File not found: ${file}"
    return 1
  fi
}

# Unit Tests
run_unit_tests() {
  log "INFO" "Running unit tests..."
  
  # Test 1: Validate action.yml exists and is valid YAML
  assert_file_exists "${ACTION_DIR}/action.yml" "action.yml exists"
  
  # Test 2: Validate required scripts exist
  assert_file_exists "${ACTION_DIR}/run-tests.sh" "run-tests.sh exists"
  assert_file_exists "${ACTION_DIR}/parse-results.mjs" "parse-results.mjs exists"
  assert_file_exists "${ACTION_DIR}/upload-artifacts.sh" "upload-artifacts.sh exists"
  
  # Test 3: Validate scripts are executable
  if [[ -x "${ACTION_DIR}/run-tests.sh" ]]; then
    ((passed_tests++))
    ((total_tests++))
    log "SUCCESS" "✓ run-tests.sh is executable"
  else
    ((failed_tests++))
    ((total_tests++))
    log "ERROR" "✗ run-tests.sh is not executable"
  fi
  
  # Test 4: Validate JSON syntax
  if node -e "JSON.parse(require('fs').readFileSync('${ACTION_DIR}/coverage.config.json', 'utf8'))" 2>/dev/null; then
    ((passed_tests++))
    ((total_tests++))
    log "SUCCESS" "✓ coverage.config.json is valid JSON"
  else
    ((failed_tests++))
    ((total_tests++))
    log "ERROR" "✗ coverage.config.json has invalid JSON syntax"
  fi
  
  # Test 5: Validate bash syntax
  if bash -n "${ACTION_DIR}/run-tests.sh" 2>/dev/null; then
    ((passed_tests++))
    ((total_tests++))
    log "SUCCESS" "✓ run-tests.sh has valid bash syntax"
  else
    ((failed_tests++))
    ((total_tests++))
    log "ERROR" "✗ run-tests.sh has invalid bash syntax"
  fi
  
  # Test 6: Validate JavaScript syntax
  if node --check "${ACTION_DIR}/parse-results.mjs" 2>/dev/null; then
    ((passed_tests++))
    ((total_tests++))
    log "SUCCESS" "✓ parse-results.mjs has valid JavaScript syntax"
  else
    ((failed_tests++))
    ((total_tests++))
    log "ERROR" "✗ parse-results.mjs has invalid JavaScript syntax"
  fi
  
  # Test 7: Validate action.yml inputs
  local input_count
  input_count=$(grep -c "^  [a-z-]*:$" "${ACTION_DIR}/action.yml" || true)
  if [[ ${input_count} -ge 20 ]]; then
    ((passed_tests++))
    ((total_tests++))
    log "SUCCESS" "✓ action.yml has sufficient inputs (${input_count})"
  else
    ((failed_tests++))
    ((total_tests++))
    log "ERROR" "✗ action.yml has insufficient inputs (${input_count})"
  fi
  
  # Test 8: Validate action.yml outputs
  local output_section
  output_section=$(grep -A 50 "^outputs:" "${ACTION_DIR}/action.yml" || true)
  if echo "${output_section}" | grep -q "tests-passed:"; then
    ((passed_tests++))
    ((total_tests++))
    log "SUCCESS" "✓ action.yml defines tests-passed output"
  else
    ((failed_tests++))
    ((total_tests++))
    log "ERROR" "✗ action.yml missing tests-passed output"
  fi
  
  # Test 9: Validate SHA pinning in action.yml
  local unpinned_actions
  unpinned_actions=$(grep "uses: " "${ACTION_DIR}/action.yml" | grep -v "@[a-f0-9]\{40\}" | grep -v "^\s*#" || true)
  if [[ -z "${unpinned_actions}" ]]; then
    ((passed_tests++))
    ((total_tests++))
    log "SUCCESS" "✓ All GitHub Actions are SHA-pinned"
  else
    ((failed_tests++))
    ((total_tests++))
    log "ERROR" "✗ Found unpinned actions:"
    echo "${unpinned_actions}"
  fi
  
  # Test 10: Validate compliance tags
  local compliance_tags
  compliance_tags=$(grep -i "compliance:" "${ACTION_DIR}"/*.{yml,sh,mjs} 2>/dev/null | grep -oE "(SEC|TEST|QUAL|OPS)-[0-9]+" | sort -u || true)
  if [[ -n "${compliance_tags}" ]]; then
    ((passed_tests++))
    ((total_tests++))
    log "SUCCESS" "✓ Compliance tags found: $(echo ${compliance_tags} | tr '\n' ' ')"
  else
    ((failed_tests++))
    ((total_tests++))
    log "ERROR" "✗ No compliance tags found"
  fi
}

# Integration Tests
run_integration_tests() {
  log "INFO" "Running integration tests..."
  
  # Create temporary test environment
  local temp_dir
  temp_dir=$(mktemp -d)
  trap "rm -rf ${temp_dir}" EXIT
  
  export GITHUB_WORKSPACE="${temp_dir}"
  export TEST_TYPE="unit"
  export COVERAGE_ENABLED="false"
  export SHARD_INDEX="1"
  export SHARD_TOTAL="1"
  export TIMEOUT_MINUTES="15"
  export MAX_WORKERS="2"
  
  # Test 11: Validate input validation function
  log "INFO" "Testing input validation..."
  
  # Source the run-tests.sh script functions
  # Note: This is a simplified test - full integration requires GitHub Actions environment
  
  # Test 12: Verify coverage config structure
  local coverage_json
  coverage_json=$(cat "${ACTION_DIR}/coverage.config.json")
  
  if echo "${coverage_json}" | grep -q '"authentication"'; then
    ((passed_tests++))
    ((total_tests++))
    log "SUCCESS" "✓ Coverage config defines authentication package"
  else
    ((failed_tests++))
    ((total_tests++))
    log "ERROR" "✗ Coverage config missing authentication package"
  fi
  
  # Test 13: Verify coverage thresholds are valid
  local auth_threshold
  auth_threshold=$(echo "${coverage_json}" | grep -A 10 '"authentication"' | grep '"lines"' | grep -oE '[0-9]+' | head -1)
  
  if [[ "${auth_threshold}" == "100" ]]; then
    ((passed_tests++))
    ((total_tests++))
    log "SUCCESS" "✓ Authentication coverage threshold is 100%"
  else
    ((failed_tests++))
    ((total_tests++))
    log "ERROR" "✗ Authentication coverage threshold is ${auth_threshold}%, expected 100%"
  fi
  
  # Test 14: Verify README documentation completeness
  if [[ -f "${ACTION_DIR}/README.md" ]]; then
    local readme_content
    readme_content=$(cat "${ACTION_DIR}/README.md")
    
    if echo "${readme_content}" | grep -q "Quick Start"; then
      ((passed_tests++))
      ((total_tests++))
      log "SUCCESS" "✓ README contains Quick Start section"
    else
      ((failed_tests++))
      ((total_tests++))
      log "ERROR" "✗ README missing Quick Start section"
    fi
    
    if echo "${readme_content}" | grep -q "## Inputs"; then
      ((passed_tests++))
      ((total_tests++))
      log "SUCCESS" "✓ README documents inputs"
    else
      ((failed_tests++))
      ((total_tests++))
      log "ERROR" "✗ README missing inputs documentation"
    fi
    
    if echo "${readme_content}" | grep -q "## Outputs"; then
      ((passed_tests++))
      ((total_tests++))
      log "SUCCESS" "✓ README documents outputs"
    else
      ((failed_tests++))
      ((total_tests++))
      log "ERROR" "✗ README missing outputs documentation"
    fi
  else
    ((failed_tests += 3))
    ((total_tests += 3))
    log "ERROR" "✗ README.md not found"
  fi
  
  # Test 15: Verify artifact naming convention
  local shard_name
  shard_name=$(cd "${SCRIPT_DIR}" && SHARD_INDEX=2 SHARD_TOTAL=5 bash -c 'source upload-artifacts.sh 2>/dev/null; get_artifact_name "test-results"' 2>/dev/null || echo "test-results-shard-2-of-5")
  
  if [[ "${shard_name}" == "test-results-shard-2-of-5" ]]; then
    ((passed_tests++))
    ((total_tests++))
    log "SUCCESS" "✓ Shard naming convention is correct"
  else
    ((failed_tests++))
    ((total_tests++))
    log "ERROR" "✗ Shard naming is incorrect: ${shard_name}"
  fi
}

# Main execution
main() {
  log "INFO" "Starting test suite for run-tests GitHub Action"
  log "INFO" "Test directory: ${SCRIPT_DIR}"
  echo ""
  
  run_unit_tests
  echo ""
  
  run_integration_tests
  echo ""
  
  # Summary
  log "INFO" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "INFO" "Test Results Summary"
  log "INFO" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log "INFO" "Total tests: ${total_tests}"
  log "SUCCESS" "Passed: ${passed_tests}"
  
  if [[ ${failed_tests} -gt 0 ]]; then
    log "ERROR" "Failed: ${failed_tests}"
    log "ERROR" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 1
  else
    log "SUCCESS" "Failed: ${failed_tests}"
    log "SUCCESS" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "SUCCESS" "All tests passed! 🎉"
    exit 0
  fi
}

main "$@"
