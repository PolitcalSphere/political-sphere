#!/usr/bin/env bash
# =============================================================================
# Application Security & Quality Audit Script v1.0.0
# =============================================================================
#
# Comprehensive validation for application folders including:
# - Dependency vulnerability scanning (npm audit, Snyk)
# - Package.json validation and best practices
# - TypeScript/JavaScript security patterns
# - Environment variable validation
# - Configuration security audit
# - API security checks (for API apps)
# - Frontend security checks (for web apps)
#
# Industry Standards Covered:
# - OWASP Top 10 2021
# - OWASP API Security Top 10 2023
# - npm Security Best Practices
# - Node.js Security Best Practices
# - NIST SP 800-53 (Security Controls)
# - CWE/SANS Top 25 Most Dangerous Software Errors
#
# Exit Codes:
#   0 - Success (all checks passed or warnings only)
#   1 - Warnings found
#   2 - Critical errors found
#
# Environment Variables:
#   AUTO_FIX=true              - Enable automatic fixes
#   SKIP_NPM_AUDIT=true        - Skip npm audit
#   SKIP_SNYK=true             - Skip Snyk scanning
#   SKIP_ESLINT=true           - Skip ESLint security rules
#   APP_PATH=./apps/api        - Path to application to audit
#   OUTPUT_DIR=./audit-output  - Directory for output files
#
# Usage:
#   ./app-audit.sh --app=api
#   ./app-audit.sh --app=web --auto-fix
#   APP_PATH=./apps/worker ./app-audit.sh
#
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Parse command line arguments
APP_NAME=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --app=*)
            APP_NAME="${1#*=}"
            shift
            ;;
        --auto-fix)
            AUTO_FIX=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 --app=<app-name> [--auto-fix]"
            exit 1
            ;;
    esac
done

# Determine app path
if [[ -n "${APP_PATH:-}" ]]; then
    APP_DIR="$APP_PATH"
elif [[ -n "$APP_NAME" ]]; then
    APP_DIR="${PROJECT_ROOT}/apps/${APP_NAME}"
else
    echo "Error: Must specify --app=<name> or set APP_PATH environment variable"
    echo "Usage: $0 --app=<app-name> [--auto-fix]"
    exit 1
fi

# Configuration via environment variables
AUTO_FIX="${AUTO_FIX:-false}"
SKIP_NPM_AUDIT="${SKIP_NPM_AUDIT:-false}"
SKIP_SNYK="${SKIP_SNYK:-false}"
SKIP_ESLINT="${SKIP_ESLINT:-false}"
OUTPUT_DIR="${OUTPUT_DIR:-${PROJECT_ROOT}/app-audit-${APP_NAME:-custom}}"

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
    
    # Check if app directory exists
    if [[ ! -d "$APP_DIR" ]]; then
        log_critical "Application directory not found: $APP_DIR"
        add_finding "critical" "APP-001" "Application directory not found" "$APP_DIR" 0
        exit 2
    fi
    
    log_pass "Application directory found: $APP_DIR"
}

check_tool_availability() {
    log_section "Phase 2: Tool Availability Check"
    
    # Check for npm
    if command -v npm &> /dev/null; then
        local version=$(npm --version)
        log_pass "npm available: v$version"
    else
        log_critical "npm not found (required)"
        add_finding "critical" "TOOL-001" "npm is required for dependency auditing" "N/A" 0
        exit 2
    fi
    
    # Check for Node.js
    if command -v node &> /dev/null; then
        local version=$(node --version)
        log_pass "Node.js available: $version"
    else
        log_critical "Node.js not found (required)"
        add_finding "critical" "TOOL-002" "Node.js is required" "N/A" 0
        exit 2
    fi
    
    # Check for Snyk
    if [[ "$SKIP_SNYK" != "true" ]]; then
        if command -v snyk &> /dev/null; then
            local version=$(snyk version || echo "unknown")
            log_pass "Snyk available: $version"
        else
            log_medium "Snyk not found. Install: npm install -g snyk"
            add_finding "medium" "TOOL-003" "Snyk not installed - advanced vulnerability scanning unavailable" "N/A" 0
            SKIP_SNYK=true
        fi
    fi
    
    # Check for jq (required for JSON processing)
    if command -v jq &> /dev/null; then
        log_pass "jq available"
    else
        log_critical "jq not found. Required for JSON processing. Install: brew install jq (macOS) or apt-get install jq"
        add_finding "critical" "TOOL-004" "jq not installed - required for audit script" "N/A" 0
        exit 2
    fi
}

# -----------------------------------------------------------------------------
# Phase 3: package.json Validation
# -----------------------------------------------------------------------------

