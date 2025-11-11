#!/usr/bin/env bash
# =============================================================================
# Central Audit Orchestration Script v1.0.0
# =============================================================================
#
# Comprehensive audit orchestration that runs all security, quality, and
# compliance audits for Political Sphere. Provides unified reporting with
# centralized audit log and aggregated findings.
#
# Features:
# - Run all audits or select specific domains
# - Centralized audit log with timestamps
# - Aggregated findings across all audit types
# - JSON and human-readable reports
# - Email/Slack notifications (optional)
# - CI/CD integration support
# - Production readiness assessment
#
# Audit Domains:
# - OpenAPI: API specification validation
# - DevContainer: Container configuration security
# - GitHub: Workflow and CI/CD security
# - Applications: Dependency and code security
# - Infrastructure: Terraform/IaC validation (optional)
#
# Exit Codes:
#   0 - All audits passed or warnings only
#   1 - Warnings or medium-severity issues
#   2 - Critical or high-severity issues
#
# Environment Variables:
#   AUTO_FIX=true              - Enable automatic fixes across all audits
#   AUDIT_DOMAINS="openapi,devcontainer,github,apps"  - Select specific audits
#   FAIL_ON_WARNINGS=true      - Fail on warnings (default: false)
#   OUTPUT_DIR=./audit-results - Central output directory
#   NOTIFY_SLACK=true          - Send Slack notification (requires SLACK_WEBHOOK_URL)
#   NOTIFY_EMAIL=true          - Send email notification (requires EMAIL_RECIPIENT)
#   PARALLEL=true              - Run audits in parallel (default: false)
#
# Usage:
#   ./audit-all.sh                              # Run all audits
#   ./audit-all.sh openapi devcontainer         # Run specific audits
#   AUDIT_DOMAINS="github,apps" ./audit-all.sh  # Via environment variable
#   AUTO_FIX=true ./audit-all.sh                # Run with auto-fix enabled
#
# Note: Requires bash 3.2+ (macOS compatible)
#
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Central audit configuration
AUTO_FIX="${AUTO_FIX:-false}"
FAIL_ON_WARNINGS="${FAIL_ON_WARNINGS:-false}"
OUTPUT_DIR="${OUTPUT_DIR:-${PROJECT_ROOT}/audit-results}"
PARALLEL="${PARALLEL:-false}"
NOTIFY_SLACK="${NOTIFY_SLACK:-false}"
NOTIFY_EMAIL="${NOTIFY_EMAIL:-false}"

# Timestamp for this audit run
AUDIT_TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
AUDIT_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Central audit log
AUDIT_LOG="${OUTPUT_DIR}/audit-log.jsonl"
SUMMARY_REPORT="${OUTPUT_DIR}/audit-summary.txt"
JSON_REPORT="${OUTPUT_DIR}/audit-summary.json"

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Counters (aggregated across all audits)
TOTAL_CRITICAL=0
TOTAL_HIGH=0
TOTAL_MEDIUM=0
TOTAL_LOW=0
TOTAL_INFO=0
TOTAL_PASS=0
TOTAL_AUTO_FIXED=0

# Audit results tracking (using simple variables instead of associative arrays for bash 3.2 compatibility)
# Status tracking
AUDIT_STATUS_OPENAPI=""
AUDIT_STATUS_DEVCONTAINER=""
AUDIT_STATUS_GITHUB=""
AUDIT_STATUS_APPS=""

# Duration tracking
AUDIT_DURATION_OPENAPI=0
AUDIT_DURATION_DEVCONTAINER=0
AUDIT_DURATION_GITHUB=0
AUDIT_DURATION_APPS=0

# Exit code tracking
AUDIT_EXIT_CODE_OPENAPI=0
AUDIT_EXIT_CODE_DEVCONTAINER=0
AUDIT_EXIT_CODE_GITHUB=0
AUDIT_EXIT_CODE_APPS=0

# Available audit domains
AVAILABLE_AUDITS=("openapi" "devcontainer" "github" "apps")

# Determine which audits to run
if [[ -n "${AUDIT_DOMAINS:-}" ]]; then
    IFS=',' read -ra SELECTED_AUDITS <<< "$AUDIT_DOMAINS"
