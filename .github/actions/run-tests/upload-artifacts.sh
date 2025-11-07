#!/usr/bin/env bash

# upload-artifacts.sh
# Version: 1.0.0
# Purpose: Upload test and coverage artifacts with shard-aware naming and validation
# Compliance: OPS-01, OPS-02, QUAL-05
# Author: Political Sphere
# License: See repository LICENSE file

set -euo pipefail

# Script metadata
readonly SCRIPT_VERSION="1.0.0"
readonly SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}")"

# Configuration
readonly COVERAGE_DIR="${COVERAGE_DIR:-./test-output/coverage}"
readonly RESULTS_DIR="${RESULTS_DIR:-./test-output/results}"
readonly SHARD_INDEX="${SHARD_INDEX:-1}"
readonly SHARD_TOTAL="${SHARD_TOTAL:-1}"
readonly RETENTION_DAYS="${RETENTION_DAYS:-30}"
readonly MAX_ARTIFACT_SIZE_MB=100

# Color codes for output
if [[ -t 1 ]]; then
  readonly RED='\033[0;31m'
  readonly GREEN='\033[0;32m'
  readonly YELLOW='\033[1;33m'
  readonly BLUE='\033[0;34m'
  readonly NC='\033[0m'
else
  readonly RED=''
  readonly GREEN=''
  readonly YELLOW=''
  readonly BLUE=''
  readonly NC=''
fi

# Structured logging
log() {
  local level="$1"
  local message="$2"
  local timestamp
  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  
  echo "{\"timestamp\":\"${timestamp}\",\"level\":\"${level}\",\"message\":\"${message}\",\"script\":\"${SCRIPT_NAME}\"}" >&2
  
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
  esac
}

# Check if directory exists and has files
check_directory() {
  local dir="$1"
  local dir_name="$2"
  
  if [[ ! -d "${dir}" ]]; then
    log "WARN" "${dir_name} directory not found: ${dir}"
    return 1
  fi
  
  local file_count
  file_count=$(find "${dir}" -type f | wc -l | tr -d ' ')
  
  if [[ ${file_count} -eq 0 ]]; then
    log "WARN" "${dir_name} directory is empty: ${dir}"
    return 1
  fi
  
  log "INFO" "${dir_name} directory contains ${file_count} files"
  return 0
}

# Check artifact size
check_size() {
  local dir="$1"
  local dir_name="$2"
  
  if [[ ! -d "${dir}" ]]; then
    return 0
  fi
  
  # Calculate size in MB
  local size_bytes
  size_bytes=$(du -sb "${dir}" | cut -f1)
  local size_mb=$((size_bytes / 1024 / 1024))
  
  log "INFO" "${dir_name} size: ${size_mb}MB"
  
  if [[ ${size_mb} -gt ${MAX_ARTIFACT_SIZE_MB} ]]; then
    log "WARN" "${dir_name} size (${size_mb}MB) exceeds recommended maximum (${MAX_ARTIFACT_SIZE_MB}MB)"
  fi
  
  return 0
}

# Create artifact name with shard suffix
get_artifact_name() {
  local base_name="$1"
  
  if [[ ${SHARD_TOTAL} -gt 1 ]]; then
    echo "${base_name}-shard-${SHARD_INDEX}-of-${SHARD_TOTAL}"
  else
    echo "${base_name}"
  fi
}

# Validate coverage files exist
validate_coverage_files() {
  local coverage_dir="$1"
  
  if [[ ! -d "${coverage_dir}" ]]; then
    log "WARN" "Coverage directory not found: ${coverage_dir}"
    return 1
  fi
  
  # Check for expected coverage files
  local has_files=false
  
  if [[ -f "${coverage_dir}/coverage-final.json" ]]; then
    log "INFO" "Found JSON coverage report"
    has_files=true
  fi
  
  if [[ -f "${coverage_dir}/lcov.info" ]]; then
    log "INFO" "Found LCOV coverage report"
    has_files=true
  fi
  
  if [[ -d "${coverage_dir}/html" ]]; then
    log "INFO" "Found HTML coverage report"
    has_files=true
  fi
  
  if [[ "${has_files}" == "false" ]]; then
    log "WARN" "No coverage files found in ${coverage_dir}"
    return 1
  fi
  
  return 0
}

