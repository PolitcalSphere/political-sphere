#!/usr/bin/env bash
# Web App Audit - Frontend-specific checks
set -euo pipefail

export APP_NAME="web"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
APP_DIR="${PROJECT_ROOT}/apps/${APP_NAME}"
AUDIT_DIR="${PROJECT_ROOT}/app-audit/${APP_NAME}"

source "${SCRIPT_DIR}/app-audit-base.sh"

phase7_web_specific() {
    log_section "Phase 7: Web App-Specific Checks"
    
    # 7.1 React & Build
    grep -rq "react" "${APP_DIR}" 2>/dev/null && log_pass "React application" || log_high "React not found"
    [[ -f "${APP_DIR}/vite.config.ts" ]] && log_pass "Vite config found" || log_medium "No Vite config"
    
    # 7.2 Accessibility
    log_info "Checking accessibility..."
    grep -rq "axe-core\|@axe-core" "${PROJECT_ROOT}/package.json" 2>/dev/null && log_pass "axe-core installed" || log_high "No axe-core (WCAG testing)"
    grep -rq "aria-" "${APP_DIR}/src" 2>/dev/null && log_pass "ARIA attributes used" || log_medium "No ARIA attributes found"
    
    # 7.3 Security Headers
    grep -rq "Content-Security-Policy\|CSP" "${APP_DIR}" 2>/dev/null && log_pass "CSP found" || log_medium "No CSP"
    
    # 7.4 Environment
    [[ -f "${APP_DIR}/.env.example" ]] && log_pass ".env.example found" || log_medium ".env.example missing"
    
    # 7.5 Bundle Size (if dist exists)
    if [[ -d "${APP_DIR}/dist" ]]; then
        BUNDLE_SIZE=$(du -sh "${APP_DIR}/dist" 2>/dev/null | cut -f1)
        log_info "Bundle size: ${BUNDLE_SIZE}"
    fi
    
    # 7.6 PWA/Service Worker
    [[ -f "${APP_DIR}/public/manifest.json" ]] && log_pass "PWA manifest" || log_low "No PWA manifest"
}

main_web() {
    print_header
    phase1_app_structure || true
    phase2_code_quality || true
    phase3_security || true
    phase4_testing || true
    phase5_dependencies || true
    phase6_configuration || true
    phase7_web_specific || true
    generate_report
}

main_web
