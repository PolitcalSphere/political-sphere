#!/usr/bin/env bash
# ============================================================================
# Helm Deployment Script
# ============================================================================
# Copyright (c) 2025 Political Sphere. All Rights Reserved.
#
# Version: 1.1.0
# Last Updated: 2025-11-07
# Owner: DevOps Team
#
# Description:
#   Deploys applications using Helm charts with values validation,
#   diff previewing, and rollback capabilities.
#
# Usage:
#   ./helm-deploy.sh [chart-path]
#
# Environment Variables:
#   ENVIRONMENT      Target environment (dev, staging, production)
#   APP_NAME         Application name (used as Helm release name)
#   NAMESPACE        Kubernetes namespace
#   CHART_VERSION    Helm chart version (optional)
#   VALUES_FILE      Path to values file (optional)
#
# Runbooks:
#   - Helm deployment failures: docs/09-observability-and-ops/runbooks/helm-failure.md
#   - Chart validation: docs/09-observability-and-ops/runbooks/chart-validation.md
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_PREFIX="[HELM]"

# Default chart path
CHART_PATH="${1:-charts/${APP_NAME}}"
CHART_VERSION="${CHART_VERSION:-}"
VALUES_FILE="${VALUES_FILE:-}"

# ============================================================================
# ERROR HANDLING
# ============================================================================
# QUAL-02: Structured error handling with cleanup

cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Helm deployment failed with exit code: $exit_code"
        # Cleanup temporary files if any
        rm -f /tmp/helm-*.yaml 2>/dev/null || true
    fi
}

trap cleanup EXIT
trap 'log_error "Script interrupted"; exit 130' INT TERM

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
    log_info "Chart Path: ${CHART_PATH}"
    
    # Check if Helm is installed
    if ! command -v helm &> /dev/null; then
        log_error "Helm is not installed"
        log_info "Installing Helm securely..."
        
        # SEC-07: Secure Helm installation with SHA256 verification
        HELM_VERSION="v3.13.3"
        HELM_TARBALL="helm-${HELM_VERSION}-linux-amd64.tar.gz"
        
        # Download Helm tarball
        curl -LO "https://get.helm.sh/${HELM_TARBALL}"
        
        # Download checksum
        curl -LO "https://get.helm.sh/${HELM_TARBALL}.sha256sum"
        
        # Verify checksum
        if ! sha256sum --check "${HELM_TARBALL}.sha256sum"; then
            log_error "Helm checksum verification failed"
            rm -f "${HELM_TARBALL}" "${HELM_TARBALL}.sha256sum"
            log_group_end
            exit 1
        fi
        
        # Extract and install
        tar -zxvf "${HELM_TARBALL}"
        sudo mv linux-amd64/helm /usr/local/bin/helm
        
        # Clean up
        rm -rf linux-amd64 "${HELM_TARBALL}" "${HELM_TARBALL}.sha256sum"
        
        if ! command -v helm &> /dev/null; then
            log_error "Helm installation failed"
            log_group_end
            exit 1
        fi
    fi
    
    local helm_version
    helm_version=$(helm version --short)
    log_info "Helm version: ${helm_version}"
    
    log_info "✅ Prerequisites validated"
    log_group_end
}

# ============================================================================
# CHART VALIDATION
# ============================================================================

validate_chart() {
    log_group_start "Validating Helm Chart"
    
    if [ ! -d "${CHART_PATH}" ]; then
        log_error "Chart directory not found: ${CHART_PATH}"
        log_group_end
        exit 1
    fi
    
    # Check for Chart.yaml
    if [ ! -f "${CHART_PATH}/Chart.yaml" ]; then
        log_error "Chart.yaml not found in: ${CHART_PATH}"
        log_group_end
        exit 1
    fi
    
    log_info "Chart directory: ${CHART_PATH}"
    
    # Lint the chart
    log_info "Linting Helm chart..."
    
    if [ -n "${VALUES_FILE}" ] && [ -f "${VALUES_FILE}" ]; then
        helm lint "${CHART_PATH}" --values "${VALUES_FILE}"
    else
        helm lint "${CHART_PATH}"
    fi
    
    log_info "✅ Chart validation passed"
    log_group_end
}

# ============================================================================
# VALUES FILE MANAGEMENT
# ============================================================================

prepare_values() {
    log_group_start "Preparing Values"
    
    # Determine values file
    if [ -z "${VALUES_FILE}" ]; then
        # Try environment-specific values file
        if [ -f "${CHART_PATH}/values-${ENVIRONMENT}.yaml" ]; then
            VALUES_FILE="${CHART_PATH}/values-${ENVIRONMENT}.yaml"
            log_info "Using environment-specific values: ${VALUES_FILE}"
        elif [ -f "${CHART_PATH}/values.yaml" ]; then
            VALUES_FILE="${CHART_PATH}/values.yaml"
            log_info "Using default values: ${VALUES_FILE}"
        else
            log_warning "No values file found, using chart defaults"
        fi
    else
        log_info "Using specified values file: ${VALUES_FILE}"
    fi
    
    # Display values (redacted)
    if [ -n "${VALUES_FILE}" ] && [ -f "${VALUES_FILE}" ]; then
        log_info "Values file contents (sensitive values redacted):"
        cat "${VALUES_FILE}" | grep -v -i "password\|secret\|token\|key" || true
    fi
    
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
        
        kubectl create namespace "${NAMESPACE}"
        
        # Label namespace
        kubectl label namespace "${NAMESPACE}" \
            "environment=${ENVIRONMENT}" \
            "managed-by=helm" \
            --overwrite
        
        log_info "✅ Namespace created and labeled"
    fi
    
    log_group_end
}

