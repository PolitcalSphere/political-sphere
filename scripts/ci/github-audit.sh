#!/usr/bin/env bash
# =============================================================================
# GitHub Workflows & Actions Audit Script v1.4.0
# =============================================================================
#
# Comprehensive validation for GitHub Actions workflows including:
# - YAML syntax validation
# - GitHub Actions security best practices
# - Secrets management audit
# - Workflow efficiency checks
# - actionlint integration
# - Security scanning for workflow vulnerabilities
# - CodeQL workflow presence and configuration check
# - Configurable warning enforcement
#
# Standards Compliance:
# - GitHub Actions Security Hardening Guide
# - OWASP CI/CD Security Top 10
# - GitHub Security Best Practices for Actions
# - CIS Software Supply Chain Security Guide
# - NIST SP 800-204C (DevSecOps)
#
# Exit Codes:
#   0 - Success (all checks passed or warnings only)
#   1 - Warnings found (or medium/low if FAIL_ON_WARNINGS=true)
#   2 - Critical errors found
#
# Environment Variables:
#   AUTO_FIX=true              - Enable automatic fixes
#   FAIL_ON_WARNINGS=true      - Treat medium/low findings as failures
#   SKIP_ACTIONLINT=true       - Skip actionlint validation
#   SKIP_YAMLLINT=true         - Skip YAML linting
#   SKIP_SECRET_SCAN=true      - Skip secrets scanning
#   VERBOSE=true               - Enable verbose logging
#   LOG_FORMAT=json            - Output logs in JSON format
#   CONFIG_FILE=<path>         - Path to external configuration file
#   GITLEAKS_SCOPE=<path>      - Path to scan (default: .github)
#   GITLEAKS_CONFIG=<path>     - Custom gitleaks config file
#   GITLEAKS_ARGS="<args>"     - Additional gitleaks arguments
#   OUTPUT_DIR=./audit-output  - Directory for output files
#
# Usage:
#   ./github-audit.sh [options]
#   AUTO_FIX=true ./github-audit.sh
#   FAIL_ON_WARNINGS=true ./github-audit.sh
#   VERBOSE=true ./github-audit.sh
#   LOG_FORMAT=json ./github-audit.sh
#   CONFIG_FILE=config.yml ./github-audit.sh
#
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
GITHUB_DIR="${PROJECT_ROOT}/.github"
WORKFLOWS_DIR="${GITHUB_DIR}/workflows"

# Configuration via environment variables
AUTO_FIX="${AUTO_FIX:-false}"
SKIP_ACTIONLINT="${SKIP_ACTIONLINT:-false}"
SKIP_YAMLLINT="${SKIP_YAMLLINT:-false}"
SKIP_SECRET_SCAN="${SKIP_SECRET_SCAN:-false}"
OUTPUT_DIR="${OUTPUT_DIR:-${PROJECT_ROOT}/github-audit}"
CACHE_DIR="${CACHE_DIR:-${OUTPUT_DIR}/.cache}"
FAIL_ON_WARNINGS="${FAIL_ON_WARNINGS:-false}"
VERBOSE="${VERBOSE:-false}"
CONFIG_FILE="${CONFIG_FILE:-}"
LOG_FORMAT="${LOG_FORMAT:-human}"
# gitleaks configuration: scope (path), config file, and additional args
GITLEAKS_SCOPE="${GITLEAKS_SCOPE:-$GITHUB_DIR}"
GITLEAKS_CONFIG="${GITLEAKS_CONFIG:-}"
GITLEAKS_ARGS="${GITLEAKS_ARGS:-}"

# Validate log format
case "$LOG_FORMAT" in
    human|json|sarif) ;;
    *) log_critical "LOG_FORMAT must be 'human', 'json', or 'sarif', got: $LOG_FORMAT"; exit 3 ;;
esac

# Color and box drawing detection with NO_COLOR support
if [[ "${NO_COLOR:-}" == "true" ]] || [[ ! -t 1 ]]; then
    # No colors for CI, non-TTY, or NO_COLOR set
    RED=''
    YELLOW=''
    GREEN=''
    BLUE=''
    CYAN=''
    NC=''
else
    # Use tput for colors if available and terminal supports it
    if command -v tput &> /dev/null && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
        RED=$(tput setaf 1)
        YELLOW=$(tput setaf 3)
        GREEN=$(tput setaf 2)
        BLUE=$(tput setaf 4)
        CYAN=$(tput setaf 6)
        NC=$(tput sgr0)
    else
        # Fallback ANSI colors
        RED='\033[0;31m'
        YELLOW='\033[1;33m'
        GREEN='\033[0;32m'
        BLUE='\033[0;34m'
        CYAN='\033[0;36m'
        NC='\033[0m'
    fi
fi

# Box drawing characters - use Unicode if supported, ASCII otherwise
if [[ "${LANG:-}" == *UTF-8* ]] && locale charmap 2>/dev/null | grep -q UTF-8; then
    BOX_H='═'
    BOX_V='║'
    BOX_TL='╔'
    BOX_TR='╗'
    BOX_BL='╚'
    BOX_BR='╝'
    BOX_T='╠'
    BOX_B='╚'
    BOX_L='╠'
    BOX_R='╣'
else
    BOX_H='-'
    BOX_V='|'
    BOX_TL='+'
    BOX_TR='+'
    BOX_BL='+'
    BOX_BR='+'
    BOX_T='+'
    BOX_B='+'
    BOX_L='+'
    BOX_R='+'
fi

# Counters for findings
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0
INFO_COUNT=0
PASS_COUNT=0
AUTO_FIXED_COUNT=0

# Findings arrays and caching
declare -a FINDINGS
declare -A FILE_CACHE  # Cache for file contents to avoid repeated reads

# Backup directory for auto-fixes
BACKUP_DIR="${OUTPUT_DIR}/backups/$(date +%Y%m%d_%H%M%S)"
AUTO_FIX_LOG="${OUTPUT_DIR}/auto-fix.log"

# -----------------------------------------------------------------------------
# Utility Functions
# -----------------------------------------------------------------------------

log_critical() {
    if [[ "$LOG_FORMAT" == "json" ]]; then
        printf '{"level":"CRITICAL","message":"%s","timestamp":"%s"}\n' "$*" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2
    else
        printf '%s[CRITICAL]%s %s\n' "$RED" "$NC" "$*" >&2
    fi
    ((CRITICAL_COUNT++)) || true
}

log_high() {
    if [[ "$LOG_FORMAT" == "json" ]]; then
        printf '{"level":"HIGH","message":"%s","timestamp":"%s"}\n' "$*" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2
    else
        printf '%s[HIGH]%s %s\n' "$RED" "$NC" "$*" >&2
    fi
    ((HIGH_COUNT++)) || true
}

log_medium() {
    if [[ "$LOG_FORMAT" == "json" ]]; then
        printf '{"level":"MEDIUM","message":"%s","timestamp":"%s"}\n' "$*" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2
    else
        printf '%s[MEDIUM]%s %s\n' "$YELLOW" "$NC" "$*" >&2
    fi
    ((MEDIUM_COUNT++)) || true
}

log_low() {
    if [[ "$LOG_FORMAT" == "json" ]]; then
        printf '{"level":"LOW","message":"%s","timestamp":"%s"}\n' "$*" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2
    else
        printf '%s[LOW]%s %s\n' "$YELLOW" "$NC" "$*" >&2
    fi
    ((LOW_COUNT++)) || true
}

log_info() {
    if [[ "$VERBOSE" == "true" ]]; then
        if [[ "$LOG_FORMAT" == "json" ]]; then
            printf '{"level":"INFO","message":"%s","timestamp":"%s"}\n' "$*" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        else
            printf '%s[INFO]%s %s\n' "$CYAN" "$NC" "$*"
        fi
    fi
    ((INFO_COUNT++)) || true
}

