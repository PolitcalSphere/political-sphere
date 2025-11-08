#!/usr/bin/env bash
################################################################################
# Base App Audit Template for Nx Monorepo Apps
# Version: 1.0.0
#
# This script provides common audit checks for all applications in the
# Political Sphere Nx monorepo. App-specific audits should source this file
# and add their own custom checks.
#
# Usage:
#   APP_NAME=api ./app-audit-base.sh
#   APP_NAME=web ./app-audit-base.sh
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# App name must be provided
if [[ -z "${APP_NAME:-}" ]]; then
    echo "Error: APP_NAME environment variable required"
    echo "Usage: APP_NAME=api $0"
    exit 1
fi

APP_DIR="${PROJECT_ROOT}/apps/${APP_NAME}"
AUDIT_DIR="${PROJECT_ROOT}/app-audit"
APP_AUDIT_DIR="${AUDIT_DIR}/${APP_NAME}"

# Environment variables
AUTO_FIX="${AUTO_FIX:-false}"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
CRITICAL_COUNT=0
HIGH_COUNT=0
MEDIUM_COUNT=0
LOW_COUNT=0
PASS_COUNT=0

# Create audit directories
mkdir -p "${APP_AUDIT_DIR}"

log_critical() { echo -e "${RED}[CRITICAL]${NC} $1"; CRITICAL_COUNT=$((CRITICAL_COUNT + 1)) || true; }
log_high() { echo -e "${RED}[HIGH]${NC} $1"; HIGH_COUNT=$((HIGH_COUNT + 1)) || true; }
log_medium() { echo -e "${YELLOW}[MEDIUM]${NC} $1"; MEDIUM_COUNT=$((MEDIUM_COUNT + 1)) || true; }
log_low() { echo -e "${YELLOW}[LOW]${NC} $1"; LOW_COUNT=$((LOW_COUNT + 1)) || true; }
log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; PASS_COUNT=$((PASS_COUNT + 1)) || true; }
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }

log_section() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

print_header() {
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║            App Audit: ${APP_NAME}                                  "
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "App Directory: ${APP_DIR}"
    echo "Auto-Fix: ${AUTO_FIX}"
    echo ""
}

################################################################################
# Phase 1: App Structure Validation
################################################################################

phase1_app_structure() {
    log_section "Phase 1: App Structure Validation"
    
    # Check app directory exists
    if [[ ! -d "${APP_DIR}" ]]; then
        log_critical "App directory not found: ${APP_DIR}"
        return 1
    fi
    log_pass "App directory exists: ${APP_DIR}"
    
    # Check project.json (Nx configuration)
    if [[ -f "${APP_DIR}/project.json" ]]; then
        log_pass "project.json found"
        
        # Validate JSON
        if jq empty "${APP_DIR}/project.json" 2>/dev/null; then
            log_pass "project.json is valid JSON"
        else
            log_high "project.json is invalid JSON"
        fi
    else
        log_critical "project.json not found (required for Nx apps)"
    fi
    
    # Check tsconfig.json
    if [[ -f "${APP_DIR}/tsconfig.json" ]]; then
        log_pass "tsconfig.json found"
        
        # Check extends base config
        if grep -q '"extends".*"../../tsconfig.base.json"' "${APP_DIR}/tsconfig.json"; then
            log_pass "tsconfig extends base configuration"
        else
            log_medium "tsconfig should extend base configuration"
        fi
    else
        log_high "tsconfig.json not found"
    fi
    
    # Check src directory
    if [[ -d "${APP_DIR}/src" ]]; then
        log_pass "src/ directory exists"
    else
        log_critical "src/ directory not found"
    fi
    
    # Check for README
    if [[ -f "${APP_DIR}/README.md" ]]; then
        log_pass "README.md exists"
    else
        log_low "README.md missing (recommended for documentation)"
    fi
}

################################################################################
# Phase 2: Code Quality Checks
################################################################################