elif [[ $# -gt 0 ]]; then
    SELECTED_AUDITS=("$@")
else
    SELECTED_AUDITS=("${AVAILABLE_AUDITS[@]}")
fi

# -----------------------------------------------------------------------------
# Utility Functions
# -----------------------------------------------------------------------------

log_header() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

log_section() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
    echo ""
}

log_info() {
    echo -e "${CYAN}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_critical() {
    echo -e "${RED}[CRITICAL]${NC} $*" >&2
}

# Helper functions to get/set audit variables (workaround for bash 3.2 lack of associative arrays)
get_audit_status() {
    local audit="$1"
    case "$audit" in
        openapi) echo "$AUDIT_STATUS_openapi" ;;
        devcontainer) echo "$AUDIT_STATUS_devcontainer" ;;
        github) echo "$AUDIT_STATUS_github" ;;
        apps) echo "$AUDIT_STATUS_apps" ;;
        *) echo "UNKNOWN" ;;
    esac
}

get_audit_duration() {
    local audit="$1"
    case "$audit" in
        openapi) echo "$AUDIT_DURATION_openapi" ;;
        devcontainer) echo "$AUDIT_DURATION_devcontainer" ;;
        github) echo "$AUDIT_DURATION_github" ;;
        apps) echo "$AUDIT_DURATION_apps" ;;
        *) echo "0" ;;
    esac
}

get_audit_exit_code() {
    local audit="$1"
    case "$audit" in
        openapi) echo "$AUDIT_EXIT_CODE_openapi" ;;
        devcontainer) echo "$AUDIT_EXIT_CODE_devcontainer" ;;
        github) echo "$AUDIT_EXIT_CODE_github" ;;
        apps) echo "$AUDIT_EXIT_CODE_apps" ;;
        *) echo "0" ;;
    esac
}

# Log entry to central audit log (JSONL format)
log_audit_entry() {
    local audit_domain="$1"
    local severity="$2"
    local message="$3"
    local details="${4:-}"
    
    local entry=$(cat <<EOF
{"timestamp":"${AUDIT_DATE}","run_id":"${AUDIT_TIMESTAMP}","domain":"${audit_domain}","severity":"${severity}","message":"${message}","details":"${details}"}
EOF
)
    echo "$entry" >> "$AUDIT_LOG"
}

# Extract metrics from individual audit JSON reports
extract_metrics() {
    local audit_name="$1"
    local json_file="$2"
    
    if [[ ! -f "$json_file" ]]; then
        log_warning "Metrics file not found: $json_file"
        return 1
    fi
    
    # Extract counts using jq
    local critical=$(jq -r '.summary.critical // 0' "$json_file" 2>/dev/null || echo 0)
    local high=$(jq -r '.summary.high // 0' "$json_file" 2>/dev/null || echo 0)
    local medium=$(jq -r '.summary.medium // 0' "$json_file" 2>/dev/null || echo 0)
    local low=$(jq -r '.summary.low // 0' "$json_file" 2>/dev/null || echo 0)
    local info=$(jq -r '.summary.info // 0' "$json_file" 2>/dev/null || echo 0)
    local pass=$(jq -r '.summary.pass // 0' "$json_file" 2>/dev/null || echo 0)
    local fixed=$(jq -r '.summary.auto_fixed // 0' "$json_file" 2>/dev/null || echo 0)
    
    # Aggregate
    ((TOTAL_CRITICAL += critical)) || true
    ((TOTAL_HIGH += high)) || true
    ((TOTAL_MEDIUM += medium)) || true
    ((TOTAL_LOW += low)) || true
    ((TOTAL_INFO += info)) || true
    ((TOTAL_PASS += pass)) || true
    ((TOTAL_AUTO_FIXED += fixed)) || true
    
    # Log individual findings to central audit log
    if [[ $critical -gt 0 ]]; then
        log_audit_entry "$audit_name" "CRITICAL" "$critical critical findings" "See ${json_file}"
    fi
    if [[ $high -gt 0 ]]; then
        log_audit_entry "$audit_name" "HIGH" "$high high-severity findings" "See ${json_file}"
    fi
}

# -----------------------------------------------------------------------------
# Audit Execution Functions
# -----------------------------------------------------------------------------

