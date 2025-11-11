#!/usr/bin/env bash
# Microfrontend Audit - Module Federation specific checks
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# APP_NAME must be set by caller
if [[ -z "${APP_NAME:-}" ]]; then
    echo "Error: APP_NAME must be set (e.g., feature-auth-remote, shell)"
    exit 1
fi

APP_DIR="${PROJECT_ROOT}/apps/${APP_NAME}"
AUDIT_DIR="${PROJECT_ROOT}/app-audit/${APP_NAME}"

source "${SCRIPT_DIR}/app-audit-base.sh"

phase7_microfrontend_specific() {
    log_section "Phase 7: Microfrontend-Specific Checks"
    
    # 7.1 Module Federation
    if [[ -f "${APP_DIR}/module-federation.config.ts" ]] || grep -rq "@module-federation\|ModuleFederationPlugin" "${APP_DIR}" 2>/dev/null; then
        log_pass "Module Federation configured"
    else
        log_high "No Module Federation config"
    fi
    
    # 7.2 Shared Dependencies
    if [[ -f "${APP_DIR}/module-federation.config.ts" ]]; then
        grep -q "shared:" "${APP_DIR}/module-federation.config.ts" && log_pass "Shared deps configured" || log_medium "No shared deps"
    fi
    
    # 7.3 Remote Entry Point
    [[ -f "${APP_DIR}/src/remote-entry.ts" ]] && log_pass "Remote entry point" || log_medium "No remote entry"
    
    # 7.4 Exposed Modules
    if grep -rq "exposes:" "${APP_DIR}" 2>/dev/null; then
        EXPOSED_COUNT=$(grep -r "exposes:" "${APP_DIR}" | wc -l | tr -d ' ')
        log_pass "Exposes ${EXPOSED_COUNT} modules"
    else
        [[ "${APP_NAME}" == "shell" ]] && log_pass "Shell (host) doesn't expose" || log_medium "No exposed modules"
    fi
}

main_microfrontend() {
    print_header
    phase1_app_structure || true
    phase2_code_quality || true
    phase3_security || true
    phase4_testing || true
    phase5_dependencies || true
    phase6_configuration || true
    phase7_microfrontend_specific || true
    generate_report
}

main_microfrontend
