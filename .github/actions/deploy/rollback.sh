#!/usr/bin/env bash
# ============================================================================
# Kubernetes Deployment Rollback Script
# ============================================================================
# Copyright (c) 2025 Political Sphere. All Rights Reserved.
#
# Version: 1.2.0
# Last Updated: 2025-11-07
# Owner: DevOps Team
#
# Description:
#   Performs rollback of Kubernetes deployments to previous stable versions.
#   Supports multiple rollback strategies with validation and health checks.
#
# Usage:
#   ./rollback.sh [--strategy=<strategy>] [--to-revision=<revision>]
#
# Arguments:
#   --strategy       Rollback strategy (auto, manual, revision)
#   --to-revision    Specific revision to rollback to (optional)
#
# Environment Variables:
#   ENVIRONMENT      Target environment (dev, staging, production)
#   APP_NAME         Application name
#   NAMESPACE        Kubernetes namespace
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_PREFIX="[ROLLBACK]"
readonly KUBECTL_TIMEOUT="30s"  # OPS-02: Explicit kubectl timeout
readonly ROLLBACK_TIMEOUT="5m"  # OPS-02: Rollback completion timeout

# Default values
ROLLBACK_STRATEGY="${ROLLBACK_STRATEGY:-auto}"
TO_REVISION="${TO_REVISION:-}"

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
    log_info "Strategy: ${ROLLBACK_STRATEGY}"
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        log_group_end
        exit 1
    fi
    
    log_info "✅ Prerequisites validated"
    log_group_end
}

# ============================================================================
# ROLLBACK FUNCTIONS
# ============================================================================

get_rollout_history() {
    log_group_start "Retrieving Rollout History"
    
    local deployment="${APP_NAME}-deployment"
    
    log_info "Deployment: ${deployment}"
    log_info "Namespace: ${NAMESPACE}"
    
    # Get rollout history
    if ! kubectl rollout history deployment/"${deployment}" -n "${NAMESPACE}"; then
        log_error "Failed to retrieve rollout history"
        log_group_end
        return 1
    fi
    
    log_group_end
}

get_current_revision() {
    local deployment="${APP_NAME}-deployment"
    
    kubectl get deployment/"${deployment}" -n "${NAMESPACE}" \
        -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}' 2>/dev/null || echo "unknown"
}

get_previous_revision() {
    local deployment="${APP_NAME}-deployment"
    local current_revision
    
    current_revision=$(get_current_revision)
    
    if [ "${current_revision}" == "unknown" ] || [ -z "${current_revision}" ]; then
        echo "unknown"
        return
    fi
    
    # Previous revision is current - 1
    echo "$((current_revision - 1))"
}

perform_auto_rollback() {
    log_group_start "Performing Automatic Rollback"
    
    local deployment="${APP_NAME}-deployment"
    local current_revision
    local previous_revision
    
    current_revision=$(get_current_revision)
    previous_revision=$(get_previous_revision)
    
    log_info "Current Revision: ${current_revision}"
    log_info "Rolling back to: ${previous_revision}"
    
    # Perform rollback
    if ! kubectl rollout undo deployment/"${deployment}" -n "${NAMESPACE}" \
        --request-timeout="${KUBECTL_TIMEOUT}"; then
        log_error "Rollback failed"
        log_group_end
        return 1
    fi
    
    log_info "Rollback initiated, waiting for completion..."
    
    # Wait for rollback to complete
    if ! kubectl rollout status deployment/"${deployment}" -n "${NAMESPACE}" \
        --timeout="${ROLLBACK_TIMEOUT}"; then
        log_error "Rollback did not complete successfully"
        log_group_end
        return 1
    fi
    
    log_info "✅ Automatic rollback completed successfully"
    log_group_end
}

perform_revision_rollback() {
    log_group_start "Performing Rollback to Specific Revision"
    
    local deployment="${APP_NAME}-deployment"
    
    if [ -z "${TO_REVISION}" ]; then
        log_error "TO_REVISION is required for revision rollback"
        log_group_end
        return 1
    fi
    
    log_info "Rolling back to revision: ${TO_REVISION}"
    
    # Verify revision exists
    if ! kubectl rollout history deployment/"${deployment}" -n "${NAMESPACE}" \
        --revision="${TO_REVISION}" \
        --request-timeout="${KUBECTL_TIMEOUT}" &> /dev/null; then
        log_error "Revision ${TO_REVISION} not found in history"
        log_group_end
        return 1
    fi
    
    # Perform rollback
    if ! kubectl rollout undo deployment/"${deployment}" -n "${NAMESPACE}" \
        --to-revision="${TO_REVISION}" \
        --request-timeout="${KUBECTL_TIMEOUT}"; then
        log_error "Rollback to revision ${TO_REVISION} failed"
        log_group_end
        return 1
    fi
    
    log_info "Rollback initiated, waiting for completion..."
    
    # Wait for rollback to complete
    if ! kubectl rollout status deployment/"${deployment}" -n "${NAMESPACE}" \
        --timeout="${ROLLBACK_TIMEOUT}"; then
        log_error "Rollback did not complete successfully"
        log_group_end
        return 1
    fi
    
    log_info "✅ Rollback to revision ${TO_REVISION} completed successfully"
    log_group_end
}