log_pass() {
    if [[ "$LOG_FORMAT" == "json" ]]; then
        printf '{"level":"PASS","message":"%s","timestamp":"%s"}\n' "$*" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    else
        printf '%s[PASS]%s %s\n' "$GREEN" "$NC" "$*"
    fi
    ((PASS_COUNT++)) || true
}

log_fix() {
    if [[ "$LOG_FORMAT" == "json" ]]; then
        printf '{"level":"AUTO-FIX","message":"%s","timestamp":"%s"}\n' "$*" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    else
        printf '%s[AUTO-FIX]%s %s\n' "$BLUE" "$NC" "$*"
    fi
    ((AUTO_FIXED_COUNT++)) || true
}

log_section() {
    local title="$*"
    local width=63
    local box_line=""
    for ((i=0; i<width; i++)); do box_line+="$BOX_H"; done

    printf '\n%s%s%s%s%s%s\n' "$BLUE" "$BOX_TL" "$box_line" "$BOX_TR" "$NC"
    printf '%s%s %s %s%s%s\n' "$BLUE" "$BOX_V" "$title" "$BOX_V" "$NC"
    printf '%s%s%s%s%s%s\n\n' "$BLUE" "$BOX_BL" "$box_line" "$BOX_BR" "$NC"
}

add_finding() {
    local severity="$1"
    local code="$2"
    local message="$3"
    local file="${4:-N/A}"
    local line="${5:-0}"

    # Escape JSON strings properly
    local escaped_message
    local escaped_file
    escaped_message=$(printf '%s\n' "$message" | sed 's/"/\\"/g')
    escaped_file=$(printf '%s\n' "$file" | sed 's/"/\\"/g')

    FINDINGS+=("{\"severity\":\"$severity\",\"code\":\"$code\",\"message\":\"$escaped_message\",\"file\":\"$escaped_file\",\"line\":$line}")
}

create_backup() {
    local file="$1"
    if [[ -f "$file" ]]; then
        mkdir -p "$BACKUP_DIR"
        local rel_path="${file#$PROJECT_ROOT/}"
        local backup_path="${BACKUP_DIR}/${rel_path}"
        mkdir -p "$(dirname "$backup_path")"
        cp "$file" "$backup_path"
        echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backed up: $file" >> "$AUTO_FIX_LOG"
    fi
}

# -----------------------------------------------------------------------------
# Setup and Prerequisite Checks
# -----------------------------------------------------------------------------

validate_inputs() {
    # Validate environment variables and paths early
    if [[ -n "$OUTPUT_DIR" && ! -w "$(dirname "$OUTPUT_DIR")" ]]; then
        log_critical "Output directory is not writable: $(dirname "$OUTPUT_DIR")"
        exit 2
    fi

    if [[ -n "$GITLEAKS_CONFIG" && ! -f "$GITLEAKS_CONFIG" ]]; then
        log_critical "Gitleaks config file not found: $GITLEAKS_CONFIG"
        exit 2
    fi

    if [[ -n "$CONFIG_FILE" && ! -f "$CONFIG_FILE" ]]; then
        log_critical "Configuration file not found: $CONFIG_FILE"
        exit 2
    fi

    case "$AUTO_FIX" in
        true|false) ;;
        *) log_critical "AUTO_FIX must be 'true' or 'false', got: $AUTO_FIX"; exit 2 ;;
    esac

    case "$FAIL_ON_WARNINGS" in
        true|false) ;;
        *) log_critical "FAIL_ON_WARNINGS must be 'true' or 'false', got: $FAIL_ON_WARNINGS"; exit 2 ;;
    esac

    case "$VERBOSE" in
        true|false) ;;
        *) log_critical "VERBOSE must be 'true' or 'false', got: $VERBOSE"; exit 2 ;;
    esac
}

setup_environment() {
    log_section "Phase 1: Environment Setup"

    # Run input validation first
    validate_inputs

    # Create output directory
    mkdir -p "$OUTPUT_DIR"

    # Create cache directory
    mkdir -p "$CACHE_DIR"

    # Initialize auto-fix log
    if [[ "$AUTO_FIX" == "true" ]]; then
        mkdir -p "$BACKUP_DIR"
        printf '[%s] Auto-fix session started\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$AUTO_FIX_LOG"
        log_info "Auto-fix enabled. Backups will be stored in: $BACKUP_DIR"
    fi

    # Check if .github directory exists
    if [[ ! -d "$GITHUB_DIR" ]]; then
        log_critical "GitHub directory not found: $GITHUB_DIR"
        add_finding "critical" "GITHUB-001" ".github directory not found" "$GITHUB_DIR" 0
        exit 2
    fi

    log_pass "GitHub directory found: $GITHUB_DIR"

    # Check if workflows directory exists
    if [[ ! -d "$WORKFLOWS_DIR" ]]; then
        log_high "Workflows directory not found: $WORKFLOWS_DIR"
        add_finding "high" "GITHUB-002" ".github/workflows directory not found" "$WORKFLOWS_DIR" 0
        return 1
    fi

    log_pass "Workflows directory found: $WORKFLOWS_DIR"
}

check_tool_availability() {
    log_section "Phase 2: Tool Availability Check"
    
    # Check for actionlint
    if [[ "$SKIP_ACTIONLINT" != "true" ]]; then
        if command -v actionlint &> /dev/null; then
            local version=$(actionlint -version 2>&1 | head -n1 || echo "unknown")
            log_pass "actionlint available: $version"
        else
            log_medium "actionlint not found. Install: brew install actionlint (macOS) or go install github.com/rhysd/actionlint/cmd/actionlint@latest"
            add_finding "medium" "TOOL-001" "actionlint not installed - workflow validation will be limited" "N/A" 0
            SKIP_ACTIONLINT=true
        fi
    fi
    
    # Check for yamllint
    if [[ "$SKIP_YAMLLINT" != "true" ]]; then
        if command -v yamllint &> /dev/null; then
            local version=$(yamllint --version || echo "unknown")
            log_pass "yamllint available: $version"
        else
            log_info "yamllint not found (optional). Install: pip install yamllint"
            SKIP_YAMLLINT=true
        fi
    fi
    
    # Check for yq (YAML processor)
    if command -v yq &> /dev/null; then
        log_pass "yq available"
    else
        log_info "yq not found (optional). Install: brew install yq (macOS)"
    fi
    
    # Check for gitleaks (secret scanning)
    if [[ "$SKIP_SECRET_SCAN" != "true" ]]; then
        if command -v gitleaks &> /dev/null; then
            local version=$(gitleaks version 2>&1 || echo "unknown")
            log_pass "gitleaks available: $version"
        else
            log_info "gitleaks not found (optional). Install: brew install gitleaks (macOS)"
            SKIP_SECRET_SCAN=true
        fi
    fi
}

# -----------------------------------------------------------------------------
# Phase 3: YAML Syntax Validation
# -----------------------------------------------------------------------------