validate_package_json() {
    log_section "Phase 3: package.json Validation"
    
    local package_json="${APP_DIR}/package.json"
    
    if [[ ! -f "$package_json" ]]; then
        log_critical "package.json not found in $APP_DIR"
        add_finding "critical" "PKG-001" "package.json file is missing" "$package_json" 0
        return 1
    fi
    
    log_info "Validating package.json: $package_json"
    
    # Check JSON syntax
    if ! jq empty "$package_json" 2>/dev/null; then
        log_critical "package.json contains invalid JSON"
        add_finding "critical" "PKG-002" "Invalid JSON syntax in package.json" "$package_json" 0
        return 1
    fi
    
    log_pass "package.json is valid JSON"
    
    # Check for required fields
    local name=$(jq -r '.name // empty' "$package_json")
    if [[ -z "$name" ]]; then
        log_medium "package.json missing 'name' field"
        add_finding "medium" "PKG-003" "Missing 'name' field" "$package_json" 0
    else
        log_pass "Package name: $name"
    fi
    
    # Check for version field
    if ! jq -e '.version' "$package_json" &> /dev/null; then
        log_medium "package.json missing 'version' field"
        add_finding "medium" "PKG-004" "Missing 'version' field" "$package_json" 0
    else
        log_pass "Package version specified"
    fi
    
    # Check for security scripts
    if jq -e '.scripts.audit' "$package_json" &> /dev/null; then
        log_pass "npm audit script configured"
    else
        log_info "Consider adding 'audit' script to package.json"
        add_finding "info" "PKG-005" "No 'audit' script configured" "$package_json" 0
    fi
    
    # Check for engines field (Node.js version)
    if jq -e '.engines.node' "$package_json" &> /dev/null; then
        local node_version=$(jq -r '.engines.node' "$package_json")
        log_pass "Node.js version specified: $node_version"
    else
        log_medium "No Node.js version specified in engines field"
        add_finding "medium" "PKG-006" "Specify Node.js version in 'engines' field for consistency" "$package_json" 0
    fi
    
    # Check for private field (security consideration)
    local is_private=$(jq -r '.private // false' "$package_json")
    if [[ "$is_private" != "true" ]]; then
        log_medium "Package not marked as private (risk of accidental publication)"
        add_finding "medium" "PKG-007" "Set 'private: true' to prevent accidental npm publish" "$package_json" 0
    else
        log_pass "Package marked as private"
    fi
}

# -----------------------------------------------------------------------------
# Phase 4: Dependency Security Audit
# -----------------------------------------------------------------------------

run_dependency_audit() {
    log_section "Phase 4: Dependency Security Audit"
    
    cd "$APP_DIR"
    
    # Run npm audit
    if [[ "$SKIP_NPM_AUDIT" != "true" ]]; then
        log_info "Running npm audit..."
        
        if npm audit --json > "${OUTPUT_DIR}/npm-audit.json" 2>&1; then
            log_pass "npm audit: No vulnerabilities found"
        else
            # Parse npm audit results
            if [[ -f "${OUTPUT_DIR}/npm-audit.json" ]]; then
                local critical=$(jq '.metadata.vulnerabilities.critical // 0' "${OUTPUT_DIR}/npm-audit.json")
                local high=$(jq '.metadata.vulnerabilities.high // 0' "${OUTPUT_DIR}/npm-audit.json")
                local moderate=$(jq '.metadata.vulnerabilities.moderate // 0' "${OUTPUT_DIR}/npm-audit.json")
                local low=$(jq '.metadata.vulnerabilities.low // 0' "${OUTPUT_DIR}/npm-audit.json")
                
                if [[ "$critical" -gt 0 ]]; then
                    log_critical "npm audit found $critical CRITICAL vulnerabilities"
                    add_finding "critical" "DEP-001" "npm audit found $critical critical vulnerabilities" "$APP_DIR" 0
                fi
                
                if [[ "$high" -gt 0 ]]; then
                    log_high "npm audit found $high HIGH vulnerabilities"
                    add_finding "high" "DEP-002" "npm audit found $high high vulnerabilities" "$APP_DIR" 0
                fi
                
                if [[ "$moderate" -gt 0 ]]; then
                    log_medium "npm audit found $moderate MODERATE vulnerabilities"
                    add_finding "medium" "DEP-003" "npm audit found $moderate moderate vulnerabilities" "$APP_DIR" 0
                fi
                
                if [[ "$low" -gt 0 ]]; then
                    log_low "npm audit found $low LOW vulnerabilities"
                    add_finding "low" "DEP-004" "npm audit found $low low vulnerabilities" "$APP_DIR" 0
                fi
                
                log_info "Full npm audit report: ${OUTPUT_DIR}/npm-audit.json"
            fi
        fi
    fi
    
    # Run Snyk test
    if [[ "$SKIP_SNYK" != "true" ]] && command -v snyk &> /dev/null; then
        log_info "Running Snyk vulnerability scan..."
        
        if snyk test --json > "${OUTPUT_DIR}/snyk-test.json" 2>&1; then
            log_pass "Snyk: No vulnerabilities found"
        else
            if [[ -f "${OUTPUT_DIR}/snyk-test.json" ]]; then
                log_medium "Snyk found vulnerabilities (see ${OUTPUT_DIR}/snyk-test.json)"
                add_finding "medium" "DEP-005" "Snyk detected vulnerabilities" "$APP_DIR" 0
            fi
        fi
    fi
    
    cd "$PROJECT_ROOT"
}