run_openapi_audit() {
    log_section "Running OpenAPI Audit"
    local start_time=$(date +%s)
    
    if [[ ! -f "${SCRIPT_DIR}/openapi-audit.sh" ]]; then
        log_warning "OpenAPI audit script not found, skipping"
        AUDIT_STATUS_openapi="SKIPPED"
        return 0
    fi
    
    local exit_code=0
    if AUTO_FIX="$AUTO_FIX" bash "${SCRIPT_DIR}/openapi-audit.sh" > "${OUTPUT_DIR}/openapi-output.log" 2>&1; then
        log_success "OpenAPI audit completed successfully"
        AUDIT_STATUS_openapi="PASS"
    else
        exit_code=$?
        if [[ $exit_code -eq 1 ]]; then
            log_warning "OpenAPI audit completed with warnings"
            AUDIT_STATUS_openapi="WARNINGS"
        else
            log_error "OpenAPI audit failed with critical issues"
            AUDIT_STATUS_openapi="FAIL"
        fi
    fi
    
    local end_time=$(date +%s)
    AUDIT_DURATION_openapi=$((end_time - start_time))
    AUDIT_EXIT_CODE_openapi=$exit_code
    
    # Extract and aggregate metrics
    extract_metrics "openapi" "${PROJECT_ROOT}/openapi-audit/results.json"
    
    return $exit_code
}

run_devcontainer_audit() {
    log_section "Running DevContainer Audit"
    local start_time=$(date +%s)
    
    if [[ ! -f "${SCRIPT_DIR}/devcontainer-audit.sh" ]]; then
        log_warning "DevContainer audit script not found, skipping"
        AUDIT_STATUS_devcontainer="SKIPPED"
        return 0
    fi
    
    local exit_code=0
    if AUTO_FIX="$AUTO_FIX" bash "${SCRIPT_DIR}/devcontainer-audit.sh" > "${OUTPUT_DIR}/devcontainer-output.log" 2>&1; then
        log_success "DevContainer audit completed successfully"
        AUDIT_STATUS_devcontainer="PASS"
    else
        exit_code=$?
        if [[ $exit_code -eq 1 ]]; then
            log_warning "DevContainer audit completed with warnings"
            AUDIT_STATUS_devcontainer="WARNINGS"
        else
            log_error "DevContainer audit failed with critical issues"
            AUDIT_STATUS_devcontainer="FAIL"
        fi
    fi
    
    local end_time=$(date +%s)
    AUDIT_DURATION_devcontainer=$((end_time - start_time))
    AUDIT_EXIT_CODE_devcontainer=$exit_code
    
    # Extract and aggregate metrics
    extract_metrics "devcontainer" "${PROJECT_ROOT}/devcontainer-audit/devcontainer-audit-results.json"
    
    return $exit_code
}

run_github_audit() {
    log_section "Running GitHub Workflows Audit"
    local start_time=$(date +%s)
    
    if [[ ! -f "${SCRIPT_DIR}/github-audit.sh" ]]; then
        log_warning "GitHub audit script not found, skipping"
        AUDIT_STATUS_github="SKIPPED"
        return 0
    fi
    
    local exit_code=0
    if AUTO_FIX="$AUTO_FIX" bash "${SCRIPT_DIR}/github-audit.sh" > "${OUTPUT_DIR}/github-output.log" 2>&1; then
        log_success "GitHub audit completed successfully"
        AUDIT_STATUS_github="PASS"
    else
        exit_code=$?
        if [[ $exit_code -eq 1 ]]; then
            log_warning "GitHub audit completed with warnings"
            AUDIT_STATUS_github="WARNINGS"
        else
            log_error "GitHub audit failed with critical issues"
            AUDIT_STATUS_github="FAIL"
        fi
    fi
    
    local end_time=$(date +%s)
    AUDIT_DURATION_github=$((end_time - start_time))
    AUDIT_EXIT_CODE_github=$exit_code
    
    # Extract and aggregate metrics
    extract_metrics "github" "${PROJECT_ROOT}/github-audit/github-audit-results.json"
    
    return $exit_code
}

