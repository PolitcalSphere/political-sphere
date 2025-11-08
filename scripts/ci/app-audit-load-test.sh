#!/usr/bin/env bash
# App Audit: Load Testing Suite
# Version: 1.0.0
# Generated: 2025-11-08

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/app-audit-base.sh"

APP_NAME="load-test"
APP_DIR="${PROJECT_ROOT}/apps/load-test"

# Override testing phase for load testing specifics
phase4_testing() {
    log_section "Phase 4: Load Testing Validation"
    
    # Check for k6 scripts
    if find "${APP_DIR}" -name "*.js" -o -name "*.ts" 2>/dev/null | grep -q .; then
        SCRIPT_COUNT=$(find "${APP_DIR}" -name "*.js" -o -name "*.ts" 2>/dev/null | wc -l | tr -d ' ')
        log_info "Found ${SCRIPT_COUNT} load test scripts"
        log_pass "Load test scripts present"
    else
        log_medium "No load test scripts found"
    fi
    
    # Check for k6 configuration
    if [[ -f "${APP_DIR}/k6.config.js" ]] || [[ -f "${APP_DIR}/k6.yaml" ]]; then
        log_pass "k6 configuration found"
    fi
    
    # Validate load test patterns
    for script in "${APP_DIR}"/*.{js,ts} 2>/dev/null; do
        [[ -f "$script" ]] || continue
        local basename_script=$(basename "$script")
        
        # Check for proper test structure
        if grep -q "export default function" "$script"; then
            log_pass "${basename_script}: Proper k6 test structure"
        else
            log_medium "${basename_script}: Missing 'export default function'"
        fi
        
        # Check for thresholds (SLOs)
        if grep -q "thresholds:" "$script"; then
            log_pass "${basename_script}: Performance thresholds defined (SLO)"
        else
            log_medium "${basename_script}: No performance thresholds - define SLOs"
        fi
        
        # Check for stages (ramp-up/down)
        if grep -q "stages:" "$script"; then
            log_pass "${basename_script}: Load stages configured"
        else
            log_medium "${basename_script}: Consider adding load stages (ramp-up/down)"
        fi
        
        # Check for custom metrics
        if grep -q "Trend\|Counter\|Gauge\|Rate" "$script"; then
            log_pass "${basename_script}: Custom metrics defined"
        fi
    done
    
    # Check for realistic test data
    if [[ -d "${APP_DIR}/data" ]] || [[ -d "${APP_DIR}/fixtures" ]]; then
        log_pass "Test data directory found"
    else
        log_low "Consider adding test data directory for realistic scenarios"
    fi
}

# Override security phase - load tests have different concerns
phase3_security() {
    log_section "Phase 3: Load Test Security"
    
    # Check for hardcoded endpoints
    if grep -r "http://\|https://" "${APP_DIR}" 2>/dev/null | \
       grep -v "localhost\|127.0.0.1\|example.com\|__ENV\|environment" > "${APP_AUDIT_DIR}/hardcoded-urls.log" 2>&1; then
        URL_COUNT=$(wc -l < "${APP_AUDIT_DIR}/hardcoded-urls.log" | tr -d ' ')
        if [[ ${URL_COUNT} -gt 0 ]]; then
            log_medium "Found ${URL_COUNT} hardcoded URLs - use environment variables"
        fi
    else
        log_pass "No hardcoded production URLs found"
    fi
    
    # Check for API keys in load tests
    if grep -r -i "api[_-]key\|bearer\|authorization" "${APP_DIR}" 2>/dev/null | \
       grep -v "__ENV\|process.env" > "${APP_AUDIT_DIR}/auth-tokens.log" 2>&1; then
        log_high "Potential hardcoded credentials in load tests"
        log_info "See ${APP_AUDIT_DIR}/auth-tokens.log"
    else
        log_pass "No hardcoded credentials found"
    fi
}

# Run the standard audit
main() {
    phase1_environment
    phase2_code_quality
    phase3_security
    phase4_testing
    phase5_dependencies
    phase6_summary
}

main "$@"