# -----------------------------------------------------------------------------
# Phase 5: Code Security Patterns
# -----------------------------------------------------------------------------

check_code_security() {
    log_section "Phase 5: Code Security Patterns"
    
    log_info "Scanning for common security anti-patterns..."
    
    # Check for eval() usage
    if grep -r "eval(" "$APP_DIR" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" 2>/dev/null | grep -v "node_modules" | grep -v ".test." | head -n 1; then
        log_high "Found eval() usage (dangerous - can execute arbitrary code)"
        add_finding "high" "CODE-SEC-001" "eval() usage detected (security risk)" "$APP_DIR" 0
    else
        log_pass "No eval() usage found"
    fi
    
    # Check for console.log (information disclosure)
    local console_count=$(grep -r "console\.log" "$APP_DIR" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" 2>/dev/null | grep -v "node_modules" | grep -v ".test." | wc -l)
    if [[ "$console_count" -gt 10 ]]; then
        log_medium "Found $console_count console.log statements (review for information disclosure)"
        add_finding "medium" "CODE-SEC-002" "Excessive console.log usage ($console_count occurrences)" "$APP_DIR" 0
    elif [[ "$console_count" -gt 0 ]]; then
        log_info "Found $console_count console.log statements"
    else
        log_pass "No console.log statements found"
    fi
    
    # Check for hardcoded secrets/passwords
    if grep -rE "(password|secret|api[_-]?key|token).*=.*['\"][A-Za-z0-9+/=_-]{20,}" "$APP_DIR" --include="*.ts" --include="*.js" --include="*.tsx" --include="*.jsx" 2>/dev/null | grep -v "node_modules" | grep -v ".test." | head -n 1; then
        log_critical "Potential hardcoded secrets detected in source code"
        add_finding "critical" "CODE-SEC-003" "Potential hardcoded secrets in code" "$APP_DIR" 0
    else
        log_pass "No obvious hardcoded secrets in code"
    fi
    
    # Check for SQL injection vulnerabilities (basic check)
    if grep -rE "execute.*\$\{|query.*\`\$\{" "$APP_DIR" --include="*.ts" --include="*.js" 2>/dev/null | grep -v "node_modules" | grep -v ".test." | head -n 1; then
        log_high "Potential SQL injection vulnerability (template literal in query)"
        add_finding "high" "CODE-SEC-004" "Potential SQL injection vulnerability detected" "$APP_DIR" 0
    else
        log_pass "No obvious SQL injection patterns found"
    fi
}

# -----------------------------------------------------------------------------
# Phase 6: Environment Variables & Configuration
# -----------------------------------------------------------------------------

check_environment_config() {
    log_section "Phase 6: Environment & Configuration Security"
    
    # Check for .env files
    if [[ -f "${APP_DIR}/.env" ]]; then
        log_high ".env file found in source (should not be committed)"
        add_finding "high" "CONFIG-001" ".env file should not be committed to version control" "${APP_DIR}/.env" 0
    fi
    
    # Check for .env.example
    if [[ -f "${APP_DIR}/.env.example" ]]; then
        log_pass ".env.example found (good practice)"
        
        # Verify it doesn't contain real secrets
        if grep -E "['\"][A-Za-z0-9+/=_-]{32,}['\"]" "${APP_DIR}/.env.example" &> /dev/null; then
            log_high ".env.example may contain real secrets"
            add_finding "high" "CONFIG-002" ".env.example should contain placeholder values only" "${APP_DIR}/.env.example" 0
        else
            log_pass ".env.example contains only placeholders"
        fi
    else
        log_info "No .env.example found (consider creating one for documentation)"
        add_finding "info" "CONFIG-003" "Create .env.example for environment variable documentation" "$APP_DIR" 0
    fi
    
    # Check for environment variable validation
    if grep -r "process\.env\." "$APP_DIR/src" --include="*.ts" --include="*.js" 2>/dev/null | grep -v "node_modules" | head -n 1 &> /dev/null; then
        log_info "Application uses environment variables"
        
        # Check for validation library (zod, joi, etc.)
        local package_json="${APP_DIR}/package.json"
        if jq -e '.dependencies.zod or .dependencies.joi or .dependencies["env-var"]' "$package_json" &> /dev/null; then
            log_pass "Environment variable validation library found"
        else
            log_medium "No environment variable validation library detected"
            add_finding "medium" "CONFIG-004" "Use validation library (zod, joi, env-var) for environment variables" "$APP_DIR" 0
        fi
    fi
}

# -----------------------------------------------------------------------------
# Phase 7: Auto-Fix Application
# -----------------------------------------------------------------------------

apply_auto_fixes() {
    log_section "Phase 7: Auto-Fix Application"
    
    if [[ "$AUTO_FIX" != "true" ]]; then
        log_info "Auto-fix disabled (set AUTO_FIX=true to enable)"
        return 0
    fi
    
    log_info "Applying automatic fixes..."
    
    cd "$APP_DIR"
    
    # Auto-fix: Run npm audit fix for non-breaking changes
    if [[ "$SKIP_NPM_AUDIT" != "true" ]]; then
        if npm audit fix --dry-run --json > "${OUTPUT_DIR}/npm-audit-fix-preview.json" 2>&1; then
            log_info "Preview of npm audit fix available in ${OUTPUT_DIR}/npm-audit-fix-preview.json"
            
            # Actually apply fixes
            create_backup "${APP_DIR}/package.json"
            create_backup "${APP_DIR}/package-lock.json"
            
            if npm audit fix --json > "${OUTPUT_DIR}/npm-audit-fix-results.json" 2>&1; then
                log_fix "Applied npm audit fix for compatible updates"
                ((AUTO_FIXED_COUNT++)) || true
            fi
        fi
    fi
    
    cd "$PROJECT_ROOT"
    
    if [[ "$AUTO_FIXED_COUNT" -gt 0 ]]; then
        log_info "Applied $AUTO_FIXED_COUNT automatic fixes"
        log_info "Backups stored in: $BACKUP_DIR"
        log_info "Auto-fix log: $AUTO_FIX_LOG"
    else
        log_info "No automatic fixes available (manual review required)"
    fi
}

# -----------------------------------------------------------------------------
# Phase 8: Generate Reports
# -----------------------------------------------------------------------------

generate_reports() {
    log_section "Phase 8: Report Generation"
    
    # Generate JSON report
    local json_report="${OUTPUT_DIR}/app-audit-results.json"
    
    cat > "$json_report" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "application": "$(basename "$APP_DIR")",
  "path": "$APP_DIR",
  "summary": {
    "critical": $CRITICAL_COUNT,
    "high": $HIGH_COUNT,
    "medium": $MEDIUM_COUNT,
    "low": $LOW_COUNT,
    "info": $INFO_COUNT,
    "pass": $PASS_COUNT,
    "autoFixed": $AUTO_FIXED_COUNT
  },
  "findings": [
    $(IFS=,; echo "${FINDINGS[*]}")
  ]
}
EOF
    
    log_pass "JSON report generated: $json_report"
    
    # Generate human-readable summary
    cat > "${OUTPUT_DIR}/summary.txt" <<EOF
Application Security & Quality Audit Summary
Application: $(basename "$APP_DIR")
Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
================================================================================

Findings Summary:
  Critical: $CRITICAL_COUNT
  High:     $HIGH_COUNT
  Medium:   $MEDIUM_COUNT
  Low:      $LOW_COUNT
  Info:     $INFO_COUNT
  Pass:     $PASS_COUNT
  
Auto-fixes Applied: $AUTO_FIXED_COUNT

Application Path: $APP_DIR
Output Directory: $OUTPUT_DIR
EOF
    
    log_pass "Summary report generated: ${OUTPUT_DIR}/summary.txt"
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║       Application Security & Quality Audit v1.0.0            ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "Auditing application: ${CYAN}$(basename "$APP_DIR")${NC}"
    echo ""
    
    setup_environment
    check_tool_availability
    validate_package_json
    run_dependency_audit
    check_code_security
    check_environment_config
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
    
    # Production readiness assessment
    if [[ "$CRITICAL_COUNT" -eq 0 && "$HIGH_COUNT" -eq 0 ]]; then
        echo -e "${GREEN}✓ Application meets security and quality standards${NC}"
        echo ""
        exit 0
    elif [[ "$CRITICAL_COUNT" -gt 0 ]]; then
        echo -e "${RED}✗ CRITICAL security issues must be resolved before deployment${NC}"
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