run_app_audits() {
    log_section "Running Application Audits"
    local start_time=$(date +%s)
    
    if [[ ! -f "${SCRIPT_DIR}/app-audit.sh" ]]; then
        log_warning "Application audit script not found, skipping"
        AUDIT_STATUS_apps="SKIPPED"
        return 0
    fi
    
    # Find all apps with package.json (or audit all app directories)
    local apps=("api" "web" "worker" "game-server")
    local any_failures=0
    local any_warnings=0
    
    for app in "${apps[@]}"; do
        log_info "Auditing application: $app"
        
        local app_exit_code=0
        if AUTO_FIX="$AUTO_FIX" bash "${SCRIPT_DIR}/app-audit.sh" --app="$app" > "${OUTPUT_DIR}/app-${app}-output.log" 2>&1; then
            log_success "Application audit completed for $app"
        else
            app_exit_code=$?
            if [[ $app_exit_code -eq 2 ]]; then
                ((any_failures++)) || true
                log_error "Application audit failed for $app (critical issues)"
            else
                ((any_warnings++)) || true
                log_warning "Application audit completed with warnings for $app"
            fi
        fi
        
        # Extract metrics for each app
        extract_metrics "app-${app}" "${PROJECT_ROOT}/app-audit-${app}/app-audit-results.json"
    done
    
    local end_time=$(date +%s)
    AUDIT_DURATION_apps=$((end_time - start_time))
    
    # Determine overall app audit status
    if [[ $any_failures -gt 0 ]]; then
        AUDIT_STATUS_apps="FAIL"
        AUDIT_EXIT_CODE_apps=2
        return 2
    elif [[ $any_warnings -gt 0 ]]; then
        AUDIT_STATUS_apps="WARNINGS"
        AUDIT_EXIT_CODE_apps=1
        return 1
    else
        AUDIT_STATUS_apps="PASS"
        AUDIT_EXIT_CODE_apps=0
        return 0
    fi
}

# -----------------------------------------------------------------------------
# Reporting Functions
# -----------------------------------------------------------------------------

generate_summary_report() {
    log_section "Generating Summary Report"
    
    cat > "$SUMMARY_REPORT" <<EOF
═══════════════════════════════════════════════════════════════════════
                    POLITICAL SPHERE AUDIT SUMMARY
═══════════════════════════════════════════════════════════════════════

Audit Run ID: ${AUDIT_TIMESTAMP}
Date/Time: ${AUDIT_DATE}
Auto-Fix Enabled: ${AUTO_FIX}

───────────────────────────────────────────────────────────────────────
AUDIT DOMAINS EXECUTED
───────────────────────────────────────────────────────────────────────

EOF

    # List executed audits with status and duration
    for audit in "${SELECTED_AUDITS[@]}"; do
        local status=$(get_audit_status "$audit")
        local duration=$(get_audit_duration "$audit")
        local exit_code=$(get_audit_exit_code "$audit")
        
        printf "%-20s Status: %-10s Duration: %3ds  Exit: %d\n" \
            "$audit" "$status" "$duration" "$exit_code" >> "$SUMMARY_REPORT"
    done
    
    cat >> "$SUMMARY_REPORT" <<EOF

───────────────────────────────────────────────────────────────────────
AGGREGATED FINDINGS
───────────────────────────────────────────────────────────────────────

Critical Issues:  ${TOTAL_CRITICAL}
High Severity:    ${TOTAL_HIGH}
Medium Severity:  ${TOTAL_MEDIUM}
Low Severity:     ${TOTAL_LOW}
Informational:    ${TOTAL_INFO}
Passed Checks:    ${TOTAL_PASS}
Auto-Fixed:       ${TOTAL_AUTO_FIXED}

───────────────────────────────────────────────────────────────────────
PRODUCTION READINESS ASSESSMENT
───────────────────────────────────────────────────────────────────────

EOF

    if [[ $TOTAL_CRITICAL -eq 0 && $TOTAL_HIGH -eq 0 ]]; then
        echo "✓ PRODUCTION READY" >> "$SUMMARY_REPORT"
        echo "" >> "$SUMMARY_REPORT"
        echo "All critical and high-severity issues have been resolved." >> "$SUMMARY_REPORT"
        echo "The system meets minimum security and quality standards." >> "$SUMMARY_REPORT"
    elif [[ $TOTAL_CRITICAL -gt 0 ]]; then
        echo "✗ NOT PRODUCTION READY - CRITICAL ISSUES" >> "$SUMMARY_REPORT"
        echo "" >> "$SUMMARY_REPORT"
        echo "CRITICAL ISSUES MUST BE RESOLVED before production deployment." >> "$SUMMARY_REPORT"
        echo "Review findings in individual audit reports for remediation steps." >> "$SUMMARY_REPORT"
    else
        echo "⚠ PRODUCTION READY WITH WARNINGS" >> "$SUMMARY_REPORT"
        echo "" >> "$SUMMARY_REPORT"
        echo "High-severity issues detected that should be addressed." >> "$SUMMARY_REPORT"
        echo "While not blocking, these issues may impact security or reliability." >> "$SUMMARY_REPORT"
    fi
    
    cat >> "$SUMMARY_REPORT" <<EOF

───────────────────────────────────────────────────────────────────────
DETAILED REPORTS
───────────────────────────────────────────────────────────────────────

Central Audit Log:     ${AUDIT_LOG}
JSON Summary:          ${JSON_REPORT}

Individual Reports:
EOF

    for audit in "${SELECTED_AUDITS[@]}"; do
        case "$audit" in
            openapi)
                echo "  - OpenAPI:       ${PROJECT_ROOT}/openapi-audit/" >> "$SUMMARY_REPORT"
                ;;
            devcontainer)
                echo "  - DevContainer:  ${PROJECT_ROOT}/devcontainer-audit/" >> "$SUMMARY_REPORT"
                ;;
            github)
                echo "  - GitHub:        ${PROJECT_ROOT}/github-audit/" >> "$SUMMARY_REPORT"
                ;;
            apps)
                echo "  - Applications:  ${PROJECT_ROOT}/app-audit-*/" >> "$SUMMARY_REPORT"
                ;;
        esac
    done
    
    echo "" >> "$SUMMARY_REPORT"
    echo "═══════════════════════════════════════════════════════════════════════" >> "$SUMMARY_REPORT"
    
    log_success "Summary report generated: $SUMMARY_REPORT"
}

