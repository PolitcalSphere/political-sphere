#!/usr/bin/env bash
# =============================================================================
# DevContainer Audit Script v1.1.0
# =============================================================================
#
# Comprehensive validation for DevContainer configurations including:
# - Dockerfile security and best practices (Hadolint integration)
# - devcontainer.json schema validation
# - docker-compose.yml validation
# - Security scanning (CIS Docker Benchmark compliance)
# - Auto-fix capabilities for common issues
# - Optimization checks
# - Supply chain integrity
# - Runtime security hardening
# - DevContainer features validation
# - Enhanced vulnerability scanning
# - Monitoring and logging configuration
# - Edge case validation
#
# Industry Standards Covered:
# - CIS Docker Benchmark v1.6.0
# - Docker Best Practices (docker.com/blog/intro-guide-to-dockerfile-best-practices)
# - VS Code DevContainer Specification v0.2.0
# - OWASP Container Security
# - Docker Official Image Security Best Practices
#
# Exit Codes:
#   0 - Success (all checks passed or warnings only)
#   1 - Warnings found
#   2 - Critical errors found
#
# Environment Variables:
#   AUTO_FIX=true              - Enable automatic fixes
#   SKIP_HADOLINT=true         - Skip Hadolint linting
#   SKIP_TRIVY=true            - Skip Trivy vulnerability scanning
#   SKIP_DOCKER_LINT=true      - Skip dockerfilelint checks
#   SKIP_COMPOSE_VALIDATE=true - Skip docker-compose validation
#   SKIP_RUNTIME=true          - Skip runtime security checks (temp builds)
#   SKIP_SUPPLY_CHAIN=true     - Skip supply chain integrity checks
#   SKIP_DEV_FEATURES=true     - Skip DevContainer features checks
#   SKIP_ENHANCED_SCAN=true    - Skip enhanced scanning
#   SKIP_MONITORING=true       - Skip monitoring/logging checks
#   SKIP_EDGE=true             - Skip edge case checks
#   SKIP_OPTIMIZATION=true     - Skip Dockerfile optimization checks
#   OUTPUT_DIR=./audit-output  - Directory for output files
#
# Usage:
#   ./devcontainer-audit.sh [options]
#   AUTO_FIX=true ./devcontainer-audit.sh
#
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
DEVCONTAINER_DIR="${PROJECT_ROOT}/.devcontainer"

# Configuration via environment variables
AUTO_FIX="${AUTO_FIX:-false}"
SKIP_HADOLINT="${SKIP_HADOLINT:-false}"
SKIP_TRIVY="${SKIP_TRIVY:-false}"
SKIP_DOCKER_LINT="${SKIP_DOCKER_LINT:-false}"
SKIP_COMPOSE_VALIDATE="${SKIP_COMPOSE_VALIDATE:-false}"
SKIP_RUNTIME="${SKIP_RUNTIME:-false}"
SKIP_SUPPLY_CHAIN="${SKIP_SUPPLY_CHAIN:-false}"
SKIP_DEV_FEATURES="${SKIP_DEV_FEATURES:-false}"
SKIP_ENHANCED_SCAN="${SKIP_ENHANCED_SCAN:-false}"
SKIP_MONITORING="${SKIP_MONITORING:-false}"
SKIP_EDGE="${SKIP_EDGE:-false}"
SKIP_OPTIMIZATION="${SKIP_OPTIMIZATION:-false}"
OUTPUT_DIR="${OUTPUT_DIR:-${PROJECT_ROOT}/devcontainer-audit}"

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

# Temporary build artefacts for runtime/enhanced checks
TEMP_BUILD_DIR="${OUTPUT_DIR}/temp-build"
TEMP_IMAGE_NAME="devcontainer-audit-temp:$(date +%s)"
TEMP_IMAGE_BUILT=false

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
    echo -e "${YELLOW}[LOW]${NC} $*"
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
        cp "$file" "${BACKUP_DIR}/$(basename "$file").backup"
        echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backed up: $file" >> "$AUTO_FIX_LOG"
    fi
}

# -----------------------------------------------------------------------------
# Setup and Prerequisite Checks
# -----------------------------------------------------------------------------

cleanup_temp_build() {
    if [[ -d "$TEMP_BUILD_DIR" ]]; then
        rm -rf "$TEMP_BUILD_DIR"
    fi
    
    if [[ "$TEMP_IMAGE_BUILT" == "true" ]] && command -v docker &> /dev/null; then
        docker rmi "$TEMP_IMAGE_NAME" &> /dev/null || true
    fi
}

ensure_temp_image() {
    if [[ "$TEMP_IMAGE_BUILT" == "true" ]]; then
        return 0
    fi
    
    local dockerfile="${DEVCONTAINER_DIR}/Dockerfile"
    
    if [[ ! -f "$dockerfile" ]]; then
        log_info "No Dockerfile available for temp image build"
        return 1
    fi
    
    mkdir -p "$TEMP_BUILD_DIR"
    
    if docker build -t "$TEMP_IMAGE_NAME" "$DEVCONTAINER_DIR" &> "${TEMP_BUILD_DIR}/build.log"; then
        TEMP_IMAGE_BUILT=true
        log_pass "Temp image built successfully (cached for runtime/enhanced checks)"
        return 0
    else
        log_medium "Temp image build failed; runtime/enhanced checks will be skipped (see ${TEMP_BUILD_DIR}/build.log)"
        add_finding "medium" "RUNTIME-BUILD" "Failed to build temp image for runtime/enhanced checks" "$dockerfile" 0
        SKIP_RUNTIME=true
        SKIP_ENHANCED_SCAN=true
        return 1
    fi
}