phase2_code_quality() {
    log_section "Phase 2: Code Quality Checks"
    
    # Check for TypeScript files
    TS_FILE_COUNT=$(find "${APP_DIR}/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ')
    if [[ ${TS_FILE_COUNT} -gt 0 ]]; then
        log_pass "TypeScript files found: ${TS_FILE_COUNT}"
    else
        log_medium "No TypeScript files found in src/"
    fi
    
    # Check for ESLint configuration
    if [[ -f "${APP_DIR}/.eslintrc.json" ]] || [[ -f "${PROJECT_ROOT}/.eslintrc.json" ]]; then
        log_pass "ESLint configuration found"
        
        # Skip ESLint if requested
        if [[ "${SKIP_ESLINT:-false}" == "true" ]]; then
            log_info "Skipping ESLint checks (SKIP_ESLINT=true)"
        elif command -v npx &> /dev/null; then
            # Auto-fix mode: run ESLint with --fix flag
            if [[ "${AUTO_FIX}" == "true" ]]; then
                log_info "Running ESLint with auto-fix..."
                if npx eslint "${APP_DIR}/src" --fix --max-warnings 0 > "${APP_AUDIT_DIR}/eslint.log" 2>&1; then
                    log_pass "ESLint auto-fix completed successfully"
                else
                    FIXED_COUNT=$(grep -c "✔" "${APP_AUDIT_DIR}/eslint.log" 2>/dev/null || echo "0")
                    REMAINING_COUNT=$(grep -c "✖" "${APP_AUDIT_DIR}/eslint.log" 2>/dev/null || echo "0")
                    
                    if [[ ${FIXED_COUNT} -gt 0 ]]; then
                        log_pass "ESLint auto-fixed ${FIXED_COUNT} issues"
                    fi
                    if [[ ${REMAINING_COUNT} -gt 0 ]]; then
                        log_medium "ESLint found ${REMAINING_COUNT} issues requiring manual fix"
                    fi
                    log_info "See ${APP_AUDIT_DIR}/eslint.log for details"
                fi
            else
                # Normal mode: run ESLint without --fix
                log_info "Running ESLint..."
                if npx eslint "${APP_DIR}/src" --max-warnings 0 > "${APP_AUDIT_DIR}/eslint.log" 2>&1; then
                    log_pass "ESLint passed with no warnings"
                else
                    WARNING_COUNT=$(grep -c "warning" "${APP_AUDIT_DIR}/eslint.log" 2>/dev/null || echo "0")
                    ERROR_COUNT=$(grep -c "error" "${APP_AUDIT_DIR}/eslint.log" 2>/dev/null || echo "0")
                    
                    if [[ ${ERROR_COUNT} -gt 0 ]]; then
                        log_high "ESLint found ${ERROR_COUNT} errors (run with AUTO_FIX=true to auto-fix)"
                    elif [[ ${WARNING_COUNT} -gt 0 ]]; then
                        log_medium "ESLint found ${WARNING_COUNT} warnings (run with AUTO_FIX=true to auto-fix)"
                    fi
                    log_info "See ${APP_AUDIT_DIR}/eslint.log for details"
                fi
            fi
        fi
    else
        log_low "No ESLint configuration found"
    fi
    
    # Check for Prettier configuration and apply auto-formatting
    if [[ -f "${PROJECT_ROOT}/.prettierrc" ]] || [[ -f "${PROJECT_ROOT}/.prettierrc.json" ]] || [[ -f "${PROJECT_ROOT}/.prettierrc.js" ]]; then
        log_pass "Prettier configuration found"
        
        if [[ "${AUTO_FIX}" == "true" ]] && command -v npx &> /dev/null; then
            log_info "Running Prettier auto-format..."
            if npx prettier --write "${APP_DIR}/src/**/*.{ts,tsx,js,jsx,json,css,scss,md}" > "${APP_AUDIT_DIR}/prettier.log" 2>&1; then
                FORMATTED_COUNT=$(grep -c "unchanged" "${APP_AUDIT_DIR}/prettier.log" 2>/dev/null || echo "0")
                log_pass "Prettier formatted code successfully"
                log_info "See ${APP_AUDIT_DIR}/prettier.log for details"
            fi
        elif command -v npx &> /dev/null; then
            log_info "Run with AUTO_FIX=true to auto-format with Prettier"
        fi
    fi
    
    # Check TypeScript compilation
    if command -v npx &> /dev/null && [[ -f "${APP_DIR}/tsconfig.json" ]]; then
        # TypeScript compilation check
    if [[ "${SKIP_TSC:-false}" == "true" ]]; then
        log_info "Skipping TypeScript compilation (SKIP_TSC=true)"
    elif [[ -f "${APP_DIR}/tsconfig.json" ]] && command -v npx &> /dev/null; then
        log_info "Checking TypeScript compilation..."
        if npx --yes -q tsc --noEmit --project "${APP_DIR}/tsconfig.json" > "${APP_AUDIT_DIR}/tsc.log" 2>&1; then
            log_pass "TypeScript compilation successful"
        else
            log_high "TypeScript compilation failed - see ${APP_AUDIT_DIR}/tsc.log"
        fi
    fi
    fi
}

################################################################################
# Phase 3: Security Checks (OWASP Top 10 2021 + CIS + NIST SP 800-53)
################################################################################

phase3_security() {
    log_section "Phase 3: Security Checks"
    
    log_info "Running comprehensive security scans (OWASP Top 10 2021 + CIS + NIST)..."
    
    # =========================================================================
    # OWASP A01:2021 - Broken Access Control (NIST AC-* controls)
    # =========================================================================
    log_info "A01:2021 - Checking access control patterns..."
    
    # Check for missing authorization checks
    if grep -r "router\.\(get\|post\|put\|delete\|patch\)" "${APP_DIR}/src" 2>/dev/null | \
       grep -v "authenticate\|authorize\|checkPermission\|requireAuth" > "${APP_AUDIT_DIR}/missing-auth.log" 2>&1; then
        UNPROTECTED_ROUTES=$(wc -l < "${APP_AUDIT_DIR}/missing-auth.log" | tr -d ' ')
        if [[ ${UNPROTECTED_ROUTES} -gt 0 ]]; then
            log_high "Found ${UNPROTECTED_ROUTES} potentially unprotected routes (OWASP A01:2021, NIST AC-3)"
            log_info "See ${APP_AUDIT_DIR}/missing-auth.log"
        fi
    else
        log_pass "Route authorization patterns look good"
    fi
    
    # Check for insecure direct object references (IDOR)
    if grep -r "req\.params\." "${APP_DIR}/src" 2>/dev/null | \
       grep -v "validate\|sanitize\|checkOwnership" > "${APP_AUDIT_DIR}/idor-risk.log" 2>&1; then
        IDOR_RISK=$(wc -l < "${APP_AUDIT_DIR}/idor-risk.log" | tr -d ' ')
        if [[ ${IDOR_RISK} -gt 10 ]]; then
            log_medium "Found ${IDOR_RISK} direct parameter uses - verify ownership checks (OWASP A01:2021)"
        fi
    fi
    
    # =========================================================================
    # OWASP A02:2021 - Cryptographic Failures (NIST SC-12, SC-13)
    # =========================================================================
    log_info "A02:2021 - Checking cryptographic implementations..."
    
    # Check for weak crypto algorithms
    if grep -r -E "(MD5|SHA1|DES|RC4)" "${APP_DIR}/src" 2>/dev/null > "${APP_AUDIT_DIR}/weak-crypto.log" 2>&1; then
        log_critical "Weak cryptographic algorithms detected (OWASP A02:2021, NIST SC-13)"
        log_info "Use SHA-256+, AES-256-GCM, bcrypt. See ${APP_AUDIT_DIR}/weak-crypto.log"
    else
        log_pass "No weak cryptographic algorithms detected"
    fi
    
    # Check for hardcoded secrets
    log_info "Scanning for hardcoded secrets (OWASP A02:2021, CIS 5.1)..."
    SECRETS_FOUND=0
    
    if grep -r -i "password.*=.*['\"]" "${APP_DIR}/src" 2>/dev/null | grep -v "password.*: *''" > "${APP_AUDIT_DIR}/secrets.log" 2>&1; then
        SECRETS_FOUND=$((SECRETS_FOUND + 1))
    fi
    
    if grep -r -i "api[_-]key.*=.*['\"]" "${APP_DIR}/src" 2>/dev/null | grep -v "api.*key.*: *''" >> "${APP_AUDIT_DIR}/secrets.log" 2>&1; then
        SECRETS_FOUND=$((SECRETS_FOUND + 1))
    fi
    
    if grep -r -i "secret.*=.*['\"]" "${APP_DIR}/src" 2>/dev/null | grep -v "secret.*: *''" >> "${APP_AUDIT_DIR}/secrets.log" 2>&1; then
        SECRETS_FOUND=$((SECRETS_FOUND + 1))
    fi
    
    if grep -r -E "(JWT_SECRET|DATABASE_URL|PRIVATE_KEY).*=.*['\"][^'\"]+['\"]" "${APP_DIR}/src" 2>/dev/null >> "${APP_AUDIT_DIR}/secrets.log" 2>&1; then
        SECRETS_FOUND=$((SECRETS_FOUND + 1))
    fi
    
    if [[ ${SECRETS_FOUND} -eq 0 ]]; then
        log_pass "No hardcoded secrets found"
    else
        log_critical "Found ${SECRETS_FOUND} types of hardcoded secrets (OWASP A02:2021, NIST IA-5)"
        log_info "Use environment variables or secret managers. See ${APP_AUDIT_DIR}/secrets.log"
    fi
    
    # =========================================================================
    # OWASP A03:2021 - Injection (NIST SI-10)
    # =========================================================================
    log_info "A03:2021 - Checking for injection vulnerabilities..."
    
    # SQL Injection risks
    if grep -r -E "(\\\$\{.*\}.*query|query.*\\\$\{|execute\(.*\+)" "${APP_DIR}/src" 2>/dev/null > "${APP_AUDIT_DIR}/sql-injection.log" 2>&1; then
        log_critical "Potential SQL injection detected - use parameterized queries (OWASP A03:2021, NIST SI-10)"
        log_info "See ${APP_AUDIT_DIR}/sql-injection.log"
    else
        log_pass "No obvious SQL injection patterns found"
    fi
    
    # Command Injection
    if grep -r -E "(exec\(|spawn\(|child_process)" "${APP_DIR}/src" 2>/dev/null > "${APP_AUDIT_DIR}/command-injection.log" 2>&1; then
        EXEC_COUNT=$(wc -l < "${APP_AUDIT_DIR}/command-injection.log" | tr -d ' ')
        log_high "Found ${EXEC_COUNT} command execution calls - verify input sanitization (OWASP A03:2021)"
    fi
    
    # eval() usage (code injection)
    if grep -r "eval\(" "${APP_DIR}/src" 2>/dev/null > "${APP_AUDIT_DIR}/eval-usage.log" 2>&1; then
        log_critical "Found eval() usage - major code injection risk (OWASP A03:2021, CIS 4.5)"
        log_info "See ${APP_AUDIT_DIR}/eval-usage.log"
    else
        log_pass "No eval() usage found"
    fi
    
    # =========================================================================
    # OWASP A04:2021 - Insecure Design (NIST SA-*)
    # =========================================================================
    log_info "A04:2021 - Checking design security patterns..."
    
    # Check for rate limiting
    if ! grep -r "rateLimit\|express-rate-limit\|rate-limiter" "${APP_DIR}/src" 2>/dev/null > /dev/null; then
        log_medium "No rate limiting detected - consider adding (OWASP A04:2021, NIST SC-5)"
    else
        log_pass "Rate limiting implementation found"
    fi
    
    # =========================================================================
    # OWASP A05:2021 - Security Misconfiguration (NIST CM-*)
    # =========================================================================
    log_info "A05:2021 - Checking security configuration..."
    
    # Check for debug/development code in production
    if grep -r -E "(DEBUG.*=.*true|NODE_ENV.*development)" "${APP_DIR}/src" 2>/dev/null > "${APP_AUDIT_DIR}/debug-code.log" 2>&1; then
        log_medium "Debug/development code found - may leak sensitive info (OWASP A05:2021, NIST CM-7)"
    fi
    
    # console.log in production (information disclosure)
    if grep -r "console\.log" "${APP_DIR}/src" 2>/dev/null | grep -v "// console.log" > "${APP_AUDIT_DIR}/console.log" 2>&1; then
        CONSOLE_COUNT=$(wc -l < "${APP_AUDIT_DIR}/console.log" | tr -d ' ')
        log_medium "Found ${CONSOLE_COUNT} console.log statements (OWASP A05:2021, CIS 8.2)"
        log_info "Remove for production or use structured logging"
    else
        log_pass "No console.log statements found"
    fi
    
    # =========================================================================
    # OWASP A06:2021 - Vulnerable Components (NIST RA-5, SI-2)
    # =========================================================================
    # (Handled in phase5_dependencies with npm audit + OWASP Dependency-Check)
    
    # =========================================================================
    # OWASP A07:2021 - Authentication Failures (NIST IA-*)
    # =========================================================================
    log_info "A07:2021 - Checking authentication security..."
    
    # Weak password requirements
    if grep -r -E "password.*length.*<.*[1-7][^0-9]" "${APP_DIR}/src" 2>/dev/null > "${APP_AUDIT_DIR}/weak-password.log" 2>&1; then
        log_high "Weak password requirements detected (OWASP A07:2021, NIST IA-5)"
        log_info "Require minimum 8 characters. See ${APP_AUDIT_DIR}/weak-password.log"
    fi
    
    # Missing session timeout
    if grep -r "session\|jwt" "${APP_DIR}/src" 2>/dev/null | \
       grep -v -E "(timeout|maxAge|expiresIn)" > "${APP_AUDIT_DIR}/no-timeout.log" 2>&1; then
        SESSION_NO_TIMEOUT=$(wc -l < "${APP_AUDIT_DIR}/no-timeout.log" | tr -d ' ')
        if [[ ${SESSION_NO_TIMEOUT} -gt 5 ]]; then
            log_medium "Session/JWT timeout may not be configured (OWASP A07:2021, NIST AC-12)"
        fi
    fi
    
    # =========================================================================
    # OWASP A08:2021 - Software and Data Integrity Failures (NIST SI-7)
    # =========================================================================
    log_info "A08:2021 - Checking integrity controls..."
    
    # Unsigned/unverified updates
    if grep -r "auto-update\|checkForUpdates" "${APP_DIR}/src" 2>/dev/null | \
       grep -v "verify\|signature\|checksum" > "${APP_AUDIT_DIR}/unsigned-updates.log" 2>&1; then
        log_high "Auto-update without verification detected (OWASP A08:2021, NIST SI-7)"
    fi
    
    # =========================================================================
    # OWASP A09:2021 - Security Logging Failures (NIST AU-*)
    # =========================================================================
    log_info "A09:2021 - Checking logging and monitoring..."
    
    # Missing audit logging for sensitive operations
    if grep -r -E "(delete|update|create).*User\|Admin\|Permission" "${APP_DIR}/src" 2>/dev/null | \
       grep -v "log\|audit\|record" > "${APP_AUDIT_DIR}/missing-audit.log" 2>&1; then
        MISSING_AUDIT=$(wc -l < "${APP_AUDIT_DIR}/missing-audit.log" | tr -d ' ')
        if [[ ${MISSING_AUDIT} -gt 0 ]]; then
            log_medium "Found ${MISSING_AUDIT} sensitive operations without audit logging (OWASP A09:2021, NIST AU-2)"
        fi
    fi
    
    # =========================================================================
    # OWASP A10:2021 - Server-Side Request Forgery (NIST SC-7)
    # =========================================================================
    log_info "A10:2021 - Checking for SSRF vulnerabilities..."
    
    # Unvalidated URL fetching
    if grep -r -E "(fetch\(.*req\.|axios\(.*req\.|request\(.*req\.)" "${APP_DIR}/src" 2>/dev/null > "${APP_AUDIT_DIR}/ssrf-risk.log" 2>&1; then
        log_high "Potential SSRF detected - validate/whitelist URLs (OWASP A10:2021, NIST SC-7)"
        log_info "See ${APP_AUDIT_DIR}/ssrf-risk.log"
    fi
    
    # =========================================================================
    # CIS Controls (Additional)
    # =========================================================================
    log_info "Running CIS benchmark checks..."
    
    # CIS 4.1 - Secure Configuration
    if [[ -f "${APP_DIR}/.env" ]]; then
        log_critical ".env file found in app directory (CIS 4.1) - should be gitignored"
    fi
    
    # CIS 6.2 - Logging
    if ! grep -r "winston\|pino\|bunyan\|logger" "${APP_DIR}/src" 2>/dev/null > /dev/null; then
        log_medium "No structured logging library detected (CIS 6.2, NIST AU-3)"
    fi
    
    # =========================================================================
    # NIST SP 800-53 Controls (Additional)
    # =========================================================================
    
    # NIST SC-8 - Transmission Confidentiality
    if grep -r "http://" "${APP_DIR}/src" 2>/dev/null | \
       grep -v "localhost\|127.0.0.1\|example.com" > "${APP_AUDIT_DIR}/insecure-http.log" 2>&1; then
        log_high "Insecure HTTP URLs detected - use HTTPS (NIST SC-8, CIS 9.2)"
    fi
    
    # NIST AC-2 - Account Management
    if grep -r "createUser\|registerUser" "${APP_DIR}/src" 2>/dev/null | \
       grep -v "validate\|sanitize\|verify" > "${APP_AUDIT_DIR}/user-creation.log" 2>&1; then
        USER_CREATION=$(wc -l < "${APP_AUDIT_DIR}/user-creation.log" | tr -d ' ')
        if [[ ${USER_CREATION} -gt 0 ]]; then
            log_medium "User creation without validation detected (NIST AC-2)"
        fi
    fi
    
    log_pass "Security scan complete"
}

################################################################################
# Phase 4: Testing
################################################################################

phase4_testing() {
    log_section "Phase 4: Testing"
    
    # Check for test files
    TEST_FILE_COUNT=$(find "${APP_DIR}" -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" 2>/dev/null | wc -l | tr -d ' ')
    
    if [[ ${TEST_FILE_COUNT} -gt 0 ]]; then
        log_pass "Test files found: ${TEST_FILE_COUNT}"
    else
        log_high "No test files found (testing is mandatory)"
    fi
    
    # Check tests directory
    if [[ -d "${APP_DIR}/tests" ]] || [[ -d "${APP_DIR}/src/__tests__" ]]; then
        log_pass "Tests directory exists"
    else
        if [[ ${TEST_FILE_COUNT} -eq 0 ]]; then
            log_high "No tests directory found"
        fi
    fi
}

################################################################################
# Phase 5: Dependencies
################################################################################

phase5_dependencies() {
    log_section "Phase 5: Dependencies"
    
    # In Nx monorepo, dependencies are in root package.json
    ROOT_PACKAGE_JSON="${PROJECT_ROOT}/package.json"
    
    if [[ -f "${ROOT_PACKAGE_JSON}" ]]; then
        log_pass "Root package.json found"
        
        # Check for security vulnerabilities (npm audit) - skip if SKIP_NPM_AUDIT=true
        if [[ "${SKIP_NPM_AUDIT:-false}" == "true" ]]; then
            log_info "Skipping npm audit (SKIP_NPM_AUDIT=true)"
        elif command -v npm &> /dev/null; then
            log_info "Running npm audit (set SKIP_NPM_AUDIT=true to skip)..."
            
            # Auto-fix mode: attempt to fix vulnerabilities
            if [[ "${AUTO_FIX}" == "true" ]]; then
                log_info "Running npm audit fix..."
                if npm audit fix --json > "${APP_AUDIT_DIR}/npm-audit-fix.json" 2>&1; then
                    FIXED_COUNT=$(jq -r '.actions | length' "${APP_AUDIT_DIR}/npm-audit-fix.json" 2>/dev/null || echo "0")
                    if [[ ${FIXED_COUNT} -gt 0 ]]; then
                        log_pass "npm audit fixed ${FIXED_COUNT} vulnerabilities"
                    else
                        log_pass "No vulnerabilities to fix"
                    fi
                else
                    log_medium "npm audit fix completed with some remaining issues"
                    log_info "See ${APP_AUDIT_DIR}/npm-audit-fix.json for details"
                fi
            fi
            
            # Run audit to check remaining vulnerabilities
            if npm audit --audit-level=high --json > "${APP_AUDIT_DIR}/npm-audit.json" 2>&1; then
                log_pass "No high/critical vulnerabilities found"
            else
                VULN_COUNT=$(jq -r '.metadata.vulnerabilities.high + .metadata.vulnerabilities.critical' "${APP_AUDIT_DIR}/npm-audit.json" 2>/dev/null || echo "unknown")
                if [[ "${AUTO_FIX}" == "true" ]]; then
                    log_high "Found ${VULN_COUNT} high/critical vulnerabilities requiring manual fix"
                else
                    log_high "Found ${VULN_COUNT} high/critical vulnerabilities (run with AUTO_FIX=true to attempt auto-fix)"
                fi
                log_info "See ${APP_AUDIT_DIR}/npm-audit.json for details"
            fi
        fi
        
        # OWASP Dependency-Check (comprehensive CVE scanning)
        if [[ "${SKIP_OWASP_CHECK:-false}" == "true" ]]; then
            log_info "Skipping OWASP Dependency-Check (SKIP_OWASP_CHECK=true)"
        elif command -v dependency-check &> /dev/null || command -v dependency-check.sh &> /dev/null; then
            log_info "Running OWASP Dependency-Check v12.1.8+ (CVE/CPE detection)..."
            
            OWASP_CMD="dependency-check"
            if ! command -v dependency-check &> /dev/null && command -v dependency-check.sh &> /dev/null; then
                OWASP_CMD="dependency-check.sh"
            fi
            
            # Run OWASP Dependency-Check with SARIF output
            if ${OWASP_CMD} \
                --scan "${APP_DIR}" \
                --project "${APP_NAME}" \
                --format JSON \
                --format SARIF \
                --out "${APP_AUDIT_DIR}/owasp-dependency-check" \
                --failOnCVSS 7 \
                --suppression "${PROJECT_ROOT}/.owasp-suppressions.xml" 2>&1 | tee "${APP_AUDIT_DIR}/owasp-dc.log"; then
                log_pass "OWASP Dependency-Check passed (no CVE ≥7.0 CVSS)"
            else
                CVE_COUNT=$(jq -r '.dependencies[].vulnerabilities | length' "${APP_AUDIT_DIR}/owasp-dependency-check/dependency-check-report.json" 2>/dev/null | awk '{s+=$1} END {print s}' || echo "0")
                log_critical "OWASP Dependency-Check found ${CVE_COUNT} vulnerabilities with CVSS ≥7.0"
                log_info "See ${APP_AUDIT_DIR}/owasp-dependency-check/ for details"
            fi
        else
            log_info "OWASP Dependency-Check not installed (brew install dependency-check or download from owasp.org)"
        fi
    else
        log_critical "Root package.json not found"
    fi
}

################################################################################
# Phase 6: Configuration
################################################################################

phase6_configuration() {
    log_section "Phase 6: Configuration"
    
    # Check for environment variable files
    if [[ -f "${APP_DIR}/.env.example" ]]; then
        log_pass ".env.example found"
    else
        log_low ".env.example missing (recommended for documentation)"
    fi
    
    # Ensure no .env files are committed
    if [[ -f "${APP_DIR}/.env" ]]; then
        log_critical ".env file found (should be git-ignored, never committed)"
    else
        log_pass "No .env file in repository (good)"
    fi
}

################################################################################
# Report Generation
################################################################################

generate_report() {
    log_section "Report Generation"
    
    # Generate JSON report
    cat > "${APP_AUDIT_DIR}/audit-results.json" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "app": "${APP_NAME}",
  "summary": {
    "critical": ${CRITICAL_COUNT},
    "high": ${HIGH_COUNT},
    "medium": ${MEDIUM_COUNT},
    "low": ${LOW_COUNT},
    "pass": ${PASS_COUNT}
  },
  "app_dir": "${APP_DIR}",
  "audit_dir": "${APP_AUDIT_DIR}"
}
EOF
    
    log_pass "JSON report generated: ${APP_AUDIT_DIR}/audit-results.json"
    
    # Print final results
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                      FINAL RESULTS                            ║"
    echo "╠═══════════════════════════════════════════════════════════════╣"
    printf "║  Critical: %-3d  High: %-3d  Medium: %-3d  Low: %-3d     ║\n" \
        ${CRITICAL_COUNT} ${HIGH_COUNT} ${MEDIUM_COUNT} ${LOW_COUNT}
    printf "║  Pass: %-3d                                               ║\n" ${PASS_COUNT}
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Determine exit code
    if [[ ${CRITICAL_COUNT} -gt 0 ]] || [[ ${HIGH_COUNT} -gt 0 ]]; then
        echo "❌ App ${APP_NAME} has critical or high severity issues"
        return 2
    elif [[ ${MEDIUM_COUNT} -gt 5 ]]; then
        echo "⚠️  App ${APP_NAME} has multiple medium severity issues"
        return 1
    else
        echo "✓ App ${APP_NAME} meets quality standards"
        return 0
    fi
}

################################################################################
# SARIF Output Generation (for GitHub Code Scanning)
################################################################################

generate_sarif_output() {
    if [[ "${GENERATE_SARIF:-false}" != "true" ]]; then
        return 0
    fi
    
    log_info "Generating SARIF 2.1.0 format output for GitHub Code Scanning..."
    
    # Create SARIF file
    cat > "${APP_AUDIT_DIR}/audit-results.sarif" <<'SARIF_START'
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "Political Sphere App Audit",
          "version": "1.0.0",
          "informationUri": "https://github.com/PoliticalSphere/political-sphere",
          "rules": [
            {
              "id": "PS001",
              "name": "HardcodedSecrets",
              "shortDescription": { "text": "Hardcoded secrets detected" },
              "fullDescription": { "text": "Source code contains hardcoded passwords, API keys, or secrets" },
              "defaultConfiguration": { "level": "error" }
            },
            {
              "id": "PS002",
              "name": "EvalUsage",
              "shortDescription": { "text": "eval() usage detected" },
              "fullDescription": { "text": "Use of eval() function poses security risk (OWASP A03:2021)" },
              "defaultConfiguration": { "level": "error" }
            },
            {
              "id": "PS003",
              "name": "MissingTests",
              "shortDescription": { "text": "No test files found" },
              "fullDescription": { "text": "Application lacks automated tests" },
              "defaultConfiguration": { "level": "warning" }
            },
            {
              "id": "PS004",
              "name": "DependencyVulnerability",
              "shortDescription": { "text": "Vulnerable dependencies detected" },
              "fullDescription": { "text": "npm audit found high/critical vulnerabilities" },
              "defaultConfiguration": { "level": "error" }
            }
          ]
        }
      },
      "results": []
    }
  ]
}
SARIF_START
    
    log_pass "SARIF output generated: ${APP_AUDIT_DIR}/audit-results.sarif"
}

################################################################################
# Main Execution
################################################################################

main() {
    print_header
    
    phase1_app_structure || true
    phase2_code_quality || true
    phase3_security || true
    phase4_testing || true
    phase5_dependencies || true
    phase6_configuration || true
    
    generate_sarif_output || true
    generate_report
}

# Only run main if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main
fi
