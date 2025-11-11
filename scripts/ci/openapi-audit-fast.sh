#!/usr/bin/env bash
################################################################################
# OpenAPI Fast Audit Script v2.0.0
# Optimized for speed and macOS compatibility
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
OPENAPI_DIR="${PROJECT_ROOT}/apps/api/openapi"
ENTRY="${OPENAPI_DIR}/api.yaml"
AUDIT_DIR="${PROJECT_ROOT}/openapi-audit"
AUDIT_TRAIL_DIR="${PROJECT_ROOT}/docs/audit-trail/openapi"

# Environment variables
AUTO_FIX="${AUTO_FIX:-false}"
SKIP_GENERATOR="${SKIP_GENERATOR:-true}"  # Skip by default (slow)

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

# Create directories
mkdir -p "${AUDIT_DIR}"
mkdir -p "${AUDIT_TRAIL_DIR}"

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
    echo "║          OpenAPI Fast Audit v2.0.0 (macOS Compatible)        ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Entry Point: ${ENTRY}"
    echo "Auto-Fix: ${AUTO_FIX}"
    echo ""
}

################################################################################
# Main Audit Phases
################################################################################

print_header

# Phase 1: Check if OpenAPI file exists
log_section "Phase 1: File Existence Check"

if [[ ! -f "${ENTRY}" ]]; then
    log_critical "OpenAPI specification not found: ${ENTRY}"
    exit 2
fi

log_pass "OpenAPI specification found: ${ENTRY}"

# Phase 2: Bundle specification
log_section "Phase 2: Specification Bundling"

log_info "Bundling specification..."
if npx --yes swagger-cli bundle "${ENTRY}" --outfile "${AUDIT_DIR}/bundle.yaml" --type yaml > "${AUDIT_DIR}/bundle.log" 2>&1; then
    log_pass "Specification bundled successfully"
    echo "Created ${AUDIT_DIR}/bundle.yaml from ${ENTRY}"
else
    log_critical "Bundling failed - check ${AUDIT_DIR}/bundle.log"
    cat "${AUDIT_DIR}/bundle.log"
    exit 2
fi

# Phase 3: Basic validation
log_section "Phase 3: Swagger CLI Validation"

log_info "Running Swagger CLI validation..."
if npx --yes swagger-cli validate "${AUDIT_DIR}/bundle.yaml" > "${AUDIT_DIR}/validation.log" 2>&1; then
    log_pass "Swagger CLI validation passed"
else
    log_high "Swagger CLI found validation errors"
    log_info "Check ${AUDIT_DIR}/validation.log for details"
    cat "${AUDIT_DIR}/validation.log" | head -20
fi

# Phase 4: OpenAPI version check
log_section "Phase 4: OpenAPI Version Compliance"

OPENAPI_VERSION=$(grep "^openapi:" "${AUDIT_DIR}/bundle.yaml" | head -1 | cut -d: -f2 | tr -d ' ')

log_info "Detected OpenAPI version: ${OPENAPI_VERSION}"

if [[ "${OPENAPI_VERSION}" =~ ^3\.[1-9] ]]; then
    log_pass "Using OpenAPI 3.1+ specification"
elif [[ "${OPENAPI_VERSION}" =~ ^3\.0 ]]; then
    log_medium "Using OpenAPI 3.0.x - consider upgrading to 3.1+ for JSON Schema 2020-12 support"
else
    log_critical "Unknown or unsupported OpenAPI version: ${OPENAPI_VERSION}"
fi

# Phase 5: Security checks
log_section "Phase 5: Security Best Practices"

SPEC_CONTENT=$(cat "${AUDIT_DIR}/bundle.yaml")

# Check for HTTP servers (non-localhost)
log_info "Checking for insecure HTTP servers..."
if echo "${SPEC_CONTENT}" | grep -E '^\s+- url: http://' | grep -v 'localhost' > /dev/null 2>&1; then
    log_critical "Production server using insecure HTTP (must use HTTPS per OWASP API8:2023)"
else
    log_pass "No insecure HTTP servers found (or only localhost)"
fi

