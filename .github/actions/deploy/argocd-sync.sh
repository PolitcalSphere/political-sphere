#!/usr/bin/env bash
# ============================================================================
# ArgoCD Sync Script
# ============================================================================
# Copyright (c) 2025 Political Sphere. All Rights Reserved.
#
# Version: 1.1.0
# Last Updated: 2025-11-07
# Owner: DevOps Team
#
# Description:
#   Triggers ArgoCD application sync with health checks and wait conditions.
#   Supports automated sync with manual approval gates for production.
#
# Usage:
#   ./argocd-sync.sh [application-name]
#
# Environment Variables:
#   ENVIRONMENT          Target environment (dev, staging, production)
#   APP_NAME             Application name (ArgoCD app name)
#   ARGOCD_SERVER        ArgoCD server URL
#   ARGOCD_AUTH_TOKEN    ArgoCD authentication token
#   SYNC_STRATEGY        Sync strategy (auto, manual)
#   PRUNE                Prune resources (true/false)
#
# Runbooks:
#   - ArgoCD sync failures: docs/09-observability-and-ops/runbooks/argocd-failure.md
#   - Sync strategies: docs/09-observability-and-ops/runbooks/argocd-sync.md
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_PREFIX="[ARGOCD]"

# ArgoCD configuration
ARGOCD_APP_NAME="${1:-${APP_NAME}-${ENVIRONMENT}}"
ARGOCD_SERVER="${ARGOCD_SERVER:-argocd.political-sphere.com}"
SYNC_STRATEGY="${SYNC_STRATEGY:-auto}"
PRUNE="${PRUNE:-true}"
TIMEOUT="${TIMEOUT:-600}"  # 10 minutes

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

log_info() {
    echo "::notice::${LOG_PREFIX} $*"
}

log_warning() {
    echo "::warning::${LOG_PREFIX} $*"
}

log_error() {
    echo "::error::${LOG_PREFIX} $*"
}

log_group_start() {
    echo "::group::${LOG_PREFIX} $*"
}

log_group_end() {
    echo "::endgroup::"
}

# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================

validate_prerequisites() {
    log_group_start "Validating Prerequisites"
    
    # Check required environment variables
    if [ -z "${ENVIRONMENT:-}" ]; then
        log_error "ENVIRONMENT variable is required"
        log_group_end
        exit 1
    fi
    
    if [ -z "${ARGOCD_AUTH_TOKEN:-}" ]; then
        log_error "ARGOCD_AUTH_TOKEN variable is required"
        log_error "Set it as a GitHub secret or environment variable"
        log_group_end
        exit 1
    fi
    
    log_info "Environment: ${ENVIRONMENT}"
    log_info "ArgoCD Application: ${ARGOCD_APP_NAME}"
    log_info "ArgoCD Server: ${ARGOCD_SERVER}"
    log_info "Sync Strategy: ${SYNC_STRATEGY}"
    log_info "Prune: ${PRUNE}"
    
    # Check if ArgoCD CLI is installed
    if ! command -v argocd &> /dev/null; then
        log_info "ArgoCD CLI not found, installing..."
        install_argocd_cli
    fi
    
    local argocd_version
    argocd_version=$(argocd version --client --short 2>&1 | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")
    log_info "ArgoCD CLI version: ${argocd_version}"
    
    log_info "✅ Prerequisites validated"
    log_group_end
}

install_argocd_cli() {
    log_group_start "Installing ArgoCD CLI"
    
    local argocd_version="v2.9.3"
    local os
    local arch
    
    # Detect OS
    case "$(uname -s)" in
        Linux*)     os=linux;;
        Darwin*)    os=darwin;;
        *)          log_error "Unsupported OS: $(uname -s)"; exit 1;;
    esac
    
    # Detect architecture
    case "$(uname -m)" in
        x86_64)     arch=amd64;;
        arm64)      arch=arm64;;
        aarch64)    arch=arm64;;
        *)          log_error "Unsupported architecture: $(uname -m)"; exit 1;;
    esac
    
    local download_url="https://github.com/argoproj/argo-cd/releases/download/${argocd_version}/argocd-${os}-${arch}"
    
    log_info "Downloading ArgoCD CLI from: ${download_url}"
    
    curl -sSL -o /usr/local/bin/argocd "${download_url}"
    chmod +x /usr/local/bin/argocd
    
    log_info "✅ ArgoCD CLI installed"
    log_group_end
}

# ============================================================================
# ARGOCD LOGIN
# ============================================================================

login_to_argocd() {
    log_group_start "Logging into ArgoCD"
    
    # Mask token in logs
    echo "::add-mask::${ARGOCD_AUTH_TOKEN}"
    
    log_info "Authenticating with ArgoCD server: ${ARGOCD_SERVER}"
    
    if ! argocd login "${ARGOCD_SERVER}" \
        --auth-token="${ARGOCD_AUTH_TOKEN}" \
        --grpc-web \
        --insecure; then  # Remove --insecure in production with valid certs
        log_error "Failed to authenticate with ArgoCD"
        log_group_end
        exit 1
    fi
    
    log_info "✅ Authenticated with ArgoCD"
    log_group_end
}

# ============================================================================
# APPLICATION VALIDATION
# ============================================================================