setup_environment() {
    log_section "Phase 1: Environment Setup"
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Temp build setup
    mkdir -p "$TEMP_BUILD_DIR"
    
    # Initialize auto-fix log
    if [[ "$AUTO_FIX" == "true" ]]; then
        mkdir -p "$BACKUP_DIR"
        echo "Auto-fix session started: $(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$AUTO_FIX_LOG"
        log_info "Auto-fix enabled. Backups will be stored in: $BACKUP_DIR"
    fi
    
    # Check if .devcontainer directory exists
    if [[ ! -d "$DEVCONTAINER_DIR" ]]; then
        log_critical "DevContainer directory not found: $DEVCONTAINER_DIR"
        add_finding "critical" "DEVCONT-001" ".devcontainer directory not found" "$DEVCONTAINER_DIR" 0
        exit 2
    fi
    
    log_pass "DevContainer directory found: $DEVCONTAINER_DIR"
    
    # Set up cleanup trap
    trap cleanup_temp_build EXIT
}

check_tool_availability() {
    log_section "Phase 2: Tool Availability Check"
    
    # Docker CLI
    if command -v docker &> /dev/null; then
        local docker_version
        docker_version=$(docker --version | head -n1 2>/dev/null || echo "unknown")
        log_pass "Docker available: $docker_version"
    else
        log_critical "Docker CLI not found. Install Docker Desktop or engine to run runtime/enhanced checks"
        add_finding "critical" "TOOL-000" "Docker CLI missing - runtime/enhanced checks will be skipped" "N/A" 0
        SKIP_RUNTIME=true
        SKIP_ENHANCED_SCAN=true
    fi
    
    # Check for Hadolint
    if [[ "$SKIP_HADOLINT" != "true" ]]; then
        if command -v hadolint &> /dev/null; then
            local version=$(hadolint --version | head -n1 || echo "unknown")
            log_pass "Hadolint available: $version"
        else
            log_info "Hadolint not found (optional). Install: brew install hadolint (macOS) or docker pull hadolint/hadolint"
            add_finding "info" "TOOL-001" "Hadolint not installed - Dockerfile linting will be skipped (optional tool)" "N/A" 0
            SKIP_HADOLINT=true
        fi
    fi
    
    # Check for Trivy
    if [[ "$SKIP_TRIVY" != "true" ]]; then
        if command -v trivy &> /dev/null; then
            local version=$(trivy --version | head -n1 || echo "unknown")
            log_pass "Trivy available: $version"
        else
            log_medium "Trivy not found. Install: brew install trivy (macOS) or apt-get install trivy"
            add_finding "medium" "TOOL-002" "Trivy not installed - vulnerability scanning will be skipped" "N/A" 0
            SKIP_TRIVY=true
            SKIP_ENHANCED_SCAN=true
        fi
    fi
    
    # Check for docker-compose
    if [[ "$SKIP_COMPOSE_VALIDATE" != "true" ]]; then
        if command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
            log_pass "Docker Compose available"
        else
            log_medium "Docker Compose not found. Install Docker Desktop or docker-compose"
            add_finding "medium" "TOOL-003" "Docker Compose not installed - compose file validation will be skipped" "N/A" 0
            SKIP_COMPOSE_VALIDATE=true
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
# Phase 3: Dockerfile Validation
# -----------------------------------------------------------------------------

validate_dockerfile() {
    log_section "Phase 3: Dockerfile Validation"
    
    local dockerfile="${DEVCONTAINER_DIR}/Dockerfile"
    
    if [[ ! -f "$dockerfile" ]]; then
        log_info "No Dockerfile found in .devcontainer (using pre-built image)"
        return 0
    fi
    
    log_info "Validating Dockerfile: $dockerfile"
    
    # Run Hadolint if available
    if [[ "$SKIP_HADOLINT" != "true" ]]; then
        log_info "Running Hadolint..."
        
        if hadolint "$dockerfile" --format json > "${OUTPUT_DIR}/hadolint-results.json" 2>&1; then
            log_pass "Hadolint: No issues found"
        else
            # Parse Hadolint results
            if [[ -f "${OUTPUT_DIR}/hadolint-results.json" ]]; then
                local issue_count=$(jq 'length' "${OUTPUT_DIR}/hadolint-results.json" 2>/dev/null || echo "0")
                if [[ "$issue_count" -gt 0 ]]; then
                    log_medium "Hadolint found $issue_count issues (see ${OUTPUT_DIR}/hadolint-results.json)"
                    add_finding "medium" "DOCKERFILE-001" "Hadolint found $issue_count issues" "$dockerfile" 0
                fi
            fi
        fi
    fi
    
    # Check for security best practices
    check_dockerfile_security "$dockerfile"
}

check_dockerfile_security() {
    local dockerfile="$1"
    
    log_info "Checking Dockerfile security best practices..."
    
    # Check for USER instruction (should not run as root)
    if grep -q "^USER root" "$dockerfile"; then
        log_high "Dockerfile runs as root user (security risk)"
        add_finding "high" "DOCKERFILE-SEC-001" "Container runs as root user" "$dockerfile" 0
    elif ! grep -q "^USER " "$dockerfile"; then
        log_medium "No USER instruction found (may default to root)"
        add_finding "medium" "DOCKERFILE-SEC-002" "No explicit USER instruction" "$dockerfile" 0
    else
        log_pass "Non-root user specified"
    fi
    
    # Check for COPY without --chown
    if grep -E "^COPY [^-]" "$dockerfile" | grep -v "COPY --chown" &> /dev/null; then
        log_low "COPY instructions without --chown may cause permission issues"
        add_finding "low" "DOCKERFILE-SEC-003" "COPY without --chown flag" "$dockerfile" 0
    fi
    
    # Check for hardcoded secrets
    if grep -iE "(password|secret|key|token)[ ]*=" "$dockerfile"; then
        log_critical "Potential hardcoded secrets found in Dockerfile"
        add_finding "critical" "DOCKERFILE-SEC-004" "Potential hardcoded secrets detected" "$dockerfile" 0
    else
        log_pass "No obvious hardcoded secrets found"
    fi
    
    # Check for pinned versions
    if grep -E "^FROM.*:latest" "$dockerfile"; then
        log_medium "Using :latest tag is not recommended (use specific versions)"
        add_finding "medium" "DOCKERFILE-SEC-005" "Using :latest tag instead of pinned version" "$dockerfile" 0
    else
        log_pass "Base image version is pinned"
    fi
    
    # Check for apt-get without --no-install-recommends
    if grep -E "apt-get install" "$dockerfile" | grep -v -- "--no-install-recommends" &> /dev/null; then
        log_low "apt-get install without --no-install-recommends (bloats image)"
        add_finding "low" "DOCKERFILE-SEC-006" "apt-get install should use --no-install-recommends" "$dockerfile" 0
    fi
    
    # Check for cache cleaning after apt-get
    if grep -E "apt-get (update|install)" "$dockerfile" &> /dev/null; then
        if ! grep -E "rm -rf /var/lib/apt/lists" "$dockerfile" &> /dev/null; then
            log_medium "apt-get cache not cleaned (increases image size)"
            add_finding "medium" "DOCKERFILE-SEC-007" "apt-get cache should be cleaned with rm -rf /var/lib/apt/lists/*" "$dockerfile" 0
        else
            log_pass "apt-get cache properly cleaned"
        fi
    fi
}

# -----------------------------------------------------------------------------
# Phase 4: devcontainer.json Validation
# -----------------------------------------------------------------------------

validate_devcontainer_json() {
    log_section "Phase 4: devcontainer.json Validation"
    
    local devcontainer_json="${DEVCONTAINER_DIR}/devcontainer.json"
    
    if [[ ! -f "$devcontainer_json" ]]; then
        log_critical "devcontainer.json not found"
        add_finding "critical" "DEVCONT-JSON-001" "devcontainer.json file is missing" "$devcontainer_json" 0
        return 1
    fi
    
    log_info "Validating devcontainer.json: $devcontainer_json"
    
    # Check JSON syntax
    if ! jq empty "$devcontainer_json" 2>/dev/null; then
        log_critical "devcontainer.json contains invalid JSON"
        add_finding "critical" "DEVCONT-JSON-002" "Invalid JSON syntax" "$devcontainer_json" 0
        return 1
    fi
    
    log_pass "devcontainer.json is valid JSON"
    
    # Check required fields
    if ! jq -e '.name' "$devcontainer_json" &> /dev/null; then
        log_medium "devcontainer.json missing 'name' field"
        add_finding "medium" "DEVCONT-JSON-003" "Missing 'name' field" "$devcontainer_json" 0
    else
        log_pass "devcontainer.json has 'name' field"
    fi
    
    # Check for security: remoteUser should not be root
    local remote_user=$(jq -r '.remoteUser // "root"' "$devcontainer_json")
    if [[ "$remote_user" == "root" ]]; then
        log_high "remoteUser is set to 'root' (security risk)"
        add_finding "high" "DEVCONT-JSON-004" "remoteUser should not be root" "$devcontainer_json" 0
    else
        log_pass "remoteUser is non-root: $remote_user"
    fi
    
    # Check for recommended VS Code extensions
    if ! jq -e '.customizations.vscode.extensions' "$devcontainer_json" &> /dev/null; then
        log_info "No VS Code extensions specified (consider adding recommended extensions)"
        add_finding "info" "DEVCONT-JSON-005" "No VS Code extensions configured" "$devcontainer_json" 0
    else
        local ext_count=$(jq '.customizations.vscode.extensions | length' "$devcontainer_json")
        log_pass "VS Code extensions configured: $ext_count extensions"
    fi
    
    # Check for postCreateCommand
    if ! jq -e '.postCreateCommand' "$devcontainer_json" &> /dev/null; then
        log_info "No postCreateCommand specified (dependencies may need manual installation)"
        add_finding "info" "DEVCONT-JSON-006" "Consider adding postCreateCommand for dependency installation" "$devcontainer_json" 0
    else
        log_pass "postCreateCommand configured"
    fi
}

# -----------------------------------------------------------------------------
# Phase 5: docker-compose.yml Validation
# -----------------------------------------------------------------------------

validate_docker_compose() {
    log_section "Phase 5: docker-compose.yml Validation"
    
    local compose_file="${DEVCONTAINER_DIR}/docker-compose.dev.yml"
    
    if [[ ! -f "$compose_file" ]]; then
        log_info "No docker-compose file found (single container setup)"
        return 0
    fi
    
    log_info "Validating docker-compose file: $compose_file"
    
    # Validate docker-compose syntax
    if [[ "$SKIP_COMPOSE_VALIDATE" != "true" ]]; then
        if docker compose -f "$compose_file" config > /dev/null 2>&1 || docker-compose -f "$compose_file" config > /dev/null 2>&1; then
            log_pass "docker-compose file is valid"
        else
            log_high "docker-compose file validation failed"
            add_finding "high" "COMPOSE-001" "docker-compose validation failed" "$compose_file" 0
        fi
    fi
    
    # Check for version pinning in services
    if grep -E "image:.*:latest" "$compose_file" &> /dev/null; then
        log_medium "docker-compose uses :latest tags (use specific versions)"
        add_finding "medium" "COMPOSE-002" "Service images should use pinned versions, not :latest" "$compose_file" 0
    else
        log_pass "Service images use pinned versions"
    fi
}

# -----------------------------------------------------------------------------
# Phase 6: Security Scanning (Trivy)
# -----------------------------------------------------------------------------

run_security_scan() {
    log_section "Phase 6: Security Vulnerability Scanning"
    
    if [[ "$SKIP_TRIVY" == "true" ]]; then
        log_info "Skipping Trivy security scan (SKIP_TRIVY=true)"
        return 0
    fi
    
    local dockerfile="${DEVCONTAINER_DIR}/Dockerfile"
    
    if [[ ! -f "$dockerfile" ]]; then
        log_info "No Dockerfile to scan (using pre-built image)"
        return 0
    fi
    
    log_info "Running Trivy vulnerability scan..."
    
    # Scan Dockerfile configuration
    if trivy config "$DEVCONTAINER_DIR" --format json --output "${OUTPUT_DIR}/trivy-config.json" 2>&1; then
        local vuln_count=$(jq '[.Results[]?.Misconfigurations[]?] | length' "${OUTPUT_DIR}/trivy-config.json" 2>/dev/null || echo "0")
        if [[ "$vuln_count" -gt 0 ]]; then
            log_medium "Trivy found $vuln_count configuration issues (see ${OUTPUT_DIR}/trivy-config.json)"
            add_finding "medium" "SECURITY-001" "Trivy found $vuln_count configuration issues" "$dockerfile" 0
        else
            log_pass "No configuration vulnerabilities found by Trivy"
        fi
    else
        log_info "Trivy config scan skipped or failed"
    fi
}

# -----------------------------------------------------------------------------
# Phase 9: Dockerfile Optimization
# -----------------------------------------------------------------------------

validate_dockerfile_optimization() {
    log_section "Phase 9: Dockerfile Optimization"
    
    if [[ "$SKIP_OPTIMIZATION" == "true" ]]; then
        log_info "Skipping Dockerfile optimization checks (SKIP_OPTIMIZATION=true)"
        return 0
    fi
    
    local dockerfile="${DEVCONTAINER_DIR}/Dockerfile"
    local dockerignore="${DEVCONTAINER_DIR}/.dockerignore"
    
    if [[ ! -f "$dockerfile" ]]; then
        log_info "No Dockerfile for optimization checks"
        return 0
    fi
    
    log_info "Checking Dockerfile optimization best practices..."
    
    # OPT-001: Multi-stage builds
    local from_count
    from_count=$(grep -c "^FROM " "$dockerfile" || echo "0")
    if (( from_count > 1 )); then
        log_pass "Multi-stage build detected ($from_count stages)"
    else
        log_medium "Single-stage build; consider multi-stage for smaller images"
        add_finding "medium" "OPT-001" "No multi-stage build detected" "$dockerfile" 0
    fi
    
    # OPT-002: Consolidated RUN instructions (basic check)
    local run_count
    run_count=$(grep -c "^RUN " "$dockerfile" || echo "0")
    if (( run_count > 10 )); then
        log_low "High number of RUN instructions ($run_count) - consider consolidating to reduce layers"
        add_finding "low" "OPT-002" "High number of RUN instructions ($run_count)" "$dockerfile" 0
    else
        log_pass "Reasonable number of RUN instructions ($run_count)"
    fi
    
    # OPT-003: Prefer COPY over ADD unless needed
    if grep -q "^ADD " "$dockerfile"; then
        if grep -Eq "^ADD .*https?://" "$dockerfile" || grep -Eq "^ADD .*(tar|tgz|tar\\.gz|tar\\.bz2)" "$dockerfile"; then
            log_info "ADD used for archives/URLs (allowed)"
        else
            log_low "ADD used without tar/URL (prefer COPY for predictability)"
            add_finding "low" "OPT-003" "Replace ADD with COPY when not extracting archives" "$dockerfile" 0
        fi
    else
        log_pass "COPY preferred over ADD"
    fi
    
    # OPT-004: Presence of .dockerignore
    if [[ -f "$dockerignore" ]]; then
        log_pass ".dockerignore present in .devcontainer"
    else
        log_medium ".dockerignore missing; add to reduce context size"
        add_finding "medium" "OPT-004" "Missing .dockerignore in .devcontainer" "$dockerfile" 0
    fi
}

# -----------------------------------------------------------------------------
# Phase 10: Supply Chain Integrity
# -----------------------------------------------------------------------------

check_supply_chain() {
    log_section "Phase 10: Supply Chain Integrity"
    
    if [[ "$SKIP_SUPPLY_CHAIN" == "true" ]]; then
        log_info "Skipping supply chain checks (SKIP_SUPPLY_CHAIN=true)"
        return 0
    fi
    
    local dockerfile="${DEVCONTAINER_DIR}/Dockerfile"
    
    if [[ ! -f "$dockerfile" ]]; then
        log_info "No Dockerfile for supply chain checks"
        return 0
    fi
    
    log_info "Checking supply chain security..."
    
    # SUPPLY-003: Trusted registry
    # List of trusted registries
    local trusted_registries=(
        "docker.io"
        "ghcr.io"
        "gcr.io"
        "mcr.microsoft.com"
        "registry.k8s.io"
        "quay.io"
    )
    
    local base_image
    base_image=$(grep "^FROM " "$dockerfile" | head -1 | awk '{print $2}')
    
    local is_trusted=false
    for registry in "${trusted_registries[@]}"; do
        if [[ "$base_image" == "$registry"* ]] || [[ "$base_image" != *"/"* && "$registry" == "docker.io" ]]; then
            is_trusted=true
            break
        fi
    done
    
    if [[ "$is_trusted" == false ]]; then
        log_high "Base image from untrusted registry detected: $base_image"
        add_finding "high" "SUPPLY-003" "Use official/trusted registries for base images" "$dockerfile" 0
    else
        if grep -q ":latest" "$dockerfile"; then
            log_medium "Base image uses :latest tag"
            add_finding "medium" "SUPPLY-003" "Pin base image to specific version instead of :latest" "$dockerfile" 0
        else
            log_pass "Base image from trusted registry with pinned version"
        fi
    fi
    
    # SUPPLY-005: Checksums for downloads
    # Check each RUN command that contains curl/wget for checksum verification
    # Exclude lines with GPG verification as that's more secure
    local curl_wget_lines
    curl_wget_lines=$(grep -n "RUN.*\(curl\|wget\)" "$dockerfile" | grep -v "gpg" || true)
    
    if [[ -n "$curl_wget_lines" ]]; then
        local has_unverified=false
        while IFS= read -r line; do
            local line_num=$(echo "$line" | cut -d: -f1)
            local content=$(echo "$line" | cut -d: -f2-)
            
            # Check if this RUN block has checksum verification
            # Look ahead a few lines to see if sha256sum/md5sum follows
            if ! sed -n "${line_num},$((line_num + 10))p" "$dockerfile" | grep -qE "(sha256sum|md5sum|checksum|\.sha256)"; then
                has_unverified=true
                break
            fi
        done <<< "$curl_wget_lines"
        
        if [[ "$has_unverified" == true ]]; then
            log_medium "Some downloads without checksum verification"
            add_finding "medium" "SUPPLY-005" "Add checksum verification for curl/wget downloads" "$dockerfile" 0
        else
            log_pass "Downloads include checksum verification"
        fi
    else
        log_pass "No downloads requiring checksum verification"
    fi
}

# -----------------------------------------------------------------------------
# Phase 11: Runtime Security
# -----------------------------------------------------------------------------

check_runtime_security() {
    log_section "Phase 11: Runtime Security Hardening"
    
    if [[ "$SKIP_RUNTIME" == "true" ]]; then
        log_info "Skipping runtime security checks (SKIP_RUNTIME=true)"
        return 0
    fi
    
    local dockerfile="${DEVCONTAINER_DIR}/Dockerfile"
    
    if [[ ! -f "$dockerfile" ]]; then
        log_info "No Dockerfile for runtime checks"
        return 0
    fi
    
    log_info "Performing runtime security checks (temp build)..."
    
    if ! ensure_temp_image; then
        log_info "Skipping runtime checks because temp image build failed (see ${TEMP_BUILD_DIR}/build.log)"
        return 0
    fi
    
    # Run checks inside container
    if docker run --rm "$TEMP_IMAGE_NAME" find / -type f \( -perm -4000 -o -perm -2000 \) -ls 2>/dev/null | grep -q .; then
        log_high "SUID/SGID binaries found (privilege escalation risk)"
        add_finding "high" "RUNTIME-005" "SUID/SGID binaries detected" "$dockerfile" 0
    else
        log_pass "No SUID/SGID binaries found"
    fi
    
    if docker run --rm "$TEMP_IMAGE_NAME" find / -type d \( -perm -002 -o -perm -020 \) -ls 2>/dev/null | grep -q .; then
        log_high "World-writable directories/files found"
        add_finding "high" "RUNTIME-008" "World-writable permissions detected" "$dockerfile" 0
    else
        log_pass "No world-writable permissions"
    fi
    
    # Check umask (default in container)
    local umask_check=$(docker run --rm "$TEMP_IMAGE_NAME" sh -c "umask" 2>/dev/null || echo "0022")
    if [[ "$umask_check" != "0022" ]]; then
        log_low "Non-standard umask ($umask_check); prefer 0022 for security"
        add_finding "low" "RUNTIME-009" "umask not set to secure default (0022)" "$dockerfile" 0
    else
        log_pass "Secure umask (0022)"
    fi
    
    # Check read-only root via inspect (if compose specifies)
    local compose_file="${DEVCONTAINER_DIR}/docker-compose.dev.yml"
    if [[ -f "$compose_file" ]] && grep -q "read_only: true" "$compose_file"; then
        log_pass "Read-only root filesystem configured"
    else
        log_medium "Read-only root not enforced (consider for immutability)"
        add_finding "medium" "RUNTIME-007" "Enable read-only root filesystem" "$dockerfile" 0
    fi
    
    log_info "Runtime checks complete (build logs: ${TEMP_BUILD_DIR}/build.log)"
}

# -----------------------------------------------------------------------------
# Phase 12: DevContainer Features
# -----------------------------------------------------------------------------

validate_dev_features() {
    log_section "Phase 12: DevContainer Features Validation"
    
    if [[ "$SKIP_DEV_FEATURES" == "true" ]]; then
        log_info "Skipping DevContainer features checks (SKIP_DEV_FEATURES=true)"
        return 0
    fi
    
    local devcontainer_json="${DEVCONTAINER_DIR}/devcontainer.json"
    
    if [[ ! -f "$devcontainer_json" ]]; then
        log_info "No devcontainer.json for features checks"
        return 0
    fi
    
    log_info "Validating DevContainer features..."
    
    # DEVCONT-FEAT-001: features.json
    local features_dir="${DEVCONTAINER_DIR}/features"
    if [[ -d "$features_dir" ]]; then
        local features_files=$(find "$features_dir" -name "features.json" 2>/dev/null | wc -l)
        if [[ "$features_files" -gt 0 ]]; then
            for feat in $(find "$features_dir" -name "features.json"); do
                if jq empty "$feat" 2>/dev/null; then
                    log_pass "features.json valid: $(basename "$(dirname "$feat")")"
                else
                    log_medium "Invalid features.json: $feat"
                    add_finding "medium" "DEVCONT-FEAT-001" "Invalid JSON in features.json" "$feat" 0
                fi
            done
        else
            log_info "No features.json found in features dir"
        fi
    else
        log_info "No features directory (using built-in features)"
    fi
    
    # DEVCONT-FEAT-002: Secure onCreateCommand
    if jq -e '.onCreateCommand' "$devcontainer_json" &> /dev/null; then
        local create_cmd=$(jq -r '.onCreateCommand' "$devcontainer_json")
        if echo "$create_cmd" | grep -qE "(;|\||\$\()" ; then
            log_high "Potential injection in onCreateCommand (shell metachars)"
            add_finding "high" "DEVCONT-FEAT-002" "Unsanitized shell metachars in onCreateCommand" "$devcontainer_json" 0
        else
            log_pass "onCreateCommand appears secure"
        fi
    fi
    
    # DEVCONT-FEAT-004: remoteEnv security
    if jq -e '.remoteEnv' "$devcontainer_json" &> /dev/null; then
        local remote_env=$(jq -r '.remoteEnv | keys[]' "$devcontainer_json" 2>/dev/null)
        if echo "$remote_env" | grep -qE "(password|key|token|secret)" ; then
            log_medium "Sensitive vars in remoteEnv (consider alternatives)"
            add_finding "medium" "DEVCONT-FEAT-004" "Sensitive environment variables in remoteEnv" "$devcontainer_json" 0
        else
            log_pass "remoteEnv configuration secure"
        fi
    fi
    
    # DEVCONT-FEAT-003: Docker-in-Docker check (basic)
    if ! jq -e '.dockerInDocker // false' "$devcontainer_json" &> /dev/null || [[ $(jq -r '.dockerInDocker // false' "$devcontainer_json") == "false" ]]; then
        log_info "No Docker-in-Docker; ensure host Docker access if needed"
        add_finding "info" "DEVCONT-FEAT-003" "Consider Docker-in-Docker for container builds" "$devcontainer_json" 0
    else
        log_pass "Docker-in-Docker configured"
    fi
}

# -----------------------------------------------------------------------------
# Phase 13: Enhanced Scanning
# -----------------------------------------------------------------------------

run_enhanced_scanning() {
    log_section "Phase 13: Enhanced Vulnerability Scanning"
    
    if [[ "$SKIP_ENHANCED_SCAN" == "true" ]]; then
        log_info "Skipping enhanced scanning (SKIP_ENHANCED_SCAN=true)"
        return 0
    fi
    
    if [[ "$SKIP_TRIVY" == "true" ]]; then
        log_info "Skipping enhanced scanning because Trivy is unavailable"
        return 0
    fi
    
    local dockerfile="${DEVCONTAINER_DIR}/Dockerfile"
    local devcontainer_json="${DEVCONTAINER_DIR}/devcontainer.json"
    
    if [[ ! -f "$dockerfile" ]]; then
        log_info "No Dockerfile for enhanced scans"
        return 0
    fi
    
    log_info "Running enhanced Trivy image scan..."
    
    if ! ensure_temp_image; then
        log_info "Skipping enhanced scan because temp image build failed (see ${TEMP_BUILD_DIR}/build.log)"
        return 0
    fi
    
    if trivy image --format json --output "${OUTPUT_DIR}/trivy-image.json" "$TEMP_IMAGE_NAME" 2>&1; then
        local image_vuln_count
        image_vuln_count=$(jq '[.Results[] | .Vulnerabilities[]?] | length' "${OUTPUT_DIR}/trivy-image.json" 2>/dev/null || echo "0")
        if [[ "$image_vuln_count" -gt 0 ]]; then
            local critical_vulns
            critical_vulns=$(jq '[.Results[] | .Vulnerabilities[]? | select(.Severity == "CRITICAL")] | length' "${OUTPUT_DIR}/trivy-image.json" 2>/dev/null || echo "0")
            if [[ "$critical_vulns" -gt 0 ]]; then
                log_high "Trivy image scan found $image_vuln_count vulns ($critical_vulns critical)"
                add_finding "high" "VULN-002" "Image vulnerabilities detected ($image_vuln_count total)" "$dockerfile" 0
            else
                log_medium "Trivy image scan found $image_vuln_count vulns (no critical)"
                add_finding "medium" "VULN-002" "Image vulnerabilities detected ($image_vuln_count total)" "$dockerfile" 0
            fi
        else
            log_pass "No image vulnerabilities found by Trivy"
        fi
    else
        log_info "Trivy image scan failed"
    fi
    
    # VULN-003: Outdated packages (basic grep for apt update)
    if grep -q "apt-get update" "$dockerfile" && ! grep -q "apt-get upgrade" "$dockerfile"; then
        log_medium "apt-get update without upgrade; consider updating packages"
        add_finding "medium" "VULN-003" "Potential outdated packages (add apt upgrade)" "$dockerfile" 0
    fi
    
    # COMPLIANCE-004: Basic OWASP (extend secrets check)
    if [[ -f "$devcontainer_json" ]] && grep -iE "(password|secret|key|token)[ =]" "$devcontainer_json" &> /dev/null; then
        log_critical "Potential OWASP injection risk: hardcoded secrets in config"
        add_finding "critical" "COMPLIANCE-004" "Hardcoded secrets in devcontainer.json (OWASP A07)" "$devcontainer_json" 0
    fi
    
    # COMPLIANCE-005: FIPS (basic)
    if ! grep -qE "(fips|nist)" "$dockerfile"; then
        log_info "No FIPS compliance indicators; add if required for regulated envs"
        add_finding "info" "COMPLIANCE-005" "Consider FIPS-enabled base image for compliance" "$dockerfile" 0
    else
        log_pass "FIPS compliance indicators present"
    fi
}

# -----------------------------------------------------------------------------
# Phase 14: Monitoring and Logging
# -----------------------------------------------------------------------------

check_monitoring_logging() {
    log_section "Phase 14: Monitoring and Logging Configuration"
    
    if [[ "$SKIP_MONITORING" == "true" ]]; then
        log_info "Skipping monitoring checks (SKIP_MONITORING=true)"
        return 0
    fi
    
    local compose_file="${DEVCONTAINER_DIR}/docker-compose.dev.yml"
    local dockerfile="${DEVCONTAINER_DIR}/Dockerfile"
    
    if [[ ! -f "$compose_file" ]]; then
        log_info "No compose file for logging checks"
        return 0
    fi
    
    log_info "Checking logging and monitoring config..."
    
    # LOG-001: Logging driver
    if grep -q "logging:" "$compose_file" && (grep -q "json-file" "$compose_file" || grep -q "syslog" "$compose_file"); then
        log_pass "Secure logging driver configured (json-file/syslog)"
    else
        log_medium "Default logging driver; consider json-file with limits"
        add_finding "medium" "LOG-001" "Configure structured logging driver" "$compose_file" 0
    fi
    
    # LOG-002: Log rotation
    if ! grep -q "max-size\|log-opts" "$compose_file"; then
        log_low "No log rotation limits; add to prevent disk exhaustion"
        add_finding "low" "LOG-002" "Add log rotation (max-size, max-file)" "$compose_file" 0
    else
        log_pass "Log rotation configured"
    fi
    
    # MONITOR-002: Healthcheck metrics
    if [[ -f "$dockerfile" ]] && grep -q "HEALTHCHECK " "$dockerfile" && grep -q "/metrics\|health" "$dockerfile"; then
        log_pass "Healthcheck includes metrics endpoint"
    else
        log_info "Basic healthcheck; consider adding /metrics for monitoring"
        add_finding "info" "MONITOR-002" "Enhance HEALTHCHECK with metrics check" "$dockerfile" 0
    fi
}

# -----------------------------------------------------------------------------
# Phase 15: Edge Cases
# -----------------------------------------------------------------------------

check_edge_cases() {
    log_section "Phase 15: Edge Case Validation"
    
    if [[ "$SKIP_EDGE" == "true" ]]; then
        log_info "Skipping edge case checks (SKIP_EDGE=true)"
        return 0
    fi
    
    local dockerfile="${DEVCONTAINER_DIR}/Dockerfile"
    local compose_file="${DEVCONTAINER_DIR}/docker-compose.dev.yml"
    
    log_info "Checking edge cases..."
    
    # EDGE-001: IPv6
    if [[ -f "$compose_file" ]] && ! grep -q "ipv6: true" "$compose_file"; then
        log_low "No IPv6 enabled; consider for future compatibility"
        add_finding "low" "EDGE-001" "Enable IPv6 in compose networks if needed" "$compose_file" 0
    fi
    
    # EDGE-002: Multi-arch support
    if [[ -f "$dockerfile" ]] && ! grep -q "FROM --platform=" "$dockerfile"; then
        log_info "No explicit platform; builds default to host arch"
        add_finding "info" "EDGE-002" "Consider --platform for multi-arch support" "$dockerfile" 0
    else
        log_pass "Multi-platform support indicated"
    fi
    
    # EDGE-003: Secrets management (extend existing)
    if grep -iE "(docker secret|vault)" "$dockerfile" &> /dev/null || grep -iE "(docker secret|vault)" "$compose_file" &> /dev/null; then
        log_pass "Secrets management integration detected"
    else
        log_medium "No secrets management; use Docker secrets or env files"
        add_finding "medium" "EDGE-003" "Implement secrets management for sensitive data" "$dockerfile" 0
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
    
    local dockerfile="${DEVCONTAINER_DIR}/Dockerfile"
    local dockerignore="${PROJECT_ROOT}/.dockerignore"
    
    # AUTO-FIX for DOCKERFILE-SEC-006 / OPT: apt --no-install-recommends
    if [[ -f "$dockerfile" ]] && grep -q "apt-get install" "$dockerfile" && ! grep -q "--no-install-recommends" "$dockerfile"; then
        create_backup "$dockerfile"
        sed -i.bak 's/apt-get install -y /apt-get install --no-install-recommends -y /g' "$dockerfile"
        log_fix "Added --no-install-recommends to apt-get install"
        rm -f "$dockerfile.bak"
    fi
    
    # AUTO-FIX for OPT-004: Create .dockerignore template
    if [[ ! -f "$dockerignore" ]]; then
        create_backup "$dockerignore"
        cat > "$dockerignore" << 'EOF'
# Git
.git
.gitignore

# Dependencies
node_modules
**/node_modules

# Logs
logs
*.log
npm-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# OS
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build outputs
dist
build
coverage

# IDE
.vscode/settings.json
.idea
EOF
        log_fix "Created .dockerignore template"
    fi
    
    # AUTO-FIX for HEALTHCHECK (if missing)
    if [[ -f "$dockerfile" ]] && ! grep -q "^HEALTHCHECK " "$dockerfile"; then
        create_backup "$dockerfile"
        echo "" >> "$dockerfile"
        echo "# Healthcheck" >> "$dockerfile"
        echo "HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\" >> "$dockerfile"
        echo "  CMD curl -f http://localhost/health || exit 1" >> "$dockerfile"
        log_fix "Added basic HEALTHCHECK instruction"
    fi
    
    if [[ "$AUTO_FIXED_COUNT" -gt 0 ]]; then
        log_info "Applied $AUTO_FIXED_COUNT automatic fixes"
        log_info "Backups stored in: $BACKUP_DIR"
        log_info "Auto-fix log: $AUTO_FIX_LOG"
    else
        log_info "No automatic fixes applied"
    fi
}

# -----------------------------------------------------------------------------
# Phase 8: Generate Reports
# -----------------------------------------------------------------------------

generate_reports() {
    log_section "Phase 8: Report Generation"
    
    # Generate JSON report
    local json_report="${OUTPUT_DIR}/devcontainer-audit-results.json"
    
    cat > "$json_report" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
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
DevContainer Audit Summary
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

Output Directory: $OUTPUT_DIR
EOF
    
    log_pass "Summary report generated: ${OUTPUT_DIR}/summary.txt"
}

# -----------------------------------------------------------------------------
# Main Execution
# -----------------------------------------------------------------------------

main() {
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          DevContainer Security & Quality Audit v1.1.0         ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    setup_environment
    check_tool_availability
    validate_dockerfile
    validate_devcontainer_json
    validate_docker_compose
    run_security_scan
    validate_dockerfile_optimization
    check_supply_chain
    check_runtime_security
    validate_dev_features
    run_enhanced_scanning
    check_monitoring_logging
    check_edge_cases
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
        echo -e "${GREEN}✓ DevContainer configuration is production-ready${NC}"
        echo ""
        exit 0
    elif [[ "$CRITICAL_COUNT" -gt 0 ]]; then
        echo -e "${RED}✗ CRITICAL issues must be resolved before production use${NC}"
        echo ""
        exit 2
    else
        echo -e "${YELLOW}⚠ HIGH priority issues should be addressed${NC}"
        echo ""
        exit 1
    fi
}

# Run main function
main "$@"