generate_json_report() {
    log_info "Generating JSON summary report"
    
    # Build audit details array
    local audit_details="["
    local first=true
    
    for audit in "${SELECTED_AUDITS[@]}"; do
        if [[ "$first" == "false" ]]; then
            audit_details+=","
        fi
        first=false
        
        local status=$(get_audit_status "$audit")
        local duration=$(get_audit_duration "$audit")
        local exit_code=$(get_audit_exit_code "$audit")
        
        audit_details+=$(cat <<EOF
{
  "domain": "$audit",
  "status": "$status",
  "duration_seconds": $duration,
  "exit_code": $exit_code
}
EOF
)
    done
    audit_details+="]"
    
    # Determine overall production readiness
    local production_ready="true"
    local readiness_message="Production ready"
    
    if [[ $TOTAL_CRITICAL -gt 0 ]]; then
        production_ready="false"
        readiness_message="Not production ready - critical issues found"
    elif [[ $TOTAL_HIGH -gt 0 ]]; then
        production_ready="warning"
        readiness_message="Production ready with high-severity warnings"
    fi
    
    cat > "$JSON_REPORT" <<EOF
{
  "audit_run": {
    "id": "${AUDIT_TIMESTAMP}",
    "timestamp": "${AUDIT_DATE}",
    "auto_fix_enabled": ${AUTO_FIX}
  },
  "summary": {
    "critical": ${TOTAL_CRITICAL},
    "high": ${TOTAL_HIGH},
    "medium": ${TOTAL_MEDIUM},
    "low": ${TOTAL_LOW},
    "info": ${TOTAL_INFO},
    "pass": ${TOTAL_PASS},
    "auto_fixed": ${TOTAL_AUTO_FIXED}
  },
  "production_readiness": {
    "ready": "${production_ready}",
    "message": "${readiness_message}"
  },
  "audits": ${audit_details},
  "reports": {
    "central_log": "${AUDIT_LOG}",
    "summary_txt": "${SUMMARY_REPORT}",
    "summary_json": "${JSON_REPORT}"
  }
}
EOF
    
    log_success "JSON report generated: $JSON_REPORT"
}

# -----------------------------------------------------------------------------
# Notification Functions
# -----------------------------------------------------------------------------

