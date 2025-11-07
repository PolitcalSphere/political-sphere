#!/usr/bin/env bash
# ============================================================================
# Kubernetes Manifest Apply Script
# ============================================================================
# Copyright (c) 2025 Political Sphere. All Rights Reserved.
#
# Version: 1.1.0
# Last Updated: 2025-11-07
# Owner: DevOps Team
#
# Description:
#   Applies Kubernetes manifests with validation, dry-run verification,
#   and comprehensive error handling. Supports multi-manifest directories.
#
# Usage:
#   ./kubectl-apply.sh [manifest-dir]
#
# Environment Variables:
#   ENVIRONMENT      Target environment (dev, staging, production)
#   APP_NAME         Application name
#   NAMESPACE        Kubernetes namespace
#   DRY_RUN          Enable dry-run mode (true/false)
#
# Runbooks:
#   - Manifest apply failures: docs/09-observability-and-ops/runbooks/kubectl-apply-failure.md
#   - Resource validation: docs/09-observability-and-ops/runbooks/manifest-validation.md
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_PREFIX="[APPLY]"
readonly KUBECTL_TIMEOUT="30s"  # OPS-02: Explicit kubectl timeout

# Default manifest directory
MANIFEST_DIR="${1:-k8s/${ENVIRONMENT}}"
DRY_RUN="${DRY_RUN:-false}"

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
# VALIDATION FUNCTIONS
# ============================================================================

validate_environment() {
    log_group_start "Validating Environment"
    
    if [ -z "${ENVIRONMENT:-}" ]; then
        log_error "ENVIRONMENT variable is required"
        log_group_end
        exit 1
    fi
    
    if [ -z "${APP_NAME:-}" ]; then
        log_error "APP_NAME variable is required"
        log_group_end
        exit 1
    fi
    
    # Set namespace
    NAMESPACE="${NAMESPACE:-$ENVIRONMENT}"
    
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Application: ${APP_NAME}"
    log_info "Namespace: ${NAMESPACE}"
    log_info "Manifest Directory: ${MANIFEST_DIR}"
    log_info "Dry Run: ${DRY_RUN}"
    
    log_group_end
}

validate_manifests() {
    log_group_start "Validating Manifests"
    
    if [ ! -d "${MANIFEST_DIR}" ]; then
        log_error "Manifest directory not found: ${MANIFEST_DIR}"
        log_group_end
        exit 1
    fi
    
    # Count manifest files
    local manifest_count
    manifest_count=$(find "${MANIFEST_DIR}" -type f \( -name "*.yaml" -o -name "*.yml" \) | wc -l)
    
    if [ "${manifest_count}" -eq 0 ]; then
        log_error "No manifest files found in: ${MANIFEST_DIR}"
        log_group_end
        exit 1
    fi
    
    log_info "Found ${manifest_count} manifest file(s)"
    
    # List manifest files
    find "${MANIFEST_DIR}" -type f \( -name "*.yaml" -o -name "*.yml" \) | while read -r file; do
        log_info "  - $(basename "${file}")"
    done
    
    log_group_end
}

# ============================================================================
# DRY-RUN VALIDATION
# ============================================================================

perform_dry_run() {
    log_group_start "Performing Dry-Run Validation"
    
    local validation_failed=0
    
    # Apply with client-side dry-run first
    log_info "Client-side validation..."
    
    find "${MANIFEST_DIR}" -type f \( -name "*.yaml" -o -name "*.yml" \) | while read -r file; do
        log_info "Validating: $(basename "${file}")"
        
        if ! kubectl apply --dry-run=client -f "${file}" 2>&1; then
            log_error "Client-side validation failed for: ${file}"
            validation_failed=1
        fi
    done
    
    if [ $validation_failed -ne 0 ]; then
        log_error "Client-side validation failed"
        log_group_end
        return 1
    fi
    
    # Apply with server-side dry-run
    log_info "Server-side validation..."
    
    find "${MANIFEST_DIR}" -type f \( -name "*.yaml" -o -name "*.yml" \) | while read -r file; do
        log_info "Validating: $(basename "${file}")"
        
        if ! kubectl apply --dry-run=server -f "${file}" -n "${NAMESPACE}" 2>&1; then
            log_error "Server-side validation failed for: ${file}"
            validation_failed=1
        fi
    done
    
    if [ $validation_failed -ne 0 ]; then
        log_error "Server-side validation failed"
        log_group_end
        return 1
    fi
    
    log_info "✅ Dry-run validation passed"
    log_group_end
}

# ============================================================================
# NAMESPACE MANAGEMENT
# ============================================================================

ensure_namespace() {
    log_group_start "Ensuring Namespace Exists"
    
    if kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        log_info "Namespace '${NAMESPACE}' already exists"
    else
        log_info "Creating namespace: ${NAMESPACE}"
        
        if ! kubectl create namespace "${NAMESPACE}"; then
            log_error "Failed to create namespace: ${NAMESPACE}"
            log_group_end
            exit 1
        fi
        
        # Label namespace
        kubectl label namespace "${NAMESPACE}" \
            environment="${ENVIRONMENT}" \
            managed-by="github-actions" \
            --request-timeout="${KUBECTL_TIMEOUT}" \
            --overwrite
        
        log_info "✅ Namespace created and labeled"
    fi
    
    log_group_end
}

# ============================================================================
# APPLY FUNCTIONS
# ============================================================================

