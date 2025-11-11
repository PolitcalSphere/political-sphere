#!/usr/bin/env bash
#
# API App Audit
# Version: 1.0.0
# Purpose: Comprehensive audit for API application with OpenAPI, endpoint security, database checks

set -euo pipefail

export APP_NAME="api"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
APP_DIR="${PROJECT_ROOT}/apps/${APP_NAME}"
AUDIT_DIR="${PROJECT_ROOT}/app-audit/${APP_NAME}"

# Source base audit (provides log_* functions and phases 1-6)
source "${SCRIPT_DIR}/app-audit-base.sh"

phase7_api_specific() {
    log_section "Phase 7: API-Specific Checks"
    
    # 7.1 OpenAPI
    OPENAPI_SPEC="${APP_DIR}/openapi/api.yaml"
    if [[ ! -f "${OPENAPI_SPEC}" ]]; then
        log_medium "OpenAPI specification not found"
    else
        log_pass "OpenAPI specification found"
        log_info "Validating OpenAPI..."
        if npx --yes -q swagger-cli validate "${OPENAPI_SPEC}" > "${AUDIT_DIR}/openapi.log" 2>&1; then
            log_pass "OpenAPI spec valid"
        else
            log_high "OpenAPI validation failed - see ${AUDIT_DIR}/openapi.log"
        fi
        grep -q "securitySchemes:" "${OPENAPI_SPEC}" && log_pass "Security schemes defined" || log_high "No security schemes (auth required)"
        grep -q "^security:" "${OPENAPI_SPEC}" && log_pass "Global security requirement" || log_medium "No global security"
    fi
    
    # 7.2 Database
    MIGRATIONS_DIR="${APP_DIR}/src/db/migrations"
    if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
        log_medium "No migrations directory"
    else
        MIGRATION_COUNT=$(find "${MIGRATIONS_DIR}" -type f \( -name "*.sql" -o -name "*.js" -o -name "*.ts" \) | wc -l | tr -d ' ')
        [[ "${MIGRATION_COUNT}" -eq 0 ]] && log_low "No migrations found" || log_pass "Migrations: ${MIGRATION_COUNT}"
        
        DOWN_COUNT=$(find "${MIGRATIONS_DIR}" -type f -name "*down*" | wc -l | tr -d ' ')
        [[ "${DOWN_COUNT}" -eq 0 ]] && log_medium "No rollback migrations" || log_pass "Rollback migrations: ${DOWN_COUNT}"
    fi
    
    # 7.3 Authentication
    log_info "Checking authentication..."
    AUTH_FILES=$(find "${APP_DIR}/src" -type f \( -name "*auth*" -o -name "*jwt*" \) 2>/dev/null | wc -l | tr -d ' ')
    [[ "${AUTH_FILES}" -eq 0 ]] && log_medium "No auth files" || log_pass "Auth files: ${AUTH_FILES}"
    
    if grep -r "JWT_SECRET" "${APP_DIR}/src" 2>/dev/null | grep -q "throw\|error"; then
        log_pass "JWT secret validation"
    else
        log_high "No JWT secret validation"
    fi
    
    if grep -rq "bcrypt\|argon2\|scrypt" "${APP_DIR}/src" 2>/dev/null; then
        log_pass "Password hashing found"
    else
        log_critical "No password hashing library"
    fi
    
    # 7.4 API Security
    log_info "Checking API security..."
    grep -rq "rate.*limit\|express-rate-limit" "${APP_DIR}/src" 2>/dev/null && log_pass "Rate limiting" || log_high "No rate limiting"
    grep -rq "zod\|joi\|express-validator" "${APP_DIR}/src" 2>/dev/null && log_pass "Input validation" || log_high "No input validation"
    
    if grep -rq "cors" "${APP_DIR}/src" 2>/dev/null; then
        log_pass "CORS configuration"
        grep -r "cors" "${APP_DIR}/src" 2>/dev/null | grep -q "origin.*\*" && log_high "Wildcard CORS origin"
    else
        log_medium "No CORS config"
    fi
    
    grep -rq "helmet" "${APP_DIR}/src" 2>/dev/null && log_pass "Helmet headers" || log_medium "No Helmet"
    
    # 7.5 Database Security
    log_info "Checking database security..."
    grep -rq "pool.*min\|pool.*max\|createPool" "${APP_DIR}/src" 2>/dev/null && log_pass "Connection pooling" || log_medium "No connection pooling"
    
    SQL_FILES=$(find "${APP_DIR}/src" -type f \( -name "*.js" -o -name "*.ts" \) -exec grep -l "SELECT\|INSERT\|UPDATE\|DELETE" {} \; 2>/dev/null || true)
    if [[ -n "${SQL_FILES}" ]]; then
        if echo "${SQL_FILES}" | xargs grep -E '\+.*SELECT|\+.*INSERT|`.*SELECT|`.*INSERT' > "${AUDIT_DIR}/sql.log" 2>&1; then
            log_critical "SQL concatenation - see ${AUDIT_DIR}/sql.log"
        else
            log_pass "No SQL concatenation"
        fi
    fi
    
    # 7.6 Error Handling
    grep -rq "app\.use.*err.*req.*res.*next\|errorHandler" "${APP_DIR}/src" 2>/dev/null && log_pass "Error middleware" || log_medium "No error middleware"
    grep -r "res\..*send\|res\..*json" "${APP_DIR}/src" 2>/dev/null | grep -q "err\.stack\|error\.stack" && log_high "Stack traces in responses" || log_pass "No stack traces in responses"
    
    # 7.7 Environment
    ENV_EXAMPLE="${APP_DIR}/.env.example"
    if [[ -f "${ENV_EXAMPLE}" ]]; then
        log_pass ".env.example found"
        REQUIRED_VARS=("JWT_SECRET" "JWT_REFRESH_SECRET" "DATABASE_URL" "PORT")
        MISSING=()
        for var in "${REQUIRED_VARS[@]}"; do
            grep -q "^${var}=" "${ENV_EXAMPLE}" || MISSING+=("${var}")
        done
        [[ ${#MISSING[@]} -gt 0 ]] && log_medium "Missing env vars: ${MISSING[*]}" || log_pass "All env vars documented"
    else
        log_medium ".env.example missing"
    fi
    
    # 7.8 Documentation
    README="${APP_DIR}/README.md"
    if [[ -f "${README}" ]]; then
        log_pass "README.md found"
        grep -iq "endpoint\|route\|api" "${README}" && log_pass "API docs in README" || log_low "No API docs"
    else
        log_medium "README.md missing"
    fi
    
    # 7.9 Health Check
    grep -rq "/health\|/healthz\|/status" "${APP_DIR}/src" 2>/dev/null && log_pass "Health check endpoint" || log_medium "No health check"
    
    # 7.10 Logging
    if grep -rq "winston\|pino\|bunyan\|logger\.info" "${APP_DIR}/src" 2>/dev/null; then
        log_pass "Structured logging"
        grep -r "logger\|console\.log" "${APP_DIR}/src" 2>/dev/null | grep -qi "password\|token\|secret\|apikey" && log_high "Sensitive data in logs"
    else
        log_medium "No structured logging"
    fi
}

main_api() {
    print_header
    phase1_app_structure || true
    phase2_code_quality || true
    phase3_security || true
    phase4_testing || true
    phase5_dependencies || true
    phase6_configuration || true
    phase7_api_specific || true
    generate_report
}

main_api