perform_manual_rollback() {
    log_group_start "Manual Rollback Guidance"
    
    local deployment="${APP_NAME}-deployment"
    
    log_info "Manual rollback instructions:"
    log_info ""
    log_info "1. View rollout history:"
    log_info "   kubectl rollout history deployment/${deployment} -n ${NAMESPACE}"
    log_info ""
    log_info "2. Rollback to previous revision:"
    log_info "   kubectl rollout undo deployment/${deployment} -n ${NAMESPACE}"
    log_info ""
    log_info "3. Rollback to specific revision:"
    log_info "   kubectl rollout undo deployment/${deployment} -n ${NAMESPACE} --to-revision=<revision>"
    log_info ""
    log_info "4. Monitor rollback progress:"
    log_info "   kubectl rollout status deployment/${deployment} -n ${NAMESPACE}"
    log_info ""
    log_info "5. Verify deployment health:"
    log_info "   kubectl get pods -n ${NAMESPACE} -l app=${APP_NAME}"
    log_info ""
    
    log_group_end
}

# ============================================================================
# HEALTH CHECK FUNCTIONS
# ============================================================================

verify_rollback_health() {
    log_group_start "Verifying Rollback Health"
    
    local deployment="${APP_NAME}-deployment"
    
    # Check deployment status
    log_info "Checking deployment status..."
    
    local ready_replicas
    local desired_replicas
    
    ready_replicas=$(kubectl get deployment/"${deployment}" -n "${NAMESPACE}" \
        -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    
    desired_replicas=$(kubectl get deployment/"${deployment}" -n "${NAMESPACE}" \
        -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    log_info "Ready Replicas: ${ready_replicas}/${desired_replicas}"
    
    if [ "${ready_replicas}" != "${desired_replicas}" ]; then
        log_warning "Not all replicas are ready"
        log_group_end
        return 1
    fi
    
    # Check pod status
    log_info "Checking pod status..."
    
    local pod_count
    pod_count=$(kubectl get pods -n "${NAMESPACE}" -l "app=${APP_NAME}" \
        --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
    
    log_info "Running Pods: ${pod_count}"
    
    if [ "${pod_count}" -eq 0 ]; then
        log_error "No pods are running"
        log_group_end
        return 1
    fi
    
    log_info "✅ Rollback health verified"
    log_group_end
}

# ============================================================================
# NOTIFICATION FUNCTIONS
# ============================================================================

send_rollback_notification() {
    local status="$1"
    local revision="${2:-unknown}"
    
    log_group_start "Recording Rollback Event"
    
    # Add annotation to deployment for audit trail
    local deployment="${APP_NAME}-deployment"
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    kubectl annotate deployment/"${deployment}" -n "${NAMESPACE}" \
        "rollback.political-sphere.com/timestamp=${timestamp}" \
        "rollback.political-sphere.com/status=${status}" \
        "rollback.political-sphere.com/revision=${revision}" \
        "rollback.political-sphere.com/actor=${GITHUB_ACTOR:-manual}" \
        "rollback.political-sphere.com/run-id=${GITHUB_RUN_ID:-manual}" \
        --overwrite || log_warning "Failed to add rollback annotations"
    
    log_info "Rollback event recorded"
    log_group_end
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    log_info "================================================"
    log_info "Kubernetes Deployment Rollback"
    log_info "================================================"
    
    # Parse command-line arguments
    for arg in "$@"; do
        case $arg in
            --strategy=*)
                ROLLBACK_STRATEGY="${arg#*=}"
                ;;
            --to-revision=*)
                TO_REVISION="${arg#*=}"
                ;;
            --help)
                echo "Usage: $0 [--strategy=<strategy>] [--to-revision=<revision>]"
                echo ""
                echo "Options:"
                echo "  --strategy=<strategy>      Rollback strategy (auto, manual, revision)"
                echo "  --to-revision=<revision>   Specific revision to rollback to"
                echo ""
                echo "Environment Variables:"
                echo "  ENVIRONMENT    Target environment (required)"
                echo "  APP_NAME       Application name (required)"
                echo "  NAMESPACE      Kubernetes namespace (optional, defaults to ENVIRONMENT)"
                exit 0
                ;;
            *)
                log_error "Unknown argument: $arg"
                exit 1
                ;;
        esac
    done
    
    # Validate prerequisites
    validate_prerequisites
    
    # Show rollout history
    get_rollout_history
    
    # Execute rollback based on strategy
    case "${ROLLBACK_STRATEGY}" in
        auto)
            perform_auto_rollback || exit 1
            ;;
        revision)
            perform_revision_rollback || exit 1
            ;;
        manual)
            perform_manual_rollback
            exit 0
            ;;
        *)
            log_error "Unknown rollback strategy: ${ROLLBACK_STRATEGY}"
            log_error "Valid strategies: auto, manual, revision"
            exit 1
            ;;
    esac
    
    # Verify rollback health
    if ! verify_rollback_health; then
        log_error "Rollback health check failed"
        send_rollback_notification "failed" "${TO_REVISION:-auto}"
        exit 1
    fi
    
    # Send notification
    send_rollback_notification "success" "${TO_REVISION:-auto}"
    
    log_info "================================================"
    log_info "✅ Rollback completed successfully"
    log_info "================================================"
}

# Execute main function
main "$@"
