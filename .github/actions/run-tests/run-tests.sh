#!/usr/bin/env bash

# run-tests.sh
# Version: 1.0.0
# Purpose: Enterprise-grade test orchestration for Vitest with sharding, coverage, and metrics
# Compliance: SEC-01, SEC-02, TEST-01, TEST-02, QUAL-01, OPS-01, OPS-02
# Author: Political Sphere
# License: See repository LICENSE file
# Runbook: https://github.com/PoliticalSphere/political-sphere/docs/runbooks/test-execution.md

set -euo pipefail

# Version and metadata
readonly SCRIPT_VERSION="1.0.0"
readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration defaults (can be overridden by environment variables)
readonly DEFAULT_TIMEOUT_MINUTES=15
readonly DEFAULT_MAX_WORKERS=2
readonly DEFAULT_COVERAGE_THRESHOLD=0
readonly DEFAULT_RETRY_COUNT=2

# Output paths
readonly OUTPUT_DIR="${GITHUB_WORKSPACE:-.}/test-output"
readonly COVERAGE_DIR="${OUTPUT_DIR}/coverage"
readonly RESULTS_DIR="${OUTPUT_DIR}/results"

# Correlation ID for distributed tracing
readonly CORRELATION_ID="${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}-$(date +%s)"

# CloudWatch namespace
readonly CW_NAMESPACE="${CLOUDWATCH_NAMESPACE:-PoliticalSphere/CI/Tests}"

# Color codes for output (if terminal supports it)
if [[ -t 1 ]]; then
  readonly RED='\033[0;31m'
  readonly GREEN='\033[0;32m'
  readonly YELLOW='\033[1;33m'
  readonly BLUE='\033[0;34m'
  readonly NC='\033[0m' # No Color
else
  readonly RED=''
  readonly GREEN=''
  readonly YELLOW=''
  readonly BLUE=''
  readonly NC=''
fi

# Trap handler for cleanup on exit
cleanup() {
  local exit_code=$?
  
  if [[ ${exit_code} -ne 0 ]]; then
    log "ERROR" "Script failed with exit code ${exit_code}"
  fi
  
  # Export outputs for GitHub Actions
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "duration-seconds=${SECONDS}" >> "${GITHUB_OUTPUT}"
  fi
  
  log "INFO" "Cleanup complete"
  exit "${exit_code}"
}

trap cleanup EXIT INT TERM

# Structured logging function
# Usage: log LEVEL MESSAGE [context_json]
log() {
  local level="$1"
  local message="$2"
  local context="${3:-{}}"
  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  
  # Structured JSON log
  local log_entry
  log_entry=$(cat <<EOF
{
  "timestamp": "${timestamp}",
  "level": "${level}",
  "message": "${message}",
  "correlation_id": "${CORRELATION_ID}",
  "script": "${SCRIPT_NAME}",
  "version": "${SCRIPT_VERSION}",
  "context": ${context}
}
EOF
)
  
  # Output to stderr for structured logs (stdout reserved for test output)
  echo "${log_entry}" >&2
  
  # Also output human-readable format to console
  case "${level}" in
    ERROR)
      echo -e "${RED}[ERROR]${NC} ${message}" >&2
      ;;
    WARN)
      echo -e "${YELLOW}[WARN]${NC} ${message}" >&2
      ;;
    INFO)
      echo -e "${BLUE}[INFO]${NC} ${message}" >&2
      ;;
    SUCCESS)
      echo -e "${GREEN}[SUCCESS]${NC} ${message}" >&2
      ;;
    *)
      echo "[${level}] ${message}" >&2
      ;;
  esac
}