# Create artifact manifest
create_manifest() {
  local artifact_type="$1"
  local artifact_dir="$2"
  local manifest_file="${artifact_dir}/manifest.json"
  
  log "INFO" "Creating artifact manifest: ${manifest_file}"
  
  local file_count
  file_count=$(find "${artifact_dir}" -type f -not -name "manifest.json" | wc -l | tr -d ' ')
  
  local total_size
  total_size=$(du -sb "${artifact_dir}" | cut -f1)
  
  cat > "${manifest_file}" <<EOF
{
  "version": "${SCRIPT_VERSION}",
  "type": "${artifact_type}",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "shard": {
    "index": ${SHARD_INDEX},
    "total": ${SHARD_TOTAL}
  },
  "files": {
    "count": ${file_count},
    "total_bytes": ${total_size}
  },
  "environment": {
    "github_run_id": "${GITHUB_RUN_ID:-unknown}",
    "github_run_attempt": "${GITHUB_RUN_ATTEMPT:-1}",
    "github_sha": "${GITHUB_SHA:-unknown}",
    "github_ref": "${GITHUB_REF:-unknown}"
  }
}
EOF
  
  log "SUCCESS" "Manifest created with ${file_count} files (${total_size} bytes)"
}

# Upload coverage artifacts
upload_coverage() {
  log "INFO" "Preparing coverage artifacts for upload"
  
  if ! check_directory "${COVERAGE_DIR}" "Coverage"; then
    log "WARN" "Skipping coverage upload - no coverage data found"
    return 0
  fi
  
  if ! validate_coverage_files "${COVERAGE_DIR}"; then
    log "WARN" "Coverage directory exists but no valid coverage files found"
    return 0
  fi
  
  check_size "${COVERAGE_DIR}" "Coverage"
  create_manifest "coverage" "${COVERAGE_DIR}"
  
  local artifact_name
  artifact_name=$(get_artifact_name "coverage")
  
  log "SUCCESS" "Coverage artifacts ready for upload as '${artifact_name}'"
  
  # Export artifact name for GitHub Actions
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "coverage-artifact-name=${artifact_name}" >> "${GITHUB_OUTPUT}"
  fi
  
  return 0
}

# Upload test results artifacts
upload_results() {
  log "INFO" "Preparing test results artifacts for upload"
  
  if ! check_directory "${RESULTS_DIR}" "Results"; then
    log "ERROR" "Results directory not found or empty"
    return 1
  fi
  
  check_size "${RESULTS_DIR}" "Results"
  create_manifest "test-results" "${RESULTS_DIR}"
  
  local artifact_name
  artifact_name=$(get_artifact_name "test-results")
  
  log "SUCCESS" "Test results artifacts ready for upload as '${artifact_name}'"
  
  # Export artifact name for GitHub Actions
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    echo "results-artifact-name=${artifact_name}" >> "${GITHUB_OUTPUT}"
  fi
  
  return 0
}

# Verify critical files exist
verify_critical_files() {
  log "INFO" "Verifying critical files"
  
  local critical_files=(
    "${RESULTS_DIR}/results.json"
    "${RESULTS_DIR}/junit.xml"
  )
  
  local missing_files=()
  
  for file in "${critical_files[@]}"; do
    if [[ ! -f "${file}" ]]; then
      missing_files+=("${file}")
    fi
  done
  
  if [[ ${#missing_files[@]} -gt 0 ]]; then
    log "WARN" "Missing critical files: ${missing_files[*]}"
  else
    log "SUCCESS" "All critical files present"
  fi
  
  return 0
}

# Main execution
main() {
  log "INFO" "Starting artifact upload preparation v${SCRIPT_VERSION}"
  
  # Verify critical files
  verify_critical_files
  
  # Upload test results (required)
  if ! upload_results; then
    log "ERROR" "Failed to prepare test results for upload"
    exit 1
  fi
  
  # Upload coverage (optional)
  if [[ "${COVERAGE_ENABLED:-false}" == "true" ]]; then
    upload_coverage || log "WARN" "Coverage upload preparation failed, continuing"
  else
    log "INFO" "Coverage not enabled, skipping coverage artifacts"
  fi
  
  log "SUCCESS" "Artifact upload preparation complete"
}

# Execute main
main "$@"
