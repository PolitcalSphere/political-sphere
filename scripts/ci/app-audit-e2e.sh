#!/usr/bin/env bash
# App Audit: E2E Testing Suite
# Version: 1.0.0
# Generated: 2025-11-08

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/app-audit-base.sh"

APP_NAME="e2e"
APP_DIR="${PROJECT_ROOT}/apps/e2e"

# Override testing phase for E2E specifics
phase4_testing() {
    log_section "Phase 4: E2E Testing Validation"
    
    # Check for test files
    if [[ -d "${APP_DIR}/src" ]] || [[ -d "${APP_DIR}/tests" ]]; then
        TEST_COUNT=$(find "${APP_DIR}" -name "*.spec.ts" -o -name "*.test.ts" 2>/dev/null | wc -l | tr -d ' ')
        log_info "Found ${TEST_COUNT} E2E test files"
        
        if [[ ${TEST_COUNT} -eq 0 ]]; then
            log_medium "No E2E test files found (*.spec.ts, *.test.ts)"
        else
            log_pass "E2E test files present"
        fi
    fi
    
    # Check for Playwright configuration
    if [[ -f "${APP_DIR}/playwright.config.ts" ]]; then
        log_pass "Playwright configuration found"
        
        # Validate Playwright config
        if grep -q "testDir:" "${APP_DIR}/playwright.config.ts"; then
            log_pass "Playwright testDir configured"
        else
            log_medium "Playwright testDir not explicitly configured"
        fi
        
        # Check for browser configurations
        if grep -q "chromium\|firefox\|webkit" "${APP_DIR}/playwright.config.ts"; then
            log_pass "Multi-browser testing configured"
        else
            log_medium "Consider testing across multiple browsers"
        fi
        
        # Check for screenshot/video on failure
        if grep -q "screenshot.*on.*failure\|video.*on.*failure" "${APP_DIR}/playwright.config.ts"; then
            log_pass "Screenshot/video on failure enabled"
        else
            log_medium "Enable screenshot/video capture on test failures"
        fi
    else
        log_medium "No Playwright config found (playwright.config.ts)"
    fi
    
    # Check for accessibility testing
    if grep -r "@axe-core/playwright\|axe-playwright" "${APP_DIR}" 2>/dev/null > /dev/null; then
        log_pass "Accessibility testing library found"
    else
        log_medium "Consider adding axe-core for accessibility testing (WCAG 2.2 AA)"
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