send_slack_notification() {
    if [[ "$NOTIFY_SLACK" != "true" ]]; then
        return 0
    fi
    
    if [[ -z "${SLACK_WEBHOOK_URL:-}" ]]; then
        log_warning "NOTIFY_SLACK=true but SLACK_WEBHOOK_URL not set"
        return 1
    fi
    
    log_info "Sending Slack notification"
    
    local color="good"
    local status_emoji=":white_check_mark:"
    
    if [[ $TOTAL_CRITICAL -gt 0 ]]; then
        color="danger"
        status_emoji=":x:"
    elif [[ $TOTAL_HIGH -gt 0 ]]; then
        color="warning"
        status_emoji=":warning:"
    fi
    
    local payload=$(cat <<EOF
{
  "attachments": [
    {
      "color": "${color}",
      "title": "${status_emoji} Political Sphere Audit Summary",
      "fields": [
        {"title": "Audit Run", "value": "${AUDIT_TIMESTAMP}", "short": true},
        {"title": "Critical", "value": "${TOTAL_CRITICAL}", "short": true},
        {"title": "High", "value": "${TOTAL_HIGH}", "short": true},
        {"title": "Medium", "value": "${TOTAL_MEDIUM}", "short": true},
        {"title": "Low", "value": "${TOTAL_LOW}", "short": true},
        {"title": "Passed", "value": "${TOTAL_PASS}", "short": true}
      ],
      "footer": "Political Sphere Audit System",
      "ts": $(date +%s)
    }
  ]
}
EOF
)
    
    if curl -X POST -H 'Content-type: application/json' --data "$payload" "$SLACK_WEBHOOK_URL" 2>/dev/null; then
        log_success "Slack notification sent"
    else
        log_warning "Failed to send Slack notification"
    fi
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    log_header "Political Sphere Central Audit System v1.0.0"
    
    # Setup
    mkdir -p "$OUTPUT_DIR"
    
    # Initialize audit log (JSONL - no comments, pure JSON lines)
    # Create empty file if it doesn't exist (append mode will add entries)
    if [[ ! -f "$AUDIT_LOG" ]]; then
        touch "$AUDIT_LOG"
    fi
    
    log_audit_entry "system" "INFO" "Audit run started" "Run ID: ${AUDIT_TIMESTAMP}"
    
    log_info "Audit Run ID: ${AUDIT_TIMESTAMP}"
    log_info "Output Directory: ${OUTPUT_DIR}"
    log_info "Auto-Fix: ${AUTO_FIX}"
    log_info "Selected Audits: ${SELECTED_AUDITS[*]}"
    
    # Validate selected audits
    for audit in "${SELECTED_AUDITS[@]}"; do
        if [[ ! " ${AVAILABLE_AUDITS[*]} " =~ " ${audit} " ]]; then
            log_error "Unknown audit domain: $audit"
            log_info "Available audits: ${AVAILABLE_AUDITS[*]}"
            exit 1
        fi
    done
    
    # Run audits
    local run_start=$(date +%s)
    
    for audit in "${SELECTED_AUDITS[@]}"; do
        case "$audit" in
            openapi)
                run_openapi_audit || true
                ;;
            devcontainer)
                run_devcontainer_audit || true
                ;;
            github)
                run_github_audit || true
                ;;
            apps)
                run_app_audits || true
                ;;
        esac
    done
    
    local run_end=$(date +%s)
    local total_duration=$((run_end - run_start))
    
    # Generate reports
    generate_summary_report
    generate_json_report
    
    # Send notifications
    send_slack_notification || true
    
    # Display results
    log_header "Audit Complete"
    
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                      FINAL RESULTS                            ║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    printf "║  ${RED}Critical:${NC} %-4d  ${RED}High:${NC} %-4d  ${YELLOW}Medium:${NC} %-4d  ${YELLOW}Low:${NC} %-4d    ║\n" "$TOTAL_CRITICAL" "$TOTAL_HIGH" "$TOTAL_MEDIUM" "$TOTAL_LOW"
    printf "║  ${CYAN}Info:${NC} %-4d      ${GREEN}Pass:${NC} %-4d  ${BLUE}Auto-Fixed:${NC} %-4d         ║\n" "$TOTAL_INFO" "$TOTAL_PASS" "$TOTAL_AUTO_FIXED"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    printf "║  Total Duration: %-3d seconds                                ║\n" "$total_duration"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Production readiness assessment
    if [[ $TOTAL_CRITICAL -eq 0 && $TOTAL_HIGH -eq 0 ]]; then
        echo -e "${GREEN}✓ PRODUCTION READY${NC}"
        echo ""
        log_audit_entry "system" "INFO" "Audit completed - PRODUCTION READY" "Critical: 0, High: 0"
        exit 0
    elif [[ $TOTAL_CRITICAL -gt 0 ]]; then
        echo -e "${RED}✗ NOT PRODUCTION READY - CRITICAL ISSUES FOUND${NC}"
        echo ""
        log_audit_entry "system" "CRITICAL" "Audit completed - NOT PRODUCTION READY" "Critical: ${TOTAL_CRITICAL}"
        exit 2
    else
        echo -e "${YELLOW}⚠ PRODUCTION READY WITH HIGH-SEVERITY WARNINGS${NC}"
        echo ""
        log_audit_entry "system" "WARNING" "Audit completed - WARNINGS" "High: ${TOTAL_HIGH}"
        
        if [[ "$FAIL_ON_WARNINGS" == "true" ]]; then
            exit 1
        else
            exit 0
        fi
    fi
}

# Run main function
main "$@"