apply_manifests() {
    log_group_start "Applying Kubernetes Manifests"
    
    local apply_failed=0
    local applied_count=0
    
    # Apply each manifest file
    find "${MANIFEST_DIR}" -type f \( -name "*.yaml" -o -name "*.yml" \) | sort | while read -r file; do
        log_info "Applying: $(basename "${file}")"
        
        # Add audit annotations
        local timestamp
        timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
        
        # Apply with annotations
        if kubectl apply -f "${file}" -n "${NAMESPACE}" \
            --prune --all \
            --prune-allowlist=core/v1/ConfigMap \
            --prune-allowlist=core/v1/Secret \
            --prune-allowlist=apps/v1/Deployment \
            --prune-allowlist=core/v1/Service; then
            
            applied_count=$((applied_count + 1))
            log_info "✅ Applied: $(basename "${file}")"
        else
            log_error "❌ Failed to apply: ${file}"
            apply_failed=1
        fi
    done
    
    if [ $apply_failed -ne 0 ]; then
        log_error "Some manifests failed to apply"
        log_group_end
        return 1
    fi
    
    log_info "================================================"
    log_info "✅ Successfully applied ${applied_count} manifest(s)"
    log_info "================================================"
    
    log_group_end
}

annotate_resources() {
    log_group_start "Annotating Resources for Audit Trail"
    
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Annotate deployments
    if kubectl get deployments -n "${NAMESPACE}" -l "app=${APP_NAME}" &> /dev/null; then
        kubectl annotate deployments -n "${NAMESPACE}" -l "app=${APP_NAME}" \
            "deployment.political-sphere.com/applied-at=${timestamp}" \
            "deployment.political-sphere.com/applied-by=${GITHUB_ACTOR:-manual}" \
            "deployment.political-sphere.com/commit-sha=${GITHUB_SHA:-manual}" \
            "deployment.political-sphere.com/run-id=${GITHUB_RUN_ID:-manual}" \
            "deployment.political-sphere.com/environment=${ENVIRONMENT}" \
            --overwrite || log_warning "Failed to annotate deployments"
    fi
    
    # Annotate services
    if kubectl get services -n "${NAMESPACE}" -l "app=${APP_NAME}" &> /dev/null; then
        kubectl annotate services -n "${NAMESPACE}" -l "app=${APP_NAME}" \
            "deployment.political-sphere.com/applied-at=${timestamp}" \
            "deployment.political-sphere.com/applied-by=${GITHUB_ACTOR:-manual}" \
            --overwrite || log_warning "Failed to annotate services"
    fi
    
    log_info "✅ Resources annotated"
    log_group_end
}

# ============================================================================
# VERIFICATION FUNCTIONS
# ============================================================================

verify_application() {
    log_group_start "Verifying Application Status"
    
    # Wait a moment for resources to be created
    sleep 5
    
    # Check deployments
    log_info "Checking deployments..."
    
    if kubectl get deployments -n "${NAMESPACE}" -l "app=${APP_NAME}" &> /dev/null; then
        kubectl get deployments -n "${NAMESPACE}" -l "app=${APP_NAME}"
        
        # Check if deployment is available
        local available
        available=$(kubectl get deployments -n "${NAMESPACE}" -l "app=${APP_NAME}" \
            -o jsonpath='{.items[0].status.availableReplicas}' 2>/dev/null || echo "0")
        
        if [ "${available}" -gt 0 ]; then
            log_info "✅ Deployment is available (${available} replicas)"
        else
            log_warning "Deployment has no available replicas"
        fi
    else
        log_info "No deployments found for app=${APP_NAME}"
    fi
    
    # Check services
    log_info "Checking services..."
    
    if kubectl get services -n "${NAMESPACE}" -l "app=${APP_NAME}" &> /dev/null; then
        kubectl get services -n "${NAMESPACE}" -l "app=${APP_NAME}"
        log_info "✅ Service configured"
    else
        log_info "No services found for app=${APP_NAME}"
    fi
    
    # Check pods
    log_info "Checking pods..."
    
    if kubectl get pods -n "${NAMESPACE}" -l "app=${APP_NAME}" &> /dev/null; then
        kubectl get pods -n "${NAMESPACE}" -l "app=${APP_NAME}"
        
        local running_pods
        running_pods=$(kubectl get pods -n "${NAMESPACE}" -l "app=${APP_NAME}" \
            --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
        
        log_info "Running pods: ${running_pods}"
    else
        log_info "No pods found for app=${APP_NAME}"
    fi
    
    log_group_end
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    log_info "================================================"
    log_info "Kubernetes Manifest Apply"
    log_info "================================================"
    
    # Validate environment and manifests
    validate_environment
    validate_manifests
    
    # Ensure namespace exists
    ensure_namespace
    
    # Perform dry-run validation
    perform_dry_run || exit 1
    
    # Apply manifests (unless dry-run only)
    if [ "${DRY_RUN}" == "true" ]; then
        log_info "================================================"
        log_info "✅ Dry-run completed successfully"
        log_info "Skipping actual apply (DRY_RUN=true)"
        log_info "================================================"
        exit 0
    fi
    
    apply_manifests || exit 1
    
    # Annotate resources for audit trail
    annotate_resources
    
    # Verify application status
    verify_application
    
    log_info "================================================"
    log_info "✅ Manifest apply completed successfully"
    log_info "================================================"
}

# Execute main function
main "$@"