# Validate required environment variables
validate_environment() {
  log "INFO" "Validating environment variables"
  
  local required_vars=()
  local missing_vars=()
  
  # Check for missing required variables
  for var in "${required_vars[@]}"; do
    if [[ -z "${!var:-}" ]]; then
      missing_vars+=("${var}")
    fi
  done
  
  if [[ ${#missing_vars[@]} -gt 0 ]]; then
    log "ERROR" "Missing required environment variables: ${missing_vars[*]}"
    return 1
  fi
  
  log "SUCCESS" "Environment validation passed"
  return 0
}

# Validate inputs
validate_inputs() {
  log "INFO" "Validating action inputs"
  
  # Test type validation (already done in action.yml, but double-check)
  local valid_test_types="unit integration e2e coverage api frontend shared"
  if [[ -n "${TEST_TYPE}" ]] && ! echo "${valid_test_types}" | grep -qw "${TEST_TYPE}"; then
    log "ERROR" "Invalid test type: ${TEST_TYPE}. Must be one of: ${valid_test_types}"
    return 1
  fi
  
  # Coverage threshold validation
  local threshold="${COVERAGE_THRESHOLD:-${DEFAULT_COVERAGE_THRESHOLD}}"
  if [[ ${threshold} -lt 0 ]] || [[ ${threshold} -gt 100 ]]; then
    log "ERROR" "Invalid coverage threshold: ${threshold}. Must be between 0-100"
    return 1
  fi
  
  # Shard validation
  local shard_index="${SHARD_INDEX:-1}"
  local shard_total="${SHARD_TOTAL:-1}"
  
  if [[ ${shard_index} -lt 1 ]] || [[ ${shard_index} -gt ${shard_total} ]]; then
    log "ERROR" "Invalid shard configuration: index ${shard_index} of ${shard_total}"
    return 1
  fi
  
  # Timeout validation
  local timeout="${TIMEOUT_MINUTES:-${DEFAULT_TIMEOUT_MINUTES}}"
  if [[ ${timeout} -lt 1 ]] || [[ ${timeout} -gt 120 ]]; then
    log "ERROR" "Invalid timeout: ${timeout} minutes. Must be between 1-120"
    return 1
  fi
  
  log "SUCCESS" "Input validation passed"
  return 0
}

# Setup output directories
setup_output_dirs() {
  log "INFO" "Setting up output directories"
  
  mkdir -p "${OUTPUT_DIR}"
  mkdir -p "${COVERAGE_DIR}"
  mkdir -p "${RESULTS_DIR}"
  
  # Set permissions
  chmod -R 755 "${OUTPUT_DIR}"
  
  log "SUCCESS" "Output directories created: ${OUTPUT_DIR}"
}

# Build Vitest command based on inputs
build_test_command() {
  local cmd="npx vitest"
  local test_type="${TEST_TYPE:-unit}"
  local custom_command="${TEST_COMMAND:-}"
  
  # If custom command provided, use it
  if [[ -n "${custom_command}" ]]; then
    echo "${custom_command}"
    return 0
  fi
  
  # Add run flag (not watch mode)
  cmd="${cmd} --run"
  
  # Add test type pattern
  case "${test_type}" in
    unit)
      cmd="${cmd} --config vitest.config.js"
      ;;
    integration)
      cmd="${cmd} --config vitest.config.js"
      ;;
    e2e)
      cmd="${cmd} --config vitest.config.js 'e2e/**/*.{test,spec}.{js,ts,jsx,tsx}'"
      ;;
    coverage)
      cmd="${cmd} --coverage"
      ;;
    api)
      cmd="${cmd} 'apps/api/**/*.{test,spec}.{js,mjs,ts,tsx}'"
      ;;
    frontend)
      cmd="${cmd} 'apps/frontend/**/*.{test,spec}.{js,mjs,ts,tsx}'"
      ;;
    shared)
      cmd="${cmd} 'libs/shared/**/*.{test,spec}.{js,mjs,ts,tsx}'"
      ;;
    *)
      log "WARN" "Unknown test type: ${test_type}, using default unit test pattern"
      ;;
  esac
  
  # Add coverage if enabled
  if [[ "${COVERAGE_ENABLED:-false}" == "true" ]]; then
    cmd="${cmd} --coverage"
    cmd="${cmd} --coverage.reporter=json --coverage.reporter=html --coverage.reporter=lcov"
  fi
  
  # Add sharding if configured
  local shard_index="${SHARD_INDEX:-1}"
  local shard_total="${SHARD_TOTAL:-1}"
  
  if [[ ${shard_total} -gt 1 ]]; then
    cmd="${cmd} --shard=${shard_index}/${shard_total}"
    log "INFO" "Sharding enabled: ${shard_index}/${shard_total}"
  fi
  
  # Add max workers
  local max_workers="${MAX_WORKERS:-${DEFAULT_MAX_WORKERS}}"
  cmd="${cmd} --maxWorkers=${max_workers}"
  
  # Add changed-only mode if enabled
  if [[ "${CHANGED_ONLY:-false}" == "true" ]]; then
    cmd="${cmd} --changed"
    log "INFO" "Running tests for changed files only"
  fi
  
  # Add reporter for CI
  cmd="${cmd} --reporter=verbose --reporter=json --reporter=junit"
  
  # Set output file for JSON results
  cmd="${cmd} --outputFile.json=${RESULTS_DIR}/results.json"
  cmd="${cmd} --outputFile.junit=${RESULTS_DIR}/junit.xml"
  
  # Add fail-fast if enabled
  if [[ "${FAIL_FAST:-false}" == "true" ]]; then
    cmd="${cmd} --bail=1"
  fi
  
  echo "${cmd}"
}