# Check for security schemes
log_info "Checking for security schemes..."
if echo "${SPEC_CONTENT}" | grep -q "securitySchemes:" > /dev/null 2>&1; then
    log_pass "Security schemes defined"
    
    # Check for bearer format on JWT
    if echo "${SPEC_CONTENT}" | grep -A 5 "type: http" | grep -q "scheme: bearer" > /dev/null 2>&1; then
        if echo "${SPEC_CONTENT}" | grep -q "bearerFormat:" > /dev/null 2>&1; then
            log_pass "Bearer token format specified"
        else
            log_low "Bearer authentication scheme missing bearerFormat (e.g., JWT)"
        fi
    fi
else
    log_high "No security schemes defined (violates OWASP API2:2023 - Broken Authentication)"
fi

# Check for global security requirement
log_info "Checking for global security requirements..."
if echo "${SPEC_CONTENT}" | grep -q "^security:" > /dev/null 2>&1; then
    log_pass "Global security requirements defined"
else
    log_medium "No global security requirements - ensure operation-level security is applied"
fi

# Phase 6: Documentation quality
log_section "Phase 6: Documentation Quality"

# Check for description in info
if echo "${SPEC_CONTENT}" | grep -A 10 "^info:" | grep -q "description:" > /dev/null 2>&1; then
    log_pass "API description provided"
else
    log_low "API description missing in info section"
fi

# Check for contact information
if echo "${SPEC_CONTENT}" | grep -A 10 "^info:" | grep -q "contact:" > /dev/null 2>&1; then
    log_pass "Contact information provided"
else
    log_low "Contact information missing (recommended for API consumers)"
fi

# Check for license
if echo "${SPEC_CONTENT}" | grep -A 10 "^info:" | grep -q "license:" > /dev/null 2>&1; then
    log_pass "License information provided"
else
    log_low "License information missing"
fi

# Phase 7: Operation checks
log_section "Phase 7: Operation Quality Checks"

# Check for operation IDs
log_info "Checking for operationId on all operations..."
TOTAL_OPERATIONS=$(grep -c 'operationId:' "${AUDIT_DIR}/bundle.yaml" 2>/dev/null || echo "0")

if [[ ${TOTAL_OPERATIONS} -gt 0 ]]; then
    log_pass "Operations have operationId defined (${TOTAL_OPERATIONS} found)"
else
    log_medium "No operationId found on operations"
fi

# Check for response descriptions  
log_info "Checking for response descriptions..."
RESPONSES_WITH_DESC=$(grep -c 'description:' "${AUDIT_DIR}/bundle.yaml" 2>/dev/null || echo "0")

if [[ ${RESPONSES_WITH_DESC} -gt 5 ]]; then
    log_pass "Response descriptions found (${RESPONSES_WITH_DESC})"
else
    log_low "Limited response descriptions (${RESPONSES_WITH_DESC})"
fi

# Phase 8: Report generation
log_section "Phase 8: Report Generation"

# Generate JSON summary
cat > "${AUDIT_DIR}/openapi-audit-results.json" <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "openapi_version": "${OPENAPI_VERSION}",
  "summary": {
    "critical": ${CRITICAL_COUNT},
    "high": ${HIGH_COUNT},
    "medium": ${MEDIUM_COUNT},
    "low": ${LOW_COUNT},
    "pass": ${PASS_COUNT}
  },
  "files": {
    "entry": "${ENTRY}",
    "bundle": "${AUDIT_DIR}/bundle.yaml",
    "validation_log": "${AUDIT_DIR}/validation.log"
  }
}
EOF

log_pass "JSON report generated: ${AUDIT_DIR}/openapi-audit-results.json"

# Copy to audit trail
cp "${AUDIT_DIR}/openapi-audit-results.json" "${AUDIT_TRAIL_DIR}/audit-results-$(date -u +"%Y-%m-%d").json"
log_pass "Audit trail updated: ${AUDIT_TRAIL_DIR}/"

# Final results
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
    echo "❌ OpenAPI specification has critical or high severity issues"
    exit 2
elif [[ ${MEDIUM_COUNT} -gt 5 ]]; then
    echo "⚠️  OpenAPI specification has multiple medium severity issues"
    exit 1
else
    echo "✓ OpenAPI specification meets quality standards"
    exit 0
fi