# ============================================================================
# DEPLOYMENT FUNCTIONS
# ============================================================================

preview_changes() {
    log_group_start "Previewing Deployment Changes"
    
    log_info "Generating Helm diff..."
    
    # Check if helm-diff plugin is installed
    if ! helm plugin list | grep -q diff; then
        log_info "Installing helm-diff plugin..."
        helm plugin install https://github.com/databus23/helm-diff
    fi
    
    # Generate diff
    local diff_args=(
        "${APP_NAME}"
        "${CHART_PATH}"
        --namespace "${NAMESPACE}"
        --allow-unreleased
    )
    
    if [ -n "${VALUES_FILE}" ] && [ -f "${VALUES_FILE}" ]; then
        diff_args+=(--values "${VALUES_FILE}")
    fi
    
    if [ -n "${CHART_VERSION}" ]; then
        diff_args+=(--version "${CHART_VERSION}")
    fi
    
    # Run diff (don't fail if no changes)
    helm diff upgrade "${diff_args[@]}" || log_info "No existing release to compare"
    
    log_group_end
}

deploy_with_helm() {
    log_group_start "Deploying with Helm"
    
    # Build Helm upgrade command
    local helm_args=(
        "${APP_NAME}"
        "${CHART_PATH}"
        --install
        --namespace "${NAMESPACE}"
        --create-namespace
        --wait
        --timeout 10m
        --atomic
    )
    
    # Add values file if specified
    if [ -n "${VALUES_FILE}" ] && [ -f "${VALUES_FILE}" ]; then
        helm_args+=(--values "${VALUES_FILE}")
    fi
    
    # Add chart version if specified
    if [ -n "${CHART_VERSION}" ]; then
        helm_args+=(--version "${CHART_VERSION}")
    fi
    
    # Add audit annotations
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    helm_args+=(
        --set "annotations.deployment\.political-sphere\.com/deployed-at=${timestamp}"
        --set "annotations.deployment\.political-sphere\.com/deployed-by=${GITHUB_ACTOR:-manual}"
        --set "annotations.deployment\.political-sphere\.com/commit-sha=${GITHUB_SHA:-manual}"
        --set "annotations.deployment\.political-sphere\.com/run-id=${GITHUB_RUN_ID:-manual}"
    )
    
    # Execute Helm upgrade
    log_info "Executing Helm upgrade..."
    log_info "Command: helm upgrade ${helm_args[*]}"
    
    if ! helm upgrade "${helm_args[@]}"; then
        log_error "Helm deployment failed"
        log_error "Checking release status..."
        helm status "${APP_NAME}" -n "${NAMESPACE}" || true
        log_group_end
        return 1
    fi
    
    log_info "✅ Helm deployment completed"
    log_group_end
}

# ============================================================================
# VERIFICATION FUNCTIONS
# ============================================================================

verify_deployment() {
    log_group_start "Verifying Deployment"
    
    # Get release status
    log_info "Release status:"
    helm status "${APP_NAME}" -n "${NAMESPACE}"
    
    # List release resources
    log_info "Release resources:"
    helm get manifest "${APP_NAME}" -n "${NAMESPACE}" | kubectl get -f - || true
    
    # Check deployment health
    log_info "Checking deployment health..."
    
    local ready_replicas
    ready_replicas=$(kubectl get deployments -n "${NAMESPACE}" -l "app.kubernetes.io/instance=${APP_NAME}" \
        -o jsonpath='{.items[0].status.readyReplicas}' 2>/dev/null || echo "0")
    
    if [ "${ready_replicas}" -gt 0 ]; then
        log_info "✅ Deployment is healthy (${ready_replicas} ready replicas)"
    else
        log_warning "Deployment has no ready replicas"
    fi
    
    log_group_end
}

# ============================================================================
# ROLLBACK FUNCTIONS
# ============================================================================

rollback_on_failure() {
    log_group_start "Rollback on Failure"
    
    log_error "Deployment failed, initiating rollback..."
    
    if helm rollback "${APP_NAME}" -n "${NAMESPACE}" --wait --timeout 5m; then
        log_info "✅ Rollback completed successfully"
    else
        log_error "Rollback failed"
        log_error "Manual intervention required"
    fi
    
    log_group_end
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    log_info "================================================"
    log_info "Helm Deployment"
    log_info "================================================"
    
    # Validate prerequisites
    validate_prerequisites
    
    # Validate chart
    validate_chart
    
    # Prepare values
    prepare_values
    
    # Ensure namespace exists
    ensure_namespace
    
    # Preview changes
    preview_changes
    
    # Deploy with Helm
    if ! deploy_with_helm; then
        rollback_on_failure
        exit 1
    fi
    
    # Verify deployment
    verify_deployment
    
    log_info "================================================"
    log_info "✅ Helm deployment completed successfully"
    log_info "================================================"
}

# Execute main function
main "$@"