# Execute tests with timeout protection
execute_tests() {
  local test_command="$1"
  local timeout_minutes="${TIMEOUT_MINUTES:-${DEFAULT_TIMEOUT_MINUTES}}"
  local timeout_seconds=$((timeout_minutes * 60))
  
  log "INFO" "Executing tests with ${timeout_minutes}m timeout"
  log "INFO" "Command: ${test_command}"
  
  # Start timer
  local start_time
  start_time=$(date +%s)
  
  # Execute with timeout
  local exit_code=0
  if timeout "${timeout_seconds}s" bash -c "${test_command}"; then
    exit_code=0
  else
    exit_code=$?
  fi
  
  # Calculate duration
  local end_time
  end_time=$(date +%s)
  local duration=$((end_time - start_time))
  
  # Check if timeout occurred
  if [[ ${exit_code} -eq 124 ]]; then
    log "ERROR" "Tests exceeded timeout of ${timeout_minutes} minutes"
    emit_metric "TestTimeout" 1 "Count"
    return 124
  fi
  
  # Log duration
  log "INFO" "Tests completed in ${duration} seconds"
  
  # Emit metrics if enabled
  if [[ "${ENABLE_METRICS:-false}" == "true" ]]; then
    emit_metric "TestDuration" "${duration}" "Seconds"
  fi
  
  return "${exit_code}"
}

# Retry failed tests if configured
retry_failed_tests() {
  local retry_enabled="${RETRY_FAILED_TESTS:-false}"
  local retry_count="${RETRY_COUNT:-${DEFAULT_RETRY_COUNT}}"
  
  if [[ "${retry_enabled}" != "true" ]]; then
    return 0
  fi
  
  log "INFO" "Retry logic enabled with ${retry_count} attempts"
  
  # TODO: Implement intelligent retry logic
  # - Parse failed tests from results.json
  # - Re-run only failed tests
  # - Track flaky tests
  
  log "WARN" "Retry logic not yet implemented"
  return 0
}

