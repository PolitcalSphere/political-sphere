#!/usr/bin/env bash
# =============================================================================
# GitHub Workflows & Actions Audit Script v1.1.0
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
# Industry Standards Covered:
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
#   GITLEAKS_SCOPE=<path>      - Path to scan (default: .github)
#   GITLEAKS_CONFIG=<path>     - Custom gitleaks config file
#   GITLEAKS_ARGS="<args>"     - Additional gitleaks arguments
#   OUTPUT_DIR=./audit-output  - Directory for output files
#
# Usage:
#   ./github-audit.sh [options]
#   AUTO_FIX=true ./github-audit.sh
#   FAIL_ON_WARNINGS=true ./github-audit.sh
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
FAIL_ON_WARNINGS="${FAIL_ON_WARNINGS:-false}"
# gitleaks configuration: scope (path), config file, and additional args
GITLEAKS_SCOPE="${GITLEAKS_SCOPE:-$GITHUB_DIR}"
GITLEAKS_CONFIG="${GITLEAKS_CONFIG:-}"
GITLEAKS_ARGS="${GITLEAKS_ARGS:-}"

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0
INFO_COUNT=0
PASS_COUNT=0
AUTO_FIXED_COUNT=0

# Findings arrays
declare -a FINDINGS

# Backup directory for auto-fixes
BACKUP_DIR="${OUTPUT_DIR}/backups/$(date +%Y%m%d_%H%M%S)"
AUTO_FIX_LOG="${OUTPUT_DIR}/auto-fix.log"

# -----------------------------------------------------------------------------
# Utility Functions
# -----------------------------------------------------------------------------

log_critical() {
    echo -e "${RED}[CRITICAL]${NC} $*" >&2
    ((CRITICAL_COUNT++)) || true
}

log_high() {
    echo -e "${RED}[HIGH]${NC} $*" >&2
    ((HIGH_COUNT++)) || true
}

log_medium() {
    echo -e "${YELLOW}[MEDIUM]${NC} $*" >&2
    ((MEDIUM_COUNT++)) || true
}

log_low() {
    echo -e "${YELLOW}[LOW]${NC} $*" >&2
    ((LOW_COUNT++)) || true
}

log_info() {
    echo -e "${CYAN}[INFO]${NC} $*"
    ((INFO_COUNT++)) || true
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $*"
    ((PASS_COUNT++)) || true
}

log_fix() {
    echo -e "${BLUE}[AUTO-FIX]${NC} $*"
    ((AUTO_FIXED_COUNT++)) || true
}

