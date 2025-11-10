#!/usr/bin/env bash
# =============================================================================
# Central Audit System v2.1.0
# =============================================================================
#
# Orchestrates all individual audit scripts with centralized reporting.
# Stores audit trails in docs/audit-trail/ for compliance tracking.
#
# Features:
# - Run all audits or select specific ones
# - Centralized audit trail (JSONL format in docs/audit-trail/)
# - Aggregated reporting across all audit types
# - Production readiness assessment
# - Individual and combined exit codes
#
# Usage:
#   ./audit-central.sh                    # Run all audits
#   ./audit-central.sh github devcontainer # Run specific audits
#   AUTO_FIX=true ./audit-central.sh      # Run with auto-fix
#
# Exit Codes:
#   0 - All audits passed
#   1 - Warnings or medium-severity issues
#   2 - Critical or high-severity issues
#
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Audit trail directory (docs/audit-trail/)
AUDIT_TRAIL_DIR="${PROJECT_ROOT}/docs/audit-trail"
AUDIT_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
AUDIT_DATE=$(date -u +"%Y-%m-%d")
AUDIT_LOG="${AUDIT_TRAIL_DIR}/audit-log-${AUDIT_DATE}.jsonl"
AUDIT_SUMMARY="${AUDIT_TRAIL_DIR}/audit-summary-${AUDIT_DATE}.txt"
AUDIT_JSON="${AUDIT_TRAIL_DIR}/audit-summary-${AUDIT_DATE}.json"
AUDIT_MD="${AUDIT_TRAIL_DIR}/audit-summary-${AUDIT_DATE}.md"

# Individual audit output directories (still in project root for easy access)
GITHUB_AUDIT_DIR="${PROJECT_ROOT}/github-audit"
DEVCONTAINER_AUDIT_DIR="${PROJECT_ROOT}/devcontainer-audit"
OPENAPI_AUDIT_DIR="${PROJECT_ROOT}/openapi-audit"
APP_AUDIT_DIR="${PROJECT_ROOT}/app-audit"

# Environment variables
AUTO_FIX="${AUTO_FIX:-false}"
FAIL_ON_WARNINGS="${FAIL_ON_WARNINGS:-false}"
PARALLEL="${PARALLEL:-false}"
# OUTPUT_FORMAT: full|compact|markdown|json (full default)
OUTPUT_FORMAT="${OUTPUT_FORMAT:-full}"
# PLAIN_OUTPUT=true forces removal of color (also honored if NO_COLOR env set per community convention)
PLAIN_OUTPUT="${PLAIN_OUTPUT:-false}"
# Width for box drawing; adjust for narrow terminals
AUDIT_WIDTH="${AUDIT_WIDTH:-69}"

# Color codes (will be blanked if NO_COLOR or PLAIN_OUTPUT)
if [[ "${NO_COLOR:-}" != "" || "${PLAIN_OUTPUT}" == "true" ]]; then
    RED=""; YELLOW=""; GREEN=""; BLUE=""; CYAN=""; NC="";
else
    RED='\033[0;31m'
    YELLOW='\033[1;33m'
    GREEN='\033[0;32m'
    BLUE='\033[0;34m'
    CYAN='\033[0;36m'
    NC='\033[0m'
fi

# Counters
TOTAL_AUDITS=0
PASSED_AUDITS=0
FAILED_AUDITS=0
TOTAL_CRITICAL=0
TOTAL_HIGH=0
TOTAL_MEDIUM=0
TOTAL_LOW=0

# Available audits
AVAILABLE_AUDITS=(
    "github"
    "devcontainer"
    "openapi"
    "apps"
)

# Selected audits (default: all)
SELECTED_AUDITS=()

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