# Parse test results
parse_results() {
  local results_file="${RESULTS_DIR}/results.json"
  
  if [[ ! -f "${results_file}" ]]; then
    log "WARN" "Results file not found: ${results_file}"
    return 1
  fi
  
  log "INFO" "Parsing test results from ${results_file}"
  
  # Extract metrics using jq
  local tests_run=0
  local tests_passed=0
  local tests_failed=0
  local coverage_percentage=0
  
  if command -v jq >/dev/null 2>&1; then
    tests_run=$(jq -r '.numTotalTests // 0' "${results_file}")
    tests_passed=$(jq -r '.numPassedTests // 0' "${results_file}")
    tests_failed=$(jq -r '.numFailedTests // 0' "${results_file}")
    
    log "INFO" "Tests run: ${tests_run}, Passed: ${tests_passed}, Failed: ${tests_failed}"
  else
    log "WARN" "jq not available, skipping detailed result parsing"
  fi
  
  # Parse coverage if available
  local coverage_file="${COVERAGE_DIR}/coverage-summary.json"
  if [[ -f "${coverage_file}" ]] && command -v jq >/dev/null 2>&1; then
    coverage_percentage=$(jq -r '.total.lines.pct // 0' "${coverage_file}")
    log "INFO" "Coverage: ${coverage_percentage}%"
  fi
  
  # Export outputs for GitHub Actions
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    {
      echo "tests-passed=$([[ ${tests_failed} -eq 0 ]] && echo "true" || echo "false")"
      echo "tests-run=${tests_run}"
      echo "tests-failed=${tests_failed}"
      echo "coverage-percentage=${coverage_percentage}"
      echo "result-path=${results_file}"
      echo "coverage-path=${COVERAGE_DIR}"
    } >> "${GITHUB_OUTPUT}"
  fi
  
  # Check coverage threshold
  local threshold="${COVERAGE_THRESHOLD:-${DEFAULT_COVERAGE_THRESHOLD}}"
  if [[ "${COVERAGE_ENABLED:-false}" == "true" ]] && [[ ${threshold} -gt 0 ]]; then
    if (( $(echo "${coverage_percentage} < ${threshold}" | bc -l) )); then
      log "ERROR" "Coverage ${coverage_percentage}% below threshold ${threshold}%"
      
      if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
        echo "coverage-passed-threshold=false" >> "${GITHUB_OUTPUT}"
      fi
      
      return 1
    else
      log "SUCCESS" "Coverage ${coverage_percentage}% meets threshold ${threshold}%"
      
      if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
        echo "coverage-passed-threshold=true" >> "${GITHUB_OUTPUT}"
      fi
    fi
  else
    # No threshold check needed
    if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
      echo "coverage-passed-threshold=true" >> "${GITHUB_OUTPUT}"
    fi
  fi
  
  # Emit metrics if enabled
  if [[ "${ENABLE_METRICS:-false}" == "true" ]]; then
    emit_metric "TestsRun" "${tests_run}" "Count"
    emit_metric "TestsPassed" "${tests_passed}" "Count"
    emit_metric "TestsFailed" "${tests_failed}" "Count"
    emit_metric "CoveragePercentage" "${coverage_percentage}" "Percent"
  fi
  
  return 0
}

# Emit CloudWatch metric (placeholder - requires AWS CLI)
emit_metric() {
  local metric_name="$1"
  local value="$2"
  local unit="$3"
  
  if [[ "${ENABLE_METRICS:-false}" != "true" ]]; then
    return 0
  fi
  
  log "INFO" "Emitting metric: ${metric_name}=${value} ${unit}"
  
  # Check if AWS CLI is available
  if ! command -v aws >/dev/null 2>&1; then
    log "WARN" "AWS CLI not available, skipping metric emission"
    return 0
  fi
  
  # Emit metric to CloudWatch
  aws cloudwatch put-metric-data \
    --namespace "${CW_NAMESPACE}" \
    --metric-name "${metric_name}" \
    --value "${value}" \
    --unit "${unit}" \
    --dimensions Environment="${ENVIRONMENT:-ci}",TestType="${TEST_TYPE:-unit}" \
    2>&1 || log "WARN" "Failed to emit metric ${metric_name}"
}

# Main execution function
main() {
  log "INFO" "Starting test execution v${SCRIPT_VERSION}"
  log "INFO" "Correlation ID: ${CORRELATION_ID}"
  
  # Validate environment and inputs
  validate_environment || exit 1
  validate_inputs || exit 1
  
  # Setup output directories
  setup_output_dirs || exit 1
  
  # Build test command
  local test_command
  test_command=$(build_test_command)
  
  # Execute tests
  local test_exit_code=0
  if ! execute_tests "${test_command}"; then
    test_exit_code=$?
    log "ERROR" "Test execution failed with exit code ${test_exit_code}"
  fi
  
  # Retry failed tests if configured
  if [[ ${test_exit_code} -ne 0 ]]; then
    retry_failed_tests || log "WARN" "Retry logic failed or not configured"
  fi
  
  # Parse and validate results
  if ! parse_results; then
    log "ERROR" "Result parsing failed or coverage below threshold"
    exit 1
  fi
  
  # Final status
  if [[ ${test_exit_code} -eq 0 ]]; then
    log "SUCCESS" "All tests passed successfully"
    exit 0
  else
    log "ERROR" "Tests failed with exit code ${test_exit_code}"
    exit "${test_exit_code}"
  fi
}

# Execute main function
main "$@"