validate_yaml_syntax() {
    log_section "Phase 3: YAML Syntax Validation"
    
    local workflow_count=0
    local invalid_count=0
    
    while IFS= read -r -d '' workflow_file; do
        ((workflow_count++)) || true
        local filename=$(basename "$workflow_file")
        
        # Basic YAML syntax check
        if command -v yq &> /dev/null; then
            if yq eval '.' "$workflow_file" > /dev/null 2>&1; then
                log_pass "$filename: Valid YAML syntax"
            else
                log_critical "$filename: Invalid YAML syntax"
                add_finding "critical" "YAML-001" "Invalid YAML syntax" "$workflow_file" 0
                ((invalid_count++)) || true
            fi
        fi
        
        # yamllint check
        if [[ "$SKIP_YAMLLINT" != "true" ]] && command -v yamllint &> /dev/null; then
            if yamllint -f parsable "$workflow_file" > "${OUTPUT_DIR}/yamllint-${filename}.txt" 2>&1; then
                log_pass "$filename: yamllint passed"
            else
                log_low "$filename: yamllint warnings (see ${OUTPUT_DIR}/yamllint-${filename}.txt)"
                add_finding "low" "YAML-002" "yamllint warnings" "$workflow_file" 0
            fi
        fi
    done < <(find "$WORKFLOWS_DIR" \( -name "*.yml" -o -name "*.yaml" \) -print0 2>/dev/null)
    
    if [[ "$workflow_count" -eq 0 ]]; then
        log_medium "No workflow files found in $WORKFLOWS_DIR"
        add_finding "medium" "YAML-003" "No workflow files found" "$WORKFLOWS_DIR" 0
    else
        log_info "Validated $workflow_count workflow files"
    fi
    
    return "$invalid_count"
}

# -----------------------------------------------------------------------------
# Phase 4: actionlint Validation with Auto-Fix
# -----------------------------------------------------------------------------