_box_line() { local char="$1"; printf '%*s' "${AUDIT_WIDTH}" '' | tr ' ' "${char}"; }
_center() { # center text within width
    local text="$1"; local pad=$(( (AUDIT_WIDTH - ${#text}) / 2 ));
    printf "%*s%s%*s" "$pad" '' "$text" "$((AUDIT_WIDTH - pad - ${#text}))" '';
}
print_header() {
        local top="$( _box_line '═' )"
        echo ""
        printf "╔%s╗\n" "$top"
        printf "║%s║\n" "$( _center "Central Audit System v2.1.0" )"
        printf "╠%s╣\n" "$top"
        printf "║%s║\n" "$( _center "GitHub • DevContainer • OpenAPI • Apps" )"
        printf "╚%s╝\n" "$top"
        echo ""
        echo "Timestamp      : ${AUDIT_TIMESTAMP}"
        echo "Trail Directory: ${AUDIT_TRAIL_DIR}"
        echo "Auto-Fix       : ${AUTO_FIX}"
        echo "Output Format  : ${OUTPUT_FORMAT} (plain=${PLAIN_OUTPUT})"
        echo "Width          : ${AUDIT_WIDTH}"
        echo ""
        echo "(No reliance on color – textual severity labels provided; WCAG 2.2 AA alignment)"
}

setup_directories() {
    log_info "Setting up audit directories..."
    
    # Create audit trail directory in docs
    mkdir -p "${AUDIT_TRAIL_DIR}"
    
    # Create individual audit directories
    mkdir -p "${GITHUB_AUDIT_DIR}"
    mkdir -p "${DEVCONTAINER_AUDIT_DIR}"
    mkdir -p "${OPENAPI_AUDIT_DIR}"
    mkdir -p "${APP_AUDIT_DIR}"
    
    log_success "Directories created"
}

log_audit_event() {
    local audit_name="$1"
    local status="$2"
    local critical="${3:-0}"
    local high="${4:-0}"
    local medium="${5:-0}"
    local low="${6:-0}"
    
    # JSONL format (one JSON object per line)
    cat >> "${AUDIT_LOG}" <<EOF
{"timestamp":"${AUDIT_TIMESTAMP}","audit":"${audit_name}","status":"${status}","critical":${critical},"high":${high},"medium":${medium},"low":${low}}
EOF
}

run_audit() {
    local name="$1"
    local script_path="$2"
    local explicit_json_rel_path="${3:-}"

    local output_dir json_path status_label
    case "$name" in
        GitHub)
            output_dir="${GITHUB_AUDIT_DIR}"
            json_path="${GITHUB_AUDIT_DIR}/github-audit-results.json"
            ;;
        DevContainer)
            output_dir="${DEVCONTAINER_AUDIT_DIR}"
            json_path="${DEVCONTAINER_AUDIT_DIR}/devcontainer-audit-results.json"
            ;;
        OpenAPI)
            output_dir="${OPENAPI_AUDIT_DIR}"
            json_path="${OPENAPI_AUDIT_DIR}/openapi-audit-results.json"
            ;;
        App:*)
            output_dir="${PROJECT_ROOT}/reports/app-audit"
            # For apps we expect path like reports/app-audit/<app>/audit-results.json
            if [[ -n "$explicit_json_rel_path" ]]; then
                json_path="${PROJECT_ROOT}/${explicit_json_rel_path}"
            else
                json_path="" # best-effort
            fi
            ;;
        *)
            output_dir="${PROJECT_ROOT}"
            json_path=""
            ;;
    esac

    log_info "Running audit: ${name}"
    # Execute audit script with propagated env and OUTPUT_DIR
    OUTPUT_DIR="$output_dir" AUTO_FIX="$AUTO_FIX" FAIL_ON_WARNINGS="$FAIL_ON_WARNINGS" bash "$script_path"
    local rc=$?

    # Default counts
    local crit=0 high=0 med=0 low=0
    if [[ -n "$json_path" && -f "$json_path" ]]; then
        if command -v jq >/dev/null 2>&1; then
            crit=$(jq -r '.summary.critical // 0' "$json_path" 2>/dev/null || echo 0)
            high=$(jq -r '.summary.high // 0' "$json_path" 2>/dev/null || echo 0)
            med=$(jq -r '.summary.medium // 0' "$json_path" 2>/dev/null || echo 0)
            low=$(jq -r '.summary.low // 0' "$json_path" 2>/dev/null || echo 0)
        else
            # Fallback to grep/awk parsing (best effort)
            crit=$(grep -E '"critical"\s*:\s*[0-9]+' "$json_path" | head -1 | awk -F: '{gsub(/[^0-9]/,"",$2); print $2+0}' || echo 0)
            high=$(grep -E '"high"\s*:\s*[0-9]+' "$json_path" | head -1 | awk -F: '{gsub(/[^0-9]/,"",$2); print $2+0}' || echo 0)
            med=$(grep -E '"medium"\s*:\s*[0-9]+' "$json_path" | head -1 | awk -F: '{gsub(/[^0-9]/,"",$2); print $2+0}' || echo 0)
            low=$(grep -E '"low"\s*:\s*[0-9]+' "$json_path" | head -1 | awk -F: '{gsub(/[^0-9]/,"",$2); print $2+0}' || echo 0)
        fi
    fi

    # Aggregate totals
    TOTAL_CRITICAL=$((TOTAL_CRITICAL + crit)) || true
    TOTAL_HIGH=$((TOTAL_HIGH + high)) || true
    TOTAL_MEDIUM=$((TOTAL_MEDIUM + med)) || true
    TOTAL_LOW=$((TOTAL_LOW + low)) || true

    # Track pass/fail counts and audit trail status
    case $rc in
        0) PASSED_AUDITS=$((PASSED_AUDITS + 1)) || true; status_label="pass" ;;
        1) FAILED_AUDITS=$((FAILED_AUDITS + 1)) || true; status_label="warn" ;;
        2) FAILED_AUDITS=$((FAILED_AUDITS + 1)) || true; status_label="fail" ;;
        *) FAILED_AUDITS=$((FAILED_AUDITS + 1)) || true; status_label="error" ;;
    esac
    log_audit_event "$name" "$status_label" "$crit" "$high" "$med" "$low"

    return $rc
}