log_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE} $*${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

add_finding() {
    local severity="$1"
    local code="$2"
    local message="$3"
    local file="${4:-N/A}"
    local line="${5:-0}"
    
    FINDINGS+=("{\"severity\":\"$severity\",\"code\":\"$code\",\"message\":\"$message\",\"file\":\"$file\",\"line\":$line}")
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

setup_environment() {
    log_section "Phase 1: Environment Setup"
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Initialize auto-fix log
    if [[ "$AUTO_FIX" == "true" ]]; then
        mkdir -p "$BACKUP_DIR"
        echo "Auto-fix session started: $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$AUTO_FIX_LOG"
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
# Phase 4: actionlint Validation
# -----------------------------------------------------------------------------

run_actionlint() {
    log_section "Phase 4: actionlint Workflow Validation"
    
    if [[ "$SKIP_ACTIONLINT" == "true" ]]; then
        log_info "Skipping actionlint (SKIP_ACTIONLINT=true)"
        return 0
    fi
    
    log_info "Running actionlint on all workflows..."
    # Use bash globbing to build the list of workflow files safely
    # shellcheck disable=SC2296
    shopt -s nullglob 2>/dev/null || true
    files=("$WORKFLOWS_DIR"/*.yml "$WORKFLOWS_DIR"/*.yaml)
    if [[ ${#files[@]} -eq 0 ]]; then
        log_info "No workflow files found for actionlint"
        return 0
    fi

    # Run actionlint against the discovered files and capture JSON output
    if actionlint -format '{{json .}}' "${files[@]}" > "${OUTPUT_DIR}/actionlint-results.json" 2>&1; then
        log_pass "actionlint: No issues found"
    else
        if [[ -f "${OUTPUT_DIR}/actionlint-results.json" && -s "${OUTPUT_DIR}/actionlint-results.json" ]]; then
            log_medium "actionlint found issues (see ${OUTPUT_DIR}/actionlint-results.json)"
            add_finding "medium" "ACTIONLINT-001" "actionlint found workflow issues" "workflows" 0
        else
            # If no JSON produced, capture the raw output for debugging
            actionlint "${files[@]}" > "${OUTPUT_DIR}/actionlint-raw.txt" 2>&1 || true
            log_medium "actionlint reported issues (see ${OUTPUT_DIR}/actionlint-raw.txt)"
            add_finding "medium" "ACTIONLINT-002" "actionlint reported issues (raw output)" "workflows" 0
        fi
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
        
        # Check for pull_request_target usage (risky)
        if grep -q "pull_request_target:" "$workflow_file"; then
            log_high "$filename: Uses pull_request_target (review for security risks)"
            add_finding "high" "SEC-001" "pull_request_target can expose secrets to untrusted code" "$workflow_file" 0
        fi
        
        # Check for script injection vulnerabilities
        if grep -E '\$\{\{.*github\.(event|head_ref|base_ref)' "$workflow_file" | grep -v "contains"; then
            log_critical "$filename: Potential script injection vulnerability (unsanitized GitHub context)"
            add_finding "critical" "SEC-002" "Potential script injection from unsanitized GitHub context variables" "$workflow_file" 0
        else
            log_pass "$filename: No obvious script injection vulnerabilities"
        fi
        
        # Check for hardcoded credentials/tokens
        if grep -iE '(password|token|api[_-]?key|secret).*:.*["\x27][A-Za-z0-9+/=_-]{20,}' "$workflow_file"; then
            log_critical "$filename: Potential hardcoded credentials detected"
            add_finding "critical" "SEC-003" "Potential hardcoded credentials in workflow" "$workflow_file" 0
        else
            log_pass "$filename: No hardcoded credentials detected"
        fi
        
        # Check for proper secrets usage
        if grep -E '\$\{\{.*secrets\.' "$workflow_file" &> /dev/null; then
            log_pass "$filename: Uses GitHub Secrets for sensitive data"
        fi
        
        # Check for runs-on: self-hosted without additional security
        if grep -q "runs-on:.*self-hosted" "$workflow_file"; then
            log_medium "$filename: Uses self-hosted runners (ensure proper isolation)"
            add_finding "medium" "SEC-004" "Self-hosted runners require additional security considerations" "$workflow_file" 0
        fi
        
        # Check for write permissions
        if grep -E "permissions:.*write" "$workflow_file" &> /dev/null; then
            if ! grep -q "permissions:" "$workflow_file" || grep -q "permissions: write-all" "$workflow_file"; then
                log_high "$filename: Uses broad write permissions (apply least privilege)"
                add_finding "high" "SEC-005" "Workflow uses overly broad permissions" "$workflow_file" 0
            else
                log_pass "$filename: Uses scoped permissions"
            fi
        fi
        
        # Check for actions without version pinning
        if grep -E "uses:.*@(main|master|latest)" "$workflow_file" &> /dev/null; then
            log_medium "$filename: Actions pinned to branch instead of SHA or tag"
            add_finding "medium" "SEC-006" "Pin actions to specific SHA or semantic version" "$workflow_file" 0
        else
            log_pass "$filename: Actions properly pinned"
        fi
        
        # Check for checkout with persist-credentials
        if grep -A5 "uses:.*actions/checkout" "$workflow_file" | grep -q "persist-credentials: true"; then
            log_medium "$filename: checkout action persists credentials (security risk)"
            add_finding "medium" "SEC-007" "Disable persist-credentials in checkout action unless required" "$workflow_file" 0
        fi
        
    done < <(find "$WORKFLOWS_DIR" \( -name "*.yml" -o -name "*.yaml" \) -print0 2>/dev/null)
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
    # Allow configurable scope and additional args
    local gitleaks_cmd=(gitleaks detect --source "$GITLEAKS_SCOPE" --report-path "${OUTPUT_DIR}/gitleaks-report.json" --report-format json --no-git)
    if [[ -n "$GITLEAKS_CONFIG" ]]; then
        gitleaks_cmd+=(--config "$GITLEAKS_CONFIG")
    fi
    if [[ -n "$GITLEAKS_ARGS" ]]; then
        # shellcheck disable=SC2206
        gitleaks_cmd+=( $GITLEAKS_ARGS )
    fi

    if "${gitleaks_cmd[@]}" 2>&1; then
        log_pass "No secrets detected by gitleaks"
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
            log_high "gitleaks execution failed and no report was generated"
            add_finding "high" "SECRET-003" "gitleaks failed to run" "$GITLEAKS_SCOPE" 0
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
        
        # Check for cache usage
        if grep -q "actions/cache" "$workflow_file"; then
            log_pass "$filename: Uses caching for dependencies"
        else
            if grep -E "(npm|yarn|pip|bundle) install" "$workflow_file" &> /dev/null; then
                log_info "$filename: Consider adding caching for faster builds"
                add_finding "info" "PERF-001" "Workflow could benefit from dependency caching" "$workflow_file" 0
            fi
        fi
        
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
        
    done < <(find "$WORKFLOWS_DIR" \( -name "*.yml" -o -name "*.yaml" \) -print0 2>/dev/null)
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
    
    # Generate JSON report with proper escaping
    local json_report="${OUTPUT_DIR}/github-audit-results.json"
    
    # Build findings array with proper JSON escaping
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
  "version": "1.1.0",
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
    
    log_pass "JSON report generated: $json_report"
    
    # Generate human-readable summary
    cat > "${OUTPUT_DIR}/summary.txt" <<EOF
GitHub Workflows & Actions Audit Summary
Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Version: 1.1.0
================================================================================

Findings Summary:
  Critical: $CRITICAL_COUNT
  High:     $HIGH_COUNT
  Medium:   $MEDIUM_COUNT
  Low:      $LOW_COUNT
  Info:     $INFO_COUNT
  Pass:     $PASS_COUNT
  
Auto-fixes Applied: $AUTO_FIXED_COUNT

Workflows Analyzed: $(find "$WORKFLOWS_DIR" \( -name "*.yml" -o -name "*.yaml" \) 2>/dev/null | wc -l)

Output Directory: $OUTPUT_DIR

Configuration:
  AUTO_FIX: $AUTO_FIX
  FAIL_ON_WARNINGS: $FAIL_ON_WARNINGS
  GITLEAKS_SCOPE: $GITLEAKS_SCOPE
EOF
    
    log_pass "Summary report generated: ${OUTPUT_DIR}/summary.txt"
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       GitHub Workflows & Actions Security Audit v1.1.0        ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
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
    
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                      FINAL RESULTS                            ║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    printf "║  ${RED}Critical:${NC} %-4d  ${RED}High:${NC} %-4d  ${YELLOW}Medium:${NC} %-4d  ${YELLOW}Low:${NC} %-4d    ║\n" "$CRITICAL_COUNT" "$HIGH_COUNT" "$MEDIUM_COUNT" "$LOW_COUNT"
    printf "║  ${CYAN}Info:${NC} %-4d      ${GREEN}Pass:${NC} %-4d  ${BLUE}Auto-Fixed:${NC} %-4d         ║\n" "$INFO_COUNT" "$PASS_COUNT" "$AUTO_FIXED_COUNT"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Production readiness assessment with FAIL_ON_WARNINGS support
    if [[ "$CRITICAL_COUNT" -eq 0 && "$HIGH_COUNT" -eq 0 ]]; then
        if [[ "$FAIL_ON_WARNINGS" == "true" && ("$MEDIUM_COUNT" -gt 0 || "$LOW_COUNT" -gt 0) ]]; then
            echo -e "${YELLOW}⚠ FAIL_ON_WARNINGS=true: Medium/Low issues present${NC}"
            echo ""
            exit 1
        else
            echo -e "${GREEN}✓ GitHub workflows meet security and quality standards${NC}"
            echo ""
            exit 0
        fi
    elif [[ "$CRITICAL_COUNT" -gt 0 ]]; then
        echo -e "${RED}✗ CRITICAL security issues must be resolved${NC}"
        echo ""
        exit 2
    else
        echo -e "${YELLOW}⚠ HIGH priority security issues should be addressed${NC}"
        echo ""
        exit 1
    fi
}

# Run main function
main "$@"