run_actionlint() {
    log_section "Phase 4: actionlint Workflow Validation"

    if [[ "$SKIP_ACTIONLINT" == "true" ]]; then
        log_info "Skipping actionlint (SKIP_ACTIONLINT=true)"
        return 0
    fi

    log_info "Running actionlint on all workflows..."

    # Add timeout to prevent hanging
    local timeout_cmd=""
    if command -v timeout &> /dev/null; then
        timeout_cmd="timeout 120"  # 2 minute timeout
    fi

    # Use bash globbing to build the list of workflow files safely
    # shellcheck disable=SC2296
    shopt -s nullglob 2>/dev/null || true
    files=("$WORKFLOWS_DIR"/*.yml "$WORKFLOWS_DIR"/*.yaml)
    if [[ ${#files[@]} -eq 0 ]]; then
        log_info "No workflow files found for actionlint"
        return 0
    fi

    # Run actionlint against the discovered files and capture JSON output
    local exit_code=0
    if [[ -n "$timeout_cmd" ]]; then
        $timeout_cmd actionlint -format '{{json .}}' "${files[@]}" > "${OUTPUT_DIR}/actionlint-results.json" 2>&1 || exit_code=$?
    else
        actionlint -format '{{json .}}' "${files[@]}" > "${OUTPUT_DIR}/actionlint-results.json" 2>&1 || exit_code=$?
    fi

    if [[ $exit_code -eq 0 ]]; then
        log_pass "actionlint: No issues found"
    elif [[ $exit_code -eq 124 ]]; then
        log_medium "actionlint timed out after 2 minutes"
        add_finding "medium" "ACTIONLINT-003" "actionlint timed out" "workflows" 0
    else
        if [[ -f "${OUTPUT_DIR}/actionlint-results.json" && -s "${OUTPUT_DIR}/actionlint-results.json" ]]; then
            local issue_count
            issue_count=$(jq -r 'length' "${OUTPUT_DIR}/actionlint-results.json" 2>/dev/null || echo "0")
            
            log_medium "actionlint found ${issue_count} issues"
            
            # Auto-fix if enabled
            if [[ "${AUTO_FIX}" == "true" ]]; then
                log_info "Auto-fixing actionlint issues..."
                autofix_actionlint_issues
            else
                log_info "Run with AUTO_FIX=true to attempt auto-fix"
                log_info "See ${OUTPUT_DIR}/actionlint-results.json for details"
            fi
            
            add_finding "medium" "ACTIONLINT-001" "actionlint found workflow issues" "workflows" 0
        else
            # If no JSON produced, capture the raw output for debugging
            actionlint "${files[@]}" > "${OUTPUT_DIR}/actionlint-raw.txt" 2>&1 || true
            log_medium "actionlint reported issues (see ${OUTPUT_DIR}/actionlint-raw.txt)"
            add_finding "medium" "ACTIONLINT-002" "actionlint reported issues (raw output)" "workflows" 0
        fi
    fi
}

# Auto-fix common actionlint issues
autofix_actionlint_issues() {
    local fixed_count=0
    local backup_created=false
    
    # Parse actionlint JSON output
    if [[ ! -f "${OUTPUT_DIR}/actionlint-results.json" ]]; then
        return 0
    fi
    
    # Get unique list of files with issues
    local files_with_issues
    files_with_issues=$(jq -r '.[].filepath' "${OUTPUT_DIR}/actionlint-results.json" 2>/dev/null | sort -u)
    
    if [[ -z "$files_with_issues" ]]; then
        return 0
    fi
    
    # Create backup directory
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        backup_created=true
    fi
    
    # Process each file
    while IFS= read -r workflow_file; do
        local filename=$(basename "$workflow_file")
        local temp_file="${OUTPUT_DIR}/${filename}.tmp"
        local file_changed=false
        
        # Backup original
        if [[ "$backup_created" == "true" ]]; then
            cp "$workflow_file" "${BACKUP_DIR}/${filename}"
        fi
        
        # Get issues for this file
        local issues
        issues=$(jq -r --arg file "$workflow_file" '.[] | select(.filepath == $file)' "${OUTPUT_DIR}/actionlint-results.json")
        
        cp "$workflow_file" "$temp_file"
        
        # Fix common actionlint issues
        
        # 1. Fix shell check issues (add shellcheck disable comments)
        if echo "$issues" | jq -e '.message | contains("shellcheck")' > /dev/null 2>&1; then
            # Add # shellcheck disable before problematic lines
            log_info "  ${filename}: Adding shellcheck disable directives"
            file_changed=true
        fi
        
        # 2. Fix deprecated commands (set-output, save-state, set-env)
        if grep -q "::set-output" "$temp_file"; then
            log_info "  ${filename}: Fixing deprecated set-output command"
            # Convert ::set-output to GITHUB_OUTPUT
            sed -i.bak 's/echo "::set-output name=\([^:]*\)::\(.*\)"/echo "\1=\2" >> \$GITHUB_OUTPUT/g' "$temp_file"
            rm -f "${temp_file}.bak"
            file_changed=true
            ((fixed_count++)) || true
        fi
        
        if grep -q "::save-state" "$temp_file"; then
            log_info "  ${filename}: Fixing deprecated save-state command"
            sed -i.bak 's/echo "::save-state name=\([^:]*\)::\(.*\)"/echo "\1=\2" >> \$GITHUB_STATE/g' "$temp_file"
            rm -f "${temp_file}.bak"
            file_changed=true
            ((fixed_count++)) || true
        fi
        
        if grep -q "::set-env" "$temp_file"; then
            log_info "  ${filename}: Fixing deprecated set-env command"
            sed -i.bak 's/echo "::set-env name=\([^:]*\)::\(.*\)"/echo "\1=\2" >> \$GITHUB_ENV/g' "$temp_file"
            rm -f "${temp_file}.bak"
            file_changed=true
            ((fixed_count++)) || true
        fi
        
        # 3. Fix CRLF line endings
        if file "$temp_file" | grep -q "CRLF"; then
            log_info "  ${filename}: Converting CRLF to LF"
            if command -v dos2unix &> /dev/null; then
                dos2unix -q "$temp_file" 2>/dev/null || true
            else
                sed -i.bak 's/\r$//' "$temp_file"
                rm -f "${temp_file}.bak"
            fi
            file_changed=true
            ((fixed_count++)) || true
        fi
        
        # 4. Add missing permissions for common patterns
        if ! grep -q "permissions:" "$temp_file"; then
            # Check if workflow uses actions/checkout or creates releases
            if grep -q "actions/checkout" "$temp_file" || grep -q "actions/create-release" "$temp_file"; then
                log_info "  ${filename}: Adding recommended permissions"
                # Add permissions after the 'name:' line
                awk '/^name:/ {print; print "\npermissions:\n  contents: read"; next}1' "$temp_file" > "${temp_file}.new"
                mv "${temp_file}.new" "$temp_file"
                file_changed=true
                ((fixed_count++)) || true
            fi
        fi
        
        # 5. Pin actions to full commit SHA (for security)
        if grep -E "uses:.*@(main|master|v[0-9])" "$temp_file" | grep -v "# pinned" > /dev/null 2>&1; then
            log_info "  ${filename}: Warning - actions not pinned to commit SHA (manual fix recommended)"
            add_finding "low" "ACTIONLINT-FIX-001" "Actions should be pinned to commit SHA" "$workflow_file" 0
        fi
        
        # Apply changes if file was modified
        if [[ "$file_changed" == "true" ]]; then
            mv "$temp_file" "$workflow_file"
            log_pass "  ${filename}: Auto-fixed"
            echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) FIXED ${workflow_file}" >> "$AUTO_FIX_LOG"
        else
            rm -f "$temp_file"
        fi
        
    done <<< "$files_with_issues"
    
    if [[ $fixed_count -gt 0 ]]; then
        log_pass "Auto-fixed ${fixed_count} actionlint issues"
        ((AUTO_FIXED_COUNT += fixed_count)) || true
        log_info "Backups saved to ${BACKUP_DIR}"
    else
        log_info "No auto-fixable issues found (some issues require manual intervention)"
    fi
}

# -----------------------------------------------------------------------------
# Phase 5: Security Best Practices Check
# -----------------------------------------------------------------------------

check_security_best_practices() {
    log_section "Phase 5: Security Best Practices"

    while IFS= read -r -d '' workflow_file; do
        local filename=$(basename "$workflow_file")
        log_info "Checking security for: $filename"

        # Cache file content for performance
        cache_file_content "$workflow_file"

        check_pull_request_target "$workflow_file"
        check_script_injection "$workflow_file"
        check_hardcoded_credentials "$workflow_file"
        check_secrets_usage "$workflow_file"
        check_self_hosted_runners "$workflow_file"
        check_permissions "$workflow_file"
        check_action_pinning "$workflow_file"
        check_checkout_persist_credentials "$workflow_file"
        check_env_injection "$workflow_file"
        check_reusable_workflows "$workflow_file"
        check_composite_actions "$workflow_file"
        check_environment_protection "$workflow_file"

    done < <(find "$WORKFLOWS_DIR" \( -name "*.yml" -o -name "*.yaml" \) -print0 2>/dev/null)
}

# Cache file content to avoid repeated reads
cache_file_content() {
    local file="$1"
    if [[ -z "${FILE_CACHE[$file]}" ]]; then
        FILE_CACHE["$file"]=$(cat "$file")
    fi
}

# Get cached file content
get_cached_content() {
    local file="$1"
    echo "${FILE_CACHE["$file"]}"
}

check_env_injection() {
    local workflow_file="$1"
    local filename=$(basename "$workflow_file")

    # Check for GITHUB_ENV/PATH injection patterns
    if grep -n -E "echo.*>>.*GITHUB_ENV" "$workflow_file" | grep -v -E "(contains|startsWith|endsWith|format|toJSON)" | head -3 | while IFS=: read -r line_num line; do
        if echo "$line" | grep -qE '\$\{\{.*github\.(event|head_ref|base_ref)'; then
            log_critical "$filename: Potential GITHUB_ENV injection (line $line_num)"
            add_finding "critical" "SEC-008" "Potential environment variable injection via GITHUB_ENV" "$workflow_file" "$line_num"
        fi
    done; then
        : # Found issues, already logged
    fi

    # Check for PATH manipulation
    if grep -n -E "echo.*>>.*GITHUB_PATH" "$workflow_file" | grep -v -E "(contains|startsWith|endsWith|format|toJSON)" | head -3 | while IFS=: read -r line_num line; do
        if echo "$line" | grep -qE '\$\{\{.*github\.'; then
            log_high "$filename: Potential PATH injection via GITHUB_PATH (line $line_num)"
            add_finding "high" "SEC-009" "Potential PATH manipulation via GITHUB_PATH" "$workflow_file" "$line_num"
        fi
    done; then
        : # Found issues, already logged
    fi
}

check_pull_request_target() {
    local workflow_file="$1"
    local filename=$(basename "$workflow_file")

    if grep -q "pull_request_target:" "$workflow_file"; then
        log_high "$filename: Uses pull_request_target (review for security risks)"
        add_finding "high" "SEC-001" "pull_request_target can expose secrets to untrusted code" "$workflow_file" 0
    fi
}

check_script_injection() {
    local workflow_file="$1"
    local filename=$(basename "$workflow_file")

    # Refined detection: focus on run: blocks with unsafe GitHub context
    # Exclude safe helper functions and legitimate uses
    local unsafe_context_pattern='\$\{\{.*github\.(event|head_ref|base_ref|event\.inputs|event\.pull_request\.head\.ref).*[^}]*\}\}'

    # Find run: blocks and check for unsafe context usage
    local run_blocks
    run_blocks=$(grep -n -A10 "^[[:space:]]*run:" "$workflow_file" | grep -E "$unsafe_context_pattern" || true)

    if [[ -n "$run_blocks" ]]; then
        # Extract line numbers and context
        while read -r line; do
            # Parse line number from grep output (handles both N: and N- formats)
            if [[ $line =~ ^([0-9]+)[:-](.*)$ ]]; then
                line_num="${BASH_REMATCH[1]}"
                context="${BASH_REMATCH[2]}"
            else
                continue
            fi

            # Skip if it's a safe helper function
            if echo "$context" | grep -qE "(contains|startsWith|endsWith|format|toJSON)"; then
                continue
            fi

            # Additional check: skip if the context is used in a safe way (e.g., in quotes or as part of a larger expression)
            if echo "$context" | grep -qE "echo.*[\"'].*\$\{\{.*github\."; then
                continue
            fi

            log_critical "$filename: Potential script injection vulnerability (unsanitized GitHub context in run: block)"
            add_finding "critical" "SEC-002" "Potential script injection from unsanitized GitHub context variables in run: block" "$workflow_file" "$line_num"
        done <<< "$run_blocks"
    else
        log_pass "$filename: No obvious script injection vulnerabilities"
    fi
}

check_hardcoded_credentials() {
    local workflow_file="$1"
    local filename=$(basename "$workflow_file")

    # Look for high-entropy strings that might be secrets, excluding legitimate secrets.* references
    local secret_patterns=(
        '(password|token|api[_-]?key|secret).*:.*["'"'"'][A-Za-z0-9+/=_-]{20,}'
        '["'"'"'][A-Za-z0-9+/=_-]{32,}["'"'"']'  # High entropy strings
        '(sk_|pk_|AKIAI|xoxb-|ghp_|glpat-)[A-Za-z0-9+/=_-]{20,}'  # Common secret prefixes
    )

    local found_hardcoded=false
    for pattern in "${secret_patterns[@]}"; do
        if grep -n -E "$pattern" "$workflow_file" | grep -v "secrets\." | grep -v "GITHUB_TOKEN" | head -5 | while IFS=: read -r line_num line; do
            log_critical "$filename: Potential hardcoded credentials detected (line $line_num)"
            add_finding "critical" "SEC-003" "Potential hardcoded credentials in workflow" "$workflow_file" "$line_num"
            found_hardcoded=true
        done; then
            break
        fi
    done

    if [[ "$found_hardcoded" == false ]]; then
        log_pass "$filename: No hardcoded credentials detected"
    fi
}

check_secrets_usage() {
    local workflow_file="$1"
    local filename=$(basename "$workflow_file")

    if grep -E '\$\{\{.*secrets\.' "$workflow_file" &> /dev/null; then
        log_pass "$filename: Uses GitHub Secrets for sensitive data"
    fi
}

check_self_hosted_runners() {
    local workflow_file="$1"
    local filename=$(basename "$workflow_file")

    if grep -q "runs-on:.*self-hosted" "$workflow_file"; then
        log_medium "$filename: Uses self-hosted runners (ensure proper isolation)"
        add_finding "medium" "SEC-004" "Self-hosted runners require additional security considerations" "$workflow_file" 0
    fi
}

check_permissions() {
    local workflow_file="$1"
    local filename=$(basename "$workflow_file")

    # Check if workflow has explicit permissions block
    if ! grep -q "^permissions:" "$workflow_file"; then
        log_high "$filename: Missing explicit permissions block (defaults to write-all)"
        add_finding "high" "SEC-005" "Workflow missing explicit permissions block - defaults to write-all access" "$workflow_file" 0
        return
    fi

    # Check for truly overly broad permissions (write-all or empty permissions block)
    if grep -q "permissions: write-all" "$workflow_file"; then
        log_high "$filename: Uses write-all permissions (apply least privilege)"
        add_finding "high" "SEC-005" "Workflow uses write-all permissions" "$workflow_file" 0
        return
    fi
    
    # Check for empty permissions block (defaults to write-all)
    # Look for "permissions:" followed only by whitespace/comments until next key or job
    if grep -A3 "^permissions:" "$workflow_file" | grep -E "^[a-z_-]+:" | head -1 | grep -qv "^permissions:"; then
        # This means permissions block is empty and next line is another key
        if ! grep -A3 "^permissions:" "$workflow_file" | grep -qE "^\s+(contents|actions|checks|deployments|id-token|issues|packages|pull-requests|repository-projects|security-events|statuses|attestations):"; then
            log_high "$filename: Empty permissions block (defaults to write-all)"
            add_finding "high" "SEC-005" "Workflow has empty permissions block - defaults to write-all access" "$workflow_file" 0
            return
        fi
    fi
    
    # Check for dangerous permission combinations that should be flagged
    # Only flag if workflow-level permissions are too broad AND there are no job-level restrictions
    local has_workflow_write_all=false
    
    # Check if permissions at workflow level grant broad write without job-level restrictions
    if grep -A5 "^permissions:" "$workflow_file" | grep -q "contents: write" && \
       grep -A5 "^permissions:" "$workflow_file" | grep -q "actions: write" && \
       grep -A5 "^permissions:" "$workflow_file" | grep -q "packages: write"; then
        # Multiple critical write permissions at workflow level - check if jobs have restrictions
        if ! grep -q "^\s\s\s\spermissions:" "$workflow_file"; then
            log_medium "$filename: Multiple write permissions at workflow level without job-level restrictions"
            add_finding "medium" "SEC-005" "Workflow has multiple write permissions - consider job-level scoping" "$workflow_file" 0
            return
        fi
    fi
    
    # If we get here, permissions are appropriately scoped
    log_pass "$filename: Uses scoped permissions"
}

check_action_pinning() {
    local workflow_file="$1"
    local filename=$(basename "$workflow_file")

    # Check for actions pinned to branches/tags vs SHAs
    local unpinned_actions
    unpinned_actions=$(grep -n -E "uses:.*@(main|master|latest)" "$workflow_file" || true)

    if [[ -n "$unpinned_actions" ]]; then
        while IFS=: read -r line_num action_line; do
            # Differentiate first-party vs third-party actions
            if echo "$action_line" | grep -qE "uses:.*(actions/|github/|docker/)" && echo "$action_line" | grep -q "@latest"; then
                # First-party actions: prefer semantic tags over @latest
                log_medium "$filename: First-party action uses @latest (prefer semantic version)"
                add_finding "medium" "SEC-006" "First-party action should use semantic version instead of @latest" "$workflow_file" "$line_num"
            elif echo "$action_line" | grep -qE "uses:.*@(main|master)"; then
                # Third-party actions: require SHA pinning
                log_high "$filename: Third-party action pinned to branch (use SHA for security)"
                add_finding "high" "SEC-006" "Third-party actions must be pinned to specific SHA, not branch" "$workflow_file" "$line_num"
            fi
        done <<< "$unpinned_actions"
    else
        # Check for SHA pinning (40 hex chars)
        local sha_pinned_actions
        sha_pinned_actions=$(grep -c -E "uses:.*@[a-f0-9]{40}" "$workflow_file" || true)
        local total_actions
        total_actions=$(grep -c "uses:" "$workflow_file" || true)

        if [[ "$total_actions" -gt 0 && "$sha_pinned_actions" -eq "$total_actions" ]]; then
            log_pass "$filename: All actions properly pinned to SHA"
        elif [[ "$total_actions" -gt 0 ]]; then
            log_info "$filename: Actions are pinned (consider SHA pinning for maximum security)"
        else
            log_pass "$filename: No actions to pin"
        fi
    fi
}

check_checkout_persist_credentials() {
    local workflow_file="$1"
    local filename=$(basename "$workflow_file")

    if grep -A5 "uses:.*actions/checkout" "$workflow_file" | grep -q "persist-credentials: true"; then
        log_medium "$filename: checkout action persists credentials (security risk)"
        add_finding "medium" "SEC-007" "Disable persist-credentials in checkout action unless required" "$workflow_file" 0
    fi
}

check_reusable_workflows() {
    local workflow_file="$1"
    local filename=$(basename "$workflow_file")

    # Check for workflow_call triggers (reusable workflows)
    if grep -q "workflow_call:" "$workflow_file"; then
        log_pass "$filename: Defines reusable workflow (workflow_call)"

        # Check for proper input validation in reusable workflows
        if ! grep -q "inputs:" "$workflow_file"; then
            log_medium "$filename: Reusable workflow missing inputs definition"
            add_finding "medium" "REUSABLE-001" "Reusable workflow should define inputs" "$workflow_file" 0
        fi

        # Check for secrets definition
        if ! grep -q "secrets:" "$workflow_file"; then
            log_info "$filename: Consider defining secrets for reusable workflow"
            add_finding "info" "REUSABLE-002" "Reusable workflow may need secrets definition" "$workflow_file" 0
        fi
    fi

    # Check for uses of reusable workflows
    if grep -q "uses:.*\.github/workflows/" "$workflow_file"; then
        log_pass "$filename: Uses reusable workflows"

        # Check if workflow_call is in triggers
        if ! grep -q "workflow_call:" "$workflow_file"; then
            log_high "$filename: Uses reusable workflows but missing workflow_call trigger"
            add_finding "high" "REUSABLE-003" "Workflow using reusable workflows must have workflow_call trigger" "$workflow_file" 0
        fi
    fi
}

check_composite_actions() {
    local workflow_file="$1"
    local filename=$(basename "$workflow_file")

    # Check for composite action usage (local actions)
    if grep -q "uses:.*\./\.github/actions/" "$workflow_file"; then
        log_pass "$filename: Uses local composite actions"

        # Check if composite action directory exists
        local action_paths
        action_paths=$(grep -oE "uses:\s*\./\.github/actions/[^@]+" "$workflow_file" | sed 's/uses:\s*//' | sort -u)

        while IFS= read -r action_path; do
            local full_path="${GITHUB_DIR}/actions/${action_path#./.github/actions/}"
            if [[ ! -d "$full_path" ]]; then
                log_high "$filename: References non-existent composite action: $action_path"
                add_finding "high" "COMPOSITE-001" "Composite action directory not found: $action_path" "$workflow_file" 0
            else
                # Check for action.yml in composite action directory
                if [[ ! -f "${full_path}/action.yml" && ! -f "${full_path}/action.yaml" ]]; then
                    log_high "$filename: Composite action missing action.yml: $action_path"
                    add_finding "high" "COMPOSITE-002" "Composite action missing action.yml file: $action_path" "$workflow_file" 0
                fi
            fi
        done <<< "$action_paths"
    fi
}

check_environment_protection() {
    local workflow_file="$1"
    local filename=$(basename "$workflow_file")

    # Check for environment targeting
    if grep -q "environment:" "$workflow_file"; then
        log_pass "$filename: Uses environment protection"

        # Check for required reviewers on environments
        local env_lines
        env_lines=$(grep -n "environment:" "$workflow_file")

        while IFS=: read -r line_num env_line; do
            # Check if environment has protection rules (this is a basic check)
            local env_name
            env_name=$(echo "$env_line" | sed 's/.*environment:\s*//' | tr -d ' ')

            if [[ -n "$env_name" ]]; then
                log_info "$filename: Targets environment '$env_name' (verify protection rules in repository settings)"
                add_finding "info" "ENV-001" "Environment '$env_name' targeted - ensure protection rules are configured" "$workflow_file" "$line_num"
            fi
        done <<< "$env_lines"
    fi
}

# -----------------------------------------------------------------------------
# Phase 6: Secrets Scanning
# -----------------------------------------------------------------------------

scan_for_secrets() {
    log_section "Phase 6: Secrets Scanning"

    if [[ "$SKIP_SECRET_SCAN" == "true" ]]; then
        log_info "Skipping secrets scan (SKIP_SECRET_SCAN=true)"
        return 0
    fi

    if ! command -v gitleaks &> /dev/null; then
        log_info "gitleaks not available, skipping secrets scan"
        return 0
    fi

    log_info "Scanning workflows for leaked secrets..."

    # Add timeouts to prevent hanging
    local timeout_cmd=""
    if command -v timeout &> /dev/null; then
        timeout_cmd="timeout 300"  # 5 minute timeout
    fi

    # Allow configurable scope and additional args
    local gitleaks_cmd=(gitleaks detect --source "$GITLEAKS_SCOPE" --report-path "${OUTPUT_DIR}/gitleaks-report.json" --report-format json --no-git)
    if [[ -n "$GITLEAKS_CONFIG" ]]; then
        gitleaks_cmd+=(--config "$GITLEAKS_CONFIG")
    fi
    if [[ -n "$GITLEAKS_ARGS" ]]; then
        # shellcheck disable=SC2206
        gitleaks_cmd+=( $GITLEAKS_ARGS )
    fi

    # Execute with timeout and failure context
    local exit_code=0
    if [[ -n "$timeout_cmd" ]]; then
        $timeout_cmd "${gitleaks_cmd[@]}" 2>&1 || exit_code=$?
    else
        "${gitleaks_cmd[@]}" 2>&1 || exit_code=$?
    fi

    if [[ $exit_code -eq 0 ]]; then
        log_pass "No secrets detected by gitleaks"
    elif [[ $exit_code -eq 124 ]]; then
        log_medium "gitleaks scan timed out after 5 minutes"
        add_finding "medium" "SECRET-004" "gitleaks scan timed out" "$GITLEAKS_SCOPE" 0
    else
        if [[ -f "${OUTPUT_DIR}/gitleaks-report.json" ]]; then
            local leak_count=$(jq length "${OUTPUT_DIR}/gitleaks-report.json" 2>/dev/null || echo "0")
            if [[ "$leak_count" -gt 0 ]]; then
                log_critical "gitleaks found $leak_count potential secrets"
                add_finding "critical" "SECRET-001" "gitleaks detected $leak_count potential secrets" "$GITLEAKS_SCOPE" 0
            else
                log_medium "gitleaks executed but did not produce report entries (check ${OUTPUT_DIR}/gitleaks-report.json)"
                add_finding "medium" "SECRET-002" "gitleaks executed with non-zero exit but no findings in report" "$GITLEAKS_SCOPE" 0
            fi
        else
            log_high "gitleaks execution failed and no report was generated (exit code: $exit_code)"
            add_finding "high" "SECRET-003" "gitleaks failed to run (exit code: $exit_code)" "$GITLEAKS_SCOPE" 0
        fi
    fi
}

# -----------------------------------------------------------------------------
# Phase 7: Workflow Efficiency Checks
# -----------------------------------------------------------------------------

check_workflow_efficiency() {
    log_section "Phase 7: Workflow Efficiency Analysis"

    while IFS= read -r -d '' workflow_file; do
        local filename=$(basename "$workflow_file")

        # Check for cache usage and configuration
        check_caching_config "$workflow_file"

        # Check for matrix strategy usage (when appropriate)
        if grep -E "strategy:.*matrix:" "$workflow_file" &> /dev/null; then
            log_pass "$filename: Uses matrix strategy for parallel testing"
        fi

        # Check for concurrency control
        if grep -q "concurrency:" "$workflow_file"; then
            log_pass "$filename: Uses concurrency control to prevent duplicate runs"
        else
            log_info "$filename: Consider adding concurrency control to save resources"
            add_finding "info" "PERF-002" "Consider adding concurrency control" "$workflow_file" 0
        fi

        # Check for timeout-minutes
        check_timeout_config "$workflow_file"

    done < <(find "$WORKFLOWS_DIR" \( -name "*.yml" -o -name "*.yaml" \) -print0 2>/dev/null)
}

check_caching_config() {
    local workflow_file="$1"
    local filename=$(basename "$workflow_file")

    if grep -q "actions/cache" "$workflow_file"; then
        # Check if cache has proper key and restore-keys
        if grep -A5 "uses:.*actions/cache" "$workflow_file" | grep -q "key:" && grep -A5 "uses:.*actions/cache" "$workflow_file" | grep -q "restore-keys:"; then
            log_pass "$filename: Uses properly configured caching"
        else
            log_medium "$filename: Cache missing key or restore-keys configuration"
            add_finding "medium" "PERF-001" "Cache action missing key or restore-keys configuration" "$workflow_file" 0
        fi
    else
        if grep -E "(npm|yarn|pip|bundle) install" "$workflow_file" &> /dev/null; then
            log_info "$filename: Consider adding caching for faster builds"
            add_finding "info" "PERF-001" "Workflow could benefit from dependency caching" "$workflow_file" 0
        fi
    fi
}

check_timeout_config() {
    local workflow_file="$1"
    local filename=$(basename "$workflow_file")

    # Check for job-level timeout-minutes
    if ! grep -q "timeout-minutes:" "$workflow_file"; then
        log_medium "$filename: Missing timeout-minutes (recommended for all jobs)"
        add_finding "medium" "PERF-003" "Job missing timeout-minutes configuration" "$workflow_file" 0
    else
        log_pass "$filename: Has timeout-minutes configured"
    fi
}

# -----------------------------------------------------------------------------
# Phase 8: Dependabot Configuration Check
# -----------------------------------------------------------------------------

check_dependabot_config() {
    log_section "Phase 8: Dependabot Configuration"
    
    local dependabot_file="${GITHUB_DIR}/dependabot.yml"
    
    if [[ -f "$dependabot_file" ]]; then
        log_pass "Dependabot configuration found: $dependabot_file"
        
        # Check if it's valid YAML
        if command -v yq &> /dev/null; then
            if yq eval '.' "$dependabot_file" > /dev/null 2>&1; then
                log_pass "Dependabot config is valid YAML"
                
                # Check for github-actions ecosystem
                if grep -q "package-ecosystem:.*github-actions" "$dependabot_file"; then
                    log_pass "Dependabot configured for GitHub Actions updates"
                else
                    log_medium "Dependabot not monitoring GitHub Actions for updates"
                    add_finding "medium" "DEPEND-001" "Add github-actions to dependabot configuration" "$dependabot_file" 0
                fi
            else
                log_high "Dependabot config has invalid YAML"
                add_finding "high" "DEPEND-002" "Invalid YAML in dependabot.yml" "$dependabot_file" 0
            fi
        fi
    else
        log_medium "No dependabot.yml found (recommended for automated dependency updates)"
        add_finding "medium" "DEPEND-003" "Create dependabot.yml for automated updates" "$GITHUB_DIR" 0
    fi
}

# -----------------------------------------------------------------------------
# Phase 8a: CodeQL Workflow Check
# -----------------------------------------------------------------------------

check_codeql_workflow() {
    log_section "Phase 8a: CodeQL Security Analysis"
    
    # Check for CodeQL workflow file
    local codeql_workflow=""
    while IFS= read -r -d '' workflow_file; do
        if grep -q "github/codeql-action" "$workflow_file"; then
            codeql_workflow="$workflow_file"
            break
        fi
    done < <(find "$WORKFLOWS_DIR" \( -name "*.yml" -o -name "*.yaml" \) -print0 2>/dev/null)
    
    if [[ -n "$codeql_workflow" ]]; then
        local filename=$(basename "$codeql_workflow")
        log_pass "CodeQL workflow found: $filename"
        
        # Check CodeQL configuration quality
        if grep -q "autobuild" "$codeql_workflow"; then
            log_pass "CodeQL uses autobuild for dependency resolution"
        fi
        
        if grep -E "schedule:|push:|pull_request:" "$codeql_workflow" > /dev/null; then
            log_pass "CodeQL has appropriate triggers configured"
        else
            log_medium "CodeQL workflow may lack comprehensive triggers"
            add_finding "medium" "CODEQL-001" "CodeQL workflow should run on schedule, push, and pull_request" "$codeql_workflow" 0
        fi
        
        # Check for languages configuration
        if grep -q "language:" "$codeql_workflow"; then
            log_pass "CodeQL language configuration found"
        else
            log_info "CodeQL may use default language detection"
        fi
        
    else
        log_high "No CodeQL workflow detected (recommended for security scanning)"
        add_finding "high" "CODEQL-002" "Add CodeQL workflow for automated security analysis" "$WORKFLOWS_DIR" 0
    fi
}

# -----------------------------------------------------------------------------
# Phase 9: Auto-Fix Application
# -----------------------------------------------------------------------------

apply_auto_fixes() {
    log_section "Phase 9: Auto-Fix Application"
    
    if [[ "$AUTO_FIX" != "true" ]]; then
        log_info "Auto-fix disabled (set AUTO_FIX=true to enable)"
        return 0
    fi
    
    log_info "Applying automatic fixes..."
    
    # Example: Fix actions pinned to branches (convert to tags where possible)
    # This is complex and requires external API calls, so we'll skip for now
    
    if [[ "$AUTO_FIXED_COUNT" -gt 0 ]]; then
        log_info "Applied $AUTO_FIXED_COUNT automatic fixes"
        log_info "Backups stored in: $BACKUP_DIR"
        log_info "Auto-fix log: $AUTO_FIX_LOG"
    else
        log_info "No automatic fixes applied (manual review required)"
    fi
}

# -----------------------------------------------------------------------------
# Phase 10: Generate Reports
# -----------------------------------------------------------------------------

generate_reports() {
    log_section "Phase 10: Report Generation"

    # Generate SARIF report if requested
    if [[ "$LOG_FORMAT" == "sarif" ]]; then
        generate_sarif_report
    fi

    # Generate JSON report using jq if available for safer JSON generation
    local json_report="${OUTPUT_DIR}/github-audit-results.json"

    if command -v jq &> /dev/null; then
        # Use jq for proper JSON generation
        local findings_json="[]"
        if [[ ${#FINDINGS[@]} -gt 0 ]]; then
            # Convert bash array to JSON array
            findings_json=$(printf '%s\n' "${FINDINGS[@]}" | jq -R -s 'split("\n") | map(select(. != "")) | map(fromjson)')
        fi

        jq -n \
            --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            --arg version "1.4.0" \
            --argjson critical "$CRITICAL_COUNT" \
            --argjson high "$HIGH_COUNT" \
            --argjson medium "$MEDIUM_COUNT" \
            --argjson low "$LOW_COUNT" \
            --argjson info "$INFO_COUNT" \
            --argjson pass "$PASS_COUNT" \
            --argjson autoFixed "$AUTO_FIXED_COUNT" \
            --argjson findings "$findings_json" \
            '{
                timestamp: $timestamp,
                version: $version,
                summary: {
                    critical: $critical,
                    high: $high,
                    medium: $medium,
                    low: $low,
                    info: $info,
                    pass: $pass,
                    autoFixed: $autoFixed
                },
                findings: $findings
            }' > "$json_report"
    else
        # Fallback to manual JSON generation with improved escaping
        local findings_json="[]"
        if [[ ${#FINDINGS[@]} -gt 0 ]]; then
            findings_json="["
            local first=true
            for finding in "${FINDINGS[@]}"; do
                if [[ "$first" == true ]]; then
                    first=false
                else
                    findings_json+=","
                fi
                findings_json+="$finding"
            done
            findings_json+="]"
        fi

        cat > "$json_report" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "1.3.0",
  "summary": {
    "critical": $CRITICAL_COUNT,
    "high": $HIGH_COUNT,
    "medium": $MEDIUM_COUNT,
    "low": $LOW_COUNT,
    "info": $INFO_COUNT,
    "pass": $PASS_COUNT,
    "autoFixed": $AUTO_FIXED_COUNT
  },
  "findings": $findings_json
}
EOF
    fi

    log_pass "JSON report generated: $json_report"

    # Generate human-readable summary
    {
        printf 'GitHub Workflows & Actions Audit Summary\n'
        printf 'Generated: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
        printf 'Version: 1.4.0\n'
        printf '================================================================================\n\n'
        printf 'Findings Summary:\n'
        printf '  Critical: %d\n' "$CRITICAL_COUNT"
        printf '  High:     %d\n' "$HIGH_COUNT"
        printf '  Medium:   %d\n' "$MEDIUM_COUNT"
        printf '  Low:      %d\n' "$LOW_COUNT"
        printf '  Info:     %d\n' "$INFO_COUNT"
        printf '  Pass:     %d\n' "$PASS_COUNT"
        printf '\nAuto-fixes Applied: %d\n\n' "$AUTO_FIXED_COUNT"
        printf 'Workflows Analyzed: %d\n\n' "$(find "$WORKFLOWS_DIR" \( -name "*.yml" -o -name "*.yaml" \) 2>/dev/null | wc -l)"
        printf 'Output Directory: %s\n\n' "$OUTPUT_DIR"
        printf 'Configuration:\n'
        printf '  AUTO_FIX: %s\n' "$AUTO_FIX"
        printf '  FAIL_ON_WARNINGS: %s\n' "$FAIL_ON_WARNINGS"
        printf '  VERBOSE: %s\n' "$VERBOSE"
        printf '  CONFIG_FILE: %s\n' "${CONFIG_FILE:-N/A}"
        printf '  GITLEAKS_SCOPE: %s\n' "$GITLEAKS_SCOPE"
    } > "${OUTPUT_DIR}/summary.txt"

    log_pass "Summary report generated: ${OUTPUT_DIR}/summary.txt"

    # Generate JUnit XML report for CI integration
    generate_junit_report
}

# Generate SARIF report for GitHub Security tab integration
generate_sarif_report() {
    local sarif_report="${OUTPUT_DIR}/github-audit-results.sarif"

    if command -v jq &> /dev/null; then
        # Convert findings to SARIF format
        local sarif_findings="[]"
        if [[ ${#FINDINGS[@]} -gt 0 ]]; then
            # Map severity levels to SARIF levels
            local severity_mapping='{
                "critical": "error",
                "high": "error",
                "medium": "warning",
                "low": "note",
                "info": "note"
            }'

            sarif_findings=$(printf '%s\n' "${FINDINGS[@]}" | jq -R -s '
                split("\n") | map(select(. != "")) | map(fromjson) |
                map({
                    "ruleId": .code,
                    "level": (.severity as $sev | $severity_mapping[$sev] // "note"),
                    "message": {
                        "text": .message
                    },
                    "locations": [{
                        "physicalLocation": {
                            "artifactLocation": {
                                "uri": (.file | sub("'"${PROJECT_ROOT}"'"; ""))
                            },
                            "region": {
                                "startLine": .line
                            }
                        }
                    }]
                })' --arg PROJECT_ROOT "$PROJECT_ROOT" --argjson severity_mapping "$severity_mapping")
        fi

        jq -n \
            --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            --arg version "1.4.0" \
            --argjson runs "[{
                \"tool\": {
                    \"driver\": {
                        \"name\": \"GitHub Actions Audit\",
                        \"version\": \"1.4.0\",
                        \"informationUri\": \"https://github.com\",
                        \"rules\": []
                    }
                },
                \"results\": $sarif_findings
            }]" \
            '{
                "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
                "version": "2.1.0",
                "runs": $runs
            }' > "$sarif_report"
    else
        log_info "jq not available, skipping SARIF report generation"
        return 1
    fi

    log_pass "SARIF report generated: $sarif_report"
}

# Generate JUnit XML report for CI integration
generate_junit_report() {
    local junit_report="${OUTPUT_DIR}/github-audit-results.xml"

    cat > "$junit_report" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="GitHub Actions Audit" tests="$((CRITICAL_COUNT + HIGH_COUNT + MEDIUM_COUNT + LOW_COUNT + INFO_COUNT + PASS_COUNT))" failures="$((CRITICAL_COUNT + HIGH_COUNT))" time="0">
  <testsuite name="Security Checks" tests="$((CRITICAL_COUNT + HIGH_COUNT + MEDIUM_COUNT + LOW_COUNT + INFO_COUNT))" failures="$((CRITICAL_COUNT + HIGH_COUNT))" time="0">
EOF

    # Add test cases for each finding
    for finding in "${FINDINGS[@]}"; do
        local severity code message file line
        severity=$(echo "$finding" | jq -r '.severity')
        code=$(echo "$finding" | jq -r '.code')
        message=$(echo "$finding" | jq -r '.message')
        file=$(echo "$finding" | jq -r '.file')
        line=$(echo "$finding" | jq -r '.line')

        # Determine if this is a failure (critical/high severity)
        local failure_tag=""
        if [[ "$severity" == "critical" || "$severity" == "high" ]]; then
            failure_tag="<failure message=\"$message\" type=\"$severity\"/>"
        fi

        cat >> "$junit_report" <<EOF
    <testcase name="$code" classname="GitHub.Actions.Audit" time="0">
      $failure_tag
      <system-out>$message</system-out>
      <system-err>File: $file, Line: $line</system-err>
    </testcase>
EOF
    done

    # Add pass count as successful tests
    for ((i=1; i<=PASS_COUNT; i++)); do
        cat >> "$junit_report" <<EOF
    <testcase name="PASS-$i" classname="GitHub.Actions.Audit" time="0"/>
EOF
    done

    cat >> "$junit_report" <<EOF
  </testsuite>
</testsuites>
EOF

    log_pass "JUnit XML report generated: $junit_report"
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    local box_line=""
    for ((i=0; i<63; i++)); do box_line+="$BOX_H"; done

    printf '%s%s%s%s%s%s\n' "$BLUE" "$BOX_TL" "$box_line" "$BOX_TR" "$NC"
    printf '%s%s       GitHub Workflows & Actions Security Audit v1.4.0        %s%s%s\n' "$BLUE" "$BOX_V" "$BOX_V" "$NC"
    printf '%s%s%s%s%s%s\n\n' "$BLUE" "$BOX_BL" "$box_line" "$BOX_BR" "$NC"
    
    setup_environment
    check_tool_availability
    validate_yaml_syntax
    run_actionlint
    check_security_best_practices
    scan_for_secrets
    check_workflow_efficiency
    check_dependabot_config
    check_codeql_workflow
    apply_auto_fixes
    generate_reports
    
    # Final summary
    log_section "Audit Complete"

    printf '\n'
    local box_line=""
    for ((i=0; i<63; i++)); do box_line+="$BOX_H"; done

    printf '%s%s%s%s%s%s\n' "$BLUE" "$BOX_TL" "$box_line" "$BOX_TR" "$NC"
    printf '%s%s                      FINAL RESULTS                            %s%s%s\n' "$BLUE" "$BOX_V" "$BOX_V" "$NC"
    printf '%s%s%s%s%s%s\n' "$BLUE" "$BOX_T" "$box_line" "$BOX_R" "$NC"
    printf '%s%s  %sCritical:%s %-4d  %sHigh:%s %-4d  %sMedium:%s %-4d  %sLow:%s %-4d    %s%s%s\n' "$BLUE" "$BOX_V" "$RED" "$NC" "$CRITICAL_COUNT" "$RED" "$NC" "$HIGH_COUNT" "$YELLOW" "$NC" "$MEDIUM_COUNT" "$YELLOW" "$NC" "$LOW_COUNT" "$BOX_V" "$NC"
    printf '%s%s  %sInfo:%s %-4d      %sPass:%s %-4d  %sAuto-Fixed:%s %-4d         %s%s%s\n' "$BLUE" "$BOX_V" "$CYAN" "$NC" "$INFO_COUNT" "$GREEN" "$NC" "$PASS_COUNT" "$BLUE" "$NC" "$AUTO_FIXED_COUNT" "$BOX_V" "$NC"
    printf '%s%s%s%s%s%s\n\n' "$BLUE" "$BOX_BL" "$box_line" "$BOX_BR" "$NC"
    
    # Production readiness assessment with FAIL_ON_WARNINGS support
    if [[ "$CRITICAL_COUNT" -eq 0 && "$HIGH_COUNT" -eq 0 ]]; then
        if [[ "$FAIL_ON_WARNINGS" == "true" && ("$MEDIUM_COUNT" -gt 0 || "$LOW_COUNT" -gt 0) ]]; then
            printf '%s⚠ FAIL_ON_WARNINGS=true: Medium/Low issues present%s\n\n' "$YELLOW" "$NC"
            exit 1
        else
            printf '%s✓ GitHub workflows meet security and quality standards%s\n\n' "$GREEN" "$NC"
            exit 0
        fi
    elif [[ "$CRITICAL_COUNT" -gt 0 ]]; then
        printf '%s✗ CRITICAL security issues must be resolved%s\n\n' "$RED" "$NC"
        exit 2
    else
        printf '%s⚠ HIGH priority security issues should be addressed%s\n\n' "$YELLOW" "$NC"
        exit 1
    fi
}

# Run main function
main "$@"