_aggregate_app_json() {
    # Build a compact list of per-app severities if jq present
    command -v jq >/dev/null 2>&1 || return 0
    local results=()
    shopt -s nullglob
    for f in "${PROJECT_ROOT}/app-audit"/*/audit-results.json; do
        local app_name
        app_name="$(basename "$(dirname "$f")")"
        local crit high med low
        crit=$(jq -r '.summary.critical // 0' "$f" 2>/dev/null || echo 0)
        high=$(jq -r '.summary.high // 0' "$f" 2>/dev/null || echo 0)
        med=$(jq -r '.summary.medium // 0' "$f" 2>/dev/null || echo 0)
        low=$(jq -r '.summary.low // 0' "$f" 2>/dev/null || echo 0)
        results+=("{\"app\":\"$app_name\",\"critical\":$crit,\"high\":$high,\"medium\":$med,\"low\":$low}")
    done
    local joined
    joined=$(IFS=,; echo "${results[*]}")
    echo "[$joined]"
}

_production_status_text() {
    if [[ ${TOTAL_CRITICAL} -gt 0 || ${TOTAL_HIGH} -gt 0 ]]; then
        echo "NOT_PRODUCTION_READY: Critical/High issues present"
    elif [[ ${FAILED_AUDITS} -gt 0 || ${TOTAL_MEDIUM} -gt 5 ]]; then
        echo "REVIEW_REQUIRED: Medium issues or failed audits"
    else
        echo "PRODUCTION_READY: All audits passed"
    fi
}

generate_summary() {
        log_info "Generating audit summary..."
        local status_text reason production_ready
        status_text=$(_production_status_text)

        if [[ ${TOTAL_CRITICAL} -gt 0 || ${TOTAL_HIGH} -gt 0 ]]; then
                reason="Critical or High severity issues found"
                production_ready=false
        elif [[ ${TOTAL_MEDIUM} -gt 5 ]]; then
                reason="Multiple Medium severity issues (${TOTAL_MEDIUM} found)"
                production_ready=false
        elif [[ ${FAILED_AUDITS} -gt 0 ]]; then
                reason="Some audits completed with issues"
                production_ready=false
        else
                reason="All audits passed successfully"
                production_ready=true
        fi

        # Always build per-app JSON for table + machine output (jq may be missing)
        local apps_json
        apps_json=$(_aggregate_app_json)

        # Plain/compact text summary unless OUTPUT_FORMAT=json or markdown only
        if [[ "${OUTPUT_FORMAT}" == "full" || "${OUTPUT_FORMAT}" == "compact" || "${OUTPUT_FORMAT}" == "json" ]]; then
                # For json-only we still emit a minimal text file for humans unless explicitly compact
                cat > "${AUDIT_SUMMARY}" <<EOF
Central Audit System v2.1.0 Summary
Timestamp: ${AUDIT_TIMESTAMP}
Auto-Fix: ${AUTO_FIX}
Selected Format: ${OUTPUT_FORMAT}

Overall:
    Total Audits  : ${TOTAL_AUDITS}
    Passed        : ${PASSED_AUDITS}
    Failed/Issues : ${FAILED_AUDITS}
Severity Totals:
    Critical      : ${TOTAL_CRITICAL}
    High          : ${TOTAL_HIGH}
    Medium        : ${TOTAL_MEDIUM}
    Low           : ${TOTAL_LOW}
Status: ${status_text}
Reason: ${reason}
Production Ready: ${production_ready}

Directories:
    github       -> ${GITHUB_AUDIT_DIR}
    devcontainer -> ${DEVCONTAINER_AUDIT_DIR}
    openapi      -> ${OPENAPI_AUDIT_DIR}
    apps         -> ${APP_AUDIT_DIR}
Audit Log (JSONL): ${AUDIT_LOG}
EOF
                if [[ "${OUTPUT_FORMAT}" == "compact" ]]; then
                        echo "(compact mode – detailed markdown omitted)" >> "${AUDIT_SUMMARY}"
                fi
        fi

        # Markdown summary (full & markdown modes only)
        if [[ "${OUTPUT_FORMAT}" == "full" || "${OUTPUT_FORMAT}" == "markdown" ]]; then
                local apps_table=""
                if command -v jq >/dev/null 2>&1 && [[ -n "${apps_json}" ]]; then
                        apps_table+=$'| App | Critical | High | Medium | Low |\n'
                        apps_table+=$'|-----|----------|------|--------|-----|\n'
                        apps_table+=$(echo "${apps_json}" | jq -r '.[] | "| \(.app) | \(.critical) | \(.high) | \(.medium) | \(.low) |"')
                else
                        apps_table="(Per-app severity breakdown unavailable - jq not installed or no app audit data)"
                fi
                cat > "${AUDIT_MD}" <<EOF
# Central Audit System Report (v2.1.0)

**Timestamp:** ${AUDIT_TIMESTAMP}  
**Auto-Fix:** ${AUTO_FIX}  
**Format:** ${OUTPUT_FORMAT}  
**Production Ready:** ${production_ready}

## Summary

| Metric | Value |
|--------|-------|
| Total Audits | ${TOTAL_AUDITS} |
| Passed | ${PASSED_AUDITS} |
| Failed/Issues | ${FAILED_AUDITS} |
| Critical | ${TOTAL_CRITICAL} |
| High | ${TOTAL_HIGH} |
| Medium | ${TOTAL_MEDIUM} |
| Low | ${TOTAL_LOW} |

## Production Readiness

**Status:** ${status_text}  
**Reason:** ${reason}

## Per-App Severity

${apps_table}

## Directories

| Category | Path |
|----------|------|
| GitHub Workflows | ${GITHUB_AUDIT_DIR} |
| DevContainer | ${DEVCONTAINER_AUDIT_DIR} |
| OpenAPI | ${OPENAPI_AUDIT_DIR} |
| Applications | ${APP_AUDIT_DIR} |

Audit trail directory: 
${AUDIT_TRAIL_DIR}

> Accessibility: This report uses textual severity indicators (no color dependency) complying with WCAG 2.2 AA.
EOF
        fi

        # JSON summary (always generated for machine consumption)
        cat > "${AUDIT_JSON}" <<EOF
{
    "version": "2.1.0",
    "timestamp": "${AUDIT_TIMESTAMP}",
    "autofix": ${AUTO_FIX},
    "outputFormat": "${OUTPUT_FORMAT}",
    "summary": {
        "total": ${TOTAL_AUDITS},
        "passed": ${PASSED_AUDITS},
        "failed": ${FAILED_AUDITS},
        "critical": ${TOTAL_CRITICAL},
        "high": ${TOTAL_HIGH},
        "medium": ${TOTAL_MEDIUM},
        "low": ${TOTAL_LOW},
        "status": "${status_text}",
        "reason": "${reason}",
        "production_ready": ${production_ready}
    },
    "apps": ${apps_json:-[]},
    "audit_directories": {
        "github": "${GITHUB_AUDIT_DIR}",
        "devcontainer": "${DEVCONTAINER_AUDIT_DIR}",
        "openapi": "${OPENAPI_AUDIT_DIR}",
        "apps": "${APP_AUDIT_DIR}"
    },
    "trail": "${AUDIT_TRAIL_DIR}"
}
EOF

        # Clean up unused formats (prevent stale files) when user selected single format
        case "${OUTPUT_FORMAT}" in
            markdown)
                [[ -f "${AUDIT_SUMMARY}" ]] && rm -f "${AUDIT_SUMMARY}" || true
                ;;
            json)
                [[ -f "${AUDIT_SUMMARY}" ]] && rm -f "${AUDIT_SUMMARY}" || true
                [[ -f "${AUDIT_MD}" ]] && rm -f "${AUDIT_MD}" || true
                ;;
            compact)
                [[ -f "${AUDIT_MD}" ]] && rm -f "${AUDIT_MD}" || true
                ;;
        esac

        log_success "Summary reports generated (format=${OUTPUT_FORMAT})"
}

print_final_results() {
    local top="$( _box_line '═' )"
    echo ""
    printf "╔%s╗\n" "$top"
    printf "║%s║\n" "$( _center "FINAL RESULTS" )"
    printf "╠%s╣\n" "$top"
    printf "║ %-20s %5d / %-5d %-24s║\n" "Audits Passed" ${PASSED_AUDITS} ${TOTAL_AUDITS} "(total)"
    printf "║ %-20s %5d  %-36s║\n" "Critical" ${TOTAL_CRITICAL} ""
    printf "║ %-20s %5d  %-36s║\n" "High" ${TOTAL_HIGH} ""
    printf "║ %-20s %5d  %-36s║\n" "Medium" ${TOTAL_MEDIUM} ""
    printf "║ %-20s %5d  %-36s║\n" "Low" ${TOTAL_LOW} ""
    printf "╚%s╝\n" "$top"
    echo ""
        local status_text ret=0
    status_text=$(_production_status_text)
    case "$status_text" in
      NOT_PRODUCTION_READY*) echo -e "${RED}❌ ${status_text}${NC}" ; ret=2 ;;
      REVIEW_REQUIRED*) echo -e "${YELLOW}⚠️ ${status_text}${NC}" ; ret=1 ;;
      PRODUCTION_READY*) echo -e "${GREEN}✅ ${status_text}${NC}" ; ret=0 ;;
    esac
    echo "Text Summary : ${AUDIT_SUMMARY}"
    echo "Markdown     : ${AUDIT_MD}"
    echo "JSON         : ${AUDIT_JSON}"
    return ${ret}
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    print_header
    
    # Parse command line arguments
    if [[ $# -eq 0 ]]; then
        # No arguments - run all audits
        SELECTED_AUDITS=("${AVAILABLE_AUDITS[@]}")
    elif [[ "$1" == "all" ]]; then
        # Explicit "all" - run all audits
        SELECTED_AUDITS=("${AVAILABLE_AUDITS[@]}")
    else
        # Run specified audits
        SELECTED_AUDITS=("$@")
    fi
    
    log_info "Selected audits: ${SELECTED_AUDITS[*]}"
    
    setup_directories
    
    # Run each selected audit
    for audit in "${SELECTED_AUDITS[@]}"; do
        case "${audit}" in
            github)
                TOTAL_AUDITS=$((TOTAL_AUDITS + 1)) || true
                run_audit "GitHub" "${SCRIPT_DIR}/github-audit.sh" || true
                ;;
            devcontainer)
                TOTAL_AUDITS=$((TOTAL_AUDITS + 1)) || true
                run_audit "DevContainer" "${SCRIPT_DIR}/devcontainer-audit.sh" || true
                ;;
            openapi)
                TOTAL_AUDITS=$((TOTAL_AUDITS + 1)) || true
                run_audit "OpenAPI" "${SCRIPT_DIR}/openapi-audit-fast.sh" || true
                ;;
            apps)
                log_info "Running App-Specific Audits"
                # Increment total audits for each app before running
                for app_entry in \
                    "API:app-audit-api.sh:api" \
                    "Web:app-audit-web.sh:web" \
                    "Worker:app-audit-worker.sh:worker" \
                    "GameServer:app-audit-game-server.sh:game-server" \
                    "Shell:app-audit-shell.sh:shell" \
                    "AuthRemote:app-audit-feature-auth-remote.sh:feature-auth-remote" \
                    "DashboardRemote:app-audit-feature-dashboard-remote.sh:feature-dashboard-remote" \
                    "E2E:app-audit-e2e.sh:e2e" \
                    "LoadTest:app-audit-load-test.sh:load-test" \
                    "Infrastructure:app-audit-infrastructure.sh:infrastructure"; do
                    IFS=':' read -r label script file_label <<< "${app_entry}"
                    TOTAL_AUDITS=$((TOTAL_AUDITS + 1)) || true
                    run_audit "App: ${label}" "${SCRIPT_DIR}/${script}" "app-audit/${file_label}/audit-results.json" || true
                done
                ;;
            *)
                log_error "Unknown audit: ${audit}"
                ;;
        esac
    done
    
    generate_summary
    print_final_results
}

main "$@"