verify_application_exists() {
    log_group_start "Verifying ArgoCD Application"
    
    if ! argocd app get "${ARGOCD_APP_NAME}" &> /dev/null; then
        log_error "ArgoCD application not found: ${ARGOCD_APP_NAME}"
        log_error "Available applications:"
        argocd app list || true
        log_group_end
        exit 1
    fi
    
    log_info "Application '${ARGOCD_APP_NAME}' found"
    
    # Show current application status
    log_info "Current application status:"
    argocd app get "${ARGOCD_APP_NAME}" || true
    
    log_group_end
}

# ============================================================================
# SYNC FUNCTIONS
# ============================================================================

perform_sync() {
    log_group_start "Performing ArgoCD Sync"
    
    # Build sync command
    local sync_args=(
        "${ARGOCD_APP_NAME}"
        --timeout "${TIMEOUT}"
    )
    
    # Add prune flag if enabled
    if [ "${PRUNE}" == "true" ]; then
        sync_args+=(--prune)
        log_info "Prune enabled - will remove resources not in Git"
    fi
    
    # Add strategy-specific options
    case "${SYNC_STRATEGY}" in
        auto)
            sync_args+=(
                --async=false
                --retry-limit 3
                --retry-backoff-duration 5s
                --retry-backoff-max-duration 3m
            )
            ;;
        manual)
            log_info "Manual sync strategy - waiting for user approval"
            log_info "Please approve sync in ArgoCD UI: https://${ARGOCD_SERVER}/applications/${ARGOCD_APP_NAME}"
            log_group_end
            return 0
            ;;
        *)
            log_error "Unknown sync strategy: ${SYNC_STRATEGY}"
            log_group_end
            exit 1
            ;;
    esac
    
    # Execute sync
    log_info "Executing ArgoCD sync..."
    log_info "Command: argocd app sync ${sync_args[*]}"
    
    if ! argocd app sync "${sync_args[@]}"; then
        log_error "ArgoCD sync failed"
        log_error "Application status:"
        argocd app get "${ARGOCD_APP_NAME}" || true
        log_group_end
        return 1
    fi
    
    log_info "✅ Sync completed"
    log_group_end
}

# ============================================================================
# HEALTH CHECK FUNCTIONS
# ============================================================================

wait_for_health() {
    log_group_start "Waiting for Application Health"
    
    log_info "Waiting for application to become healthy..."
    log_info "Timeout: ${TIMEOUT} seconds"
    
    if ! argocd app wait "${ARGOCD_APP_NAME}" \
        --health \
        --timeout "${TIMEOUT}"; then
        log_error "Application did not become healthy within timeout"
        log_error "Application status:"
        argocd app get "${ARGOCD_APP_NAME}" || true
        
        # Show resource health details
        log_error "Resource health details:"
        argocd app resources "${ARGOCD_APP_NAME}" || true
        
        log_group_end
        return 1
    fi
    
    log_info "✅ Application is healthy"
    log_group_end
}

check_sync_status() {
    log_group_start "Checking Sync Status"
    
    local sync_status
    sync_status=$(argocd app get "${ARGOCD_APP_NAME}" -o json | \
        jq -r '.status.sync.status' 2>/dev/null || echo "Unknown")
    
    log_info "Sync status: ${sync_status}"
    
    if [ "${sync_status}" != "Synced" ]; then
        log_warning "Application is not fully synced"
        log_warning "Current status: ${sync_status}"
    else
        log_info "✅ Application is synced"
    fi
    
    # Check health status
    local health_status
    health_status=$(argocd app get "${ARGOCD_APP_NAME}" -o json | \
        jq -r '.status.health.status' 2>/dev/null || echo "Unknown")
    
    log_info "Health status: ${health_status}"
    
    if [ "${health_status}" != "Healthy" ]; then
        log_warning "Application is not healthy"
        log_warning "Current status: ${health_status}"
    else
        log_info "✅ Application is healthy"
    fi
    
    log_group_end
}

# ============================================================================
# DIFF PREVIEW
# ============================================================================

preview_diff() {
    log_group_start "Previewing Changes"
    
    log_info "Showing diff between live state and desired state..."
    
    argocd app diff "${ARGOCD_APP_NAME}" || log_info "No differences found"
    
    log_group_end
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    log_info "================================================"
    log_info "ArgoCD Sync"
    log_info "================================================"
    
    # Validate prerequisites
    validate_prerequisites
    
    # Login to ArgoCD
    login_to_argocd
    
    # Verify application exists
    verify_application_exists
    
    # Preview changes (if auto sync)
    if [ "${SYNC_STRATEGY}" == "auto" ]; then
        preview_diff
    fi
    
    # Perform sync
    if ! perform_sync; then
        log_error "Sync failed"
        exit 1
    fi
    
    # Wait for health (if auto sync)
    if [ "${SYNC_STRATEGY}" == "auto" ]; then
        if ! wait_for_health; then
            log_error "Health check failed"
            exit 1
        fi
    fi
    
    # Check final sync status
    check_sync_status
    
    log_info "================================================"
    log_info "✅ ArgoCD sync completed successfully"
    log_info "================================================"
}

# Execute main function
main "$@"
