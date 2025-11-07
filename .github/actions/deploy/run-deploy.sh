#!/usr/bin/env bash
# ============================================================================
# Deployment Execution Script
# ============================================================================
# Copyright (c) 2025 Political Sphere. All Rights Reserved.
#
# Version: 1.2.0
# Last Updated: 2025-11-07
# Owner: DevOps Team
#
# Description:
#   Main deployment orchestration script that handles multiple deployment
#   strategies (rolling, blue-green, canary) with automatic health checks
#   and rollback capabilities.
#
# Security:
#   - All inputs validated via environment variables
#   - No sensitive data logged
#   - Secrets fetched from AWS Secrets Manager at runtime
#
# Governance:
#   - Structured JSON logging for audit trails
#   - Deployment metadata tracked in annotations
#   - Change attribution via GitHub context
#
# Runbooks:
#   - Deployment failures: docs/09-observability-and-ops/runbooks/deployment-failure.md
#   - Rollback procedures: docs/09-observability-and-ops/runbooks/rollback.md
#   - Performance issues: docs/09-observability-and-ops/runbooks/performance.md
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_PREFIX="[DEPLOY]"
readonly DEPLOYMENT_TIMEOUT="${TIMEOUT_MINUTES:-10}m"
readonly KUBECTL_TIMEOUT="30s"  # OPS-02: Explicit kubectl timeout

# Record deployment start time for metrics
date +%s > /tmp/deploy_start_time

# ============================================================================
# ERROR HANDLING
# ============================================================================
# QUAL-02: Structured error handling with cleanup

cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_error "Script failed with exit code: $exit_code"
        log_error "Cleaning up temporary resources..."
        
        # Cleanup logic here
        rm -f /tmp/deploy_start_time 2>/dev/null || true
    fi
}

trap cleanup EXIT
trap 'log_error "Script interrupted"; exit 130' INT TERM

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================
# OPS-01: Structured JSON logging

log_json() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Structured log to file
    echo "{\"timestamp\":\"${timestamp}\",\"level\":\"${level}\",\"component\":\"deploy\",\"environment\":\"${ENVIRONMENT:-unknown}\",\"application\":\"${APPLICATION:-unknown}\",\"message\":\"${message}\"}" >> /tmp/deployment.log || true
    
    # Also output GitHub Actions format
    case "$level" in
        INFO)
            echo "::notice::${LOG_PREFIX} $message"
            ;;
        WARNING)
            echo "::warning::${LOG_PREFIX} $message"
            ;;
        ERROR)
            echo "::error::${LOG_PREFIX} $message"
            ;;
    esac
}

log_info() {
    log_json "INFO" "$@"
}

log_warning() {
    log_json "WARNING" "$@"
}

log_error() {
    log_json "ERROR" "$@"
}

log_group_start() {
    echo "::group::${LOG_PREFIX} $*"
    log_info "Starting: $*"
}

log_group_end() {
    echo "::endgroup::"
}

# ============================================================================
# VALIDATION
# ============================================================================

validate_environment() {
    log_group_start "Environment Validation"
    
    local required_vars=(
        "ENVIRONMENT"
        "APPLICATION"
        "IMAGE_TAG"
        "STRATEGY"
        "GITHUB_RUN_ID"
        "GITHUB_SHA"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            log_error "Required environment variable not set: $var"
            exit 1
        fi
    done
    
    log_info "✅ Environment variables validated"
    log_group_end
}

# ============================================================================
# KUBERNETES HELPERS
# ============================================================================

get_current_deployment() {
    kubectl get deployment "${APPLICATION}" \
        -n "${ENVIRONMENT}" \
        -o jsonpath='{.spec.template.spec.containers[0].image}' \
        --request-timeout="${KUBECTL_TIMEOUT}" \
        2>/dev/null || echo ""
}

wait_for_rollout() {
    local deployment_name="$1"
    local namespace="${ENVIRONMENT}"
    
    log_info "Waiting for rollout of ${deployment_name}..."
    
    # OPS-02: Add explicit timeout to kubectl command
    if ! kubectl rollout status deployment/"${deployment_name}" \
        -n "${namespace}" \
        --timeout="${DEPLOYMENT_TIMEOUT}" \
        --request-timeout="${KUBECTL_TIMEOUT}"; then
        log_error "Deployment rollout failed or timed out"
        return 1
    fi
    
    log_info "✅ Rollout completed successfully"
    return 0
}

get_deployment_revision() {
    kubectl rollout history deployment/"${APPLICATION}" \
        -n "${ENVIRONMENT}" \
        -o jsonpath='{.metadata.generation}' \
        --request-timeout="${KUBECTL_TIMEOUT}" \
        2>/dev/null || echo "0"
}

# SEC-06: Fetch secrets from AWS Secrets Manager
fetch_application_secrets() {
    log_group_start "Fetching Application Secrets"
    
    local secret_name="political-sphere/${ENVIRONMENT}/${APPLICATION}"
    
    log_info "Fetching secrets from AWS Secrets Manager: ${secret_name}"
    
    if aws secretsmanager get-secret-value \
        --secret-id "${secret_name}" \
        --region "${AWS_REGION}" \
        --query SecretString \
        --output text > /tmp/app_secrets.json 2>/dev/null; then
        
        log_info "✅ Secrets fetched successfully"
        
        # Create Kubernetes secret if it doesn't exist
        if ! kubectl get secret "${APPLICATION}-secrets" -n "${ENVIRONMENT}" &>/dev/null; then
            kubectl create secret generic "${APPLICATION}-secrets" \
                --from-file=secrets.json=/tmp/app_secrets.json \
                -n "${ENVIRONMENT}" \
                --request-timeout="${KUBECTL_TIMEOUT}"
            log_info "✅ Kubernetes secret created"
        else
            kubectl create secret generic "${APPLICATION}-secrets" \
                --from-file=secrets.json=/tmp/app_secrets.json \
                -n "${ENVIRONMENT}" \
                --dry-run=client -o yaml | \
                kubectl apply -f - --request-timeout="${KUBECTL_TIMEOUT}"
            log_info "✅ Kubernetes secret updated"
        fi
        
        # Cleanup local file
        rm -f /tmp/app_secrets.json
    else
        log_warning "No secrets found in AWS Secrets Manager (this may be expected)"
    fi
    
    log_group_end
}

# ============================================================================
# DEPLOYMENT STRATEGIES
# ============================================================================

deploy_rolling() {
    log_group_start "Rolling Deployment"
    
    local ecr_registry="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    local full_image="${ecr_registry}/political-sphere/${ENVIRONMENT}/${APPLICATION}:${IMAGE_TAG}"
    
    log_info "Deploying image: ${full_image}"
    
    # Update deployment with new image
    kubectl set image deployment/"${APPLICATION}" \
        "${APPLICATION}=${full_image}" \
        -n "${ENVIRONMENT}" \
        --record
    
    # Annotate deployment with metadata
    kubectl annotate deployment/"${APPLICATION}" \
        -n "${ENVIRONMENT}" \
        kubernetes.io/change-cause="GitHub Actions deployment by ${GITHUB_ACTOR}" \
        deployment.political-sphere.com/run-id="${GITHUB_RUN_ID}" \
        deployment.political-sphere.com/commit-sha="${GITHUB_SHA}" \
        deployment.political-sphere.com/deployed-at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --overwrite
    
    # Wait for rollout
    if ! wait_for_rollout "${APPLICATION}"; then
        log_error "Rolling deployment failed"
        return 1
    fi
    
    log_group_end
    return 0
}

deploy_blue_green() {
    log_group_start "Blue-Green Deployment"
    
    log_info "Blue-green deployment strategy"
    local current_version=$(get_current_deployment | grep -o '[^:]*$' || echo "none")
    log_info "Current version: ${current_version}"
    log_info "New version: ${IMAGE_TAG}"
    
    # Create green deployment
    local green_deployment="${APPLICATION}-green"
    local ecr_registry="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    local full_image="${ecr_registry}/political-sphere/${ENVIRONMENT}/${APPLICATION}:${IMAGE_TAG}"
    
    # QUAL-03: Improved blue-green with atomic switching
    # Clone current deployment as green
    kubectl get deployment "${APPLICATION}" -n "${ENVIRONMENT}" \
        -o yaml \
        --request-timeout="${KUBECTL_TIMEOUT}" | \
        sed "s/name: ${APPLICATION}/name: ${green_deployment}/g" | \
        sed "s/app: ${APPLICATION}/app: ${green_deployment}/g" | \
        kubectl apply -f - --request-timeout="${KUBECTL_TIMEOUT}"
    
    # Update green deployment with new image
    kubectl set image deployment/"${green_deployment}" \
        "${APPLICATION}=${full_image}" \
        -n "${ENVIRONMENT}" \
        --request-timeout="${KUBECTL_TIMEOUT}"
    
    # Wait for green deployment
    if ! wait_for_rollout "${green_deployment}"; then
        log_error "Green deployment failed"
        kubectl delete deployment "${green_deployment}" -n "${ENVIRONMENT}" \
            --ignore-not-found \
            --request-timeout="${KUBECTL_TIMEOUT}"
        return 1
    fi
    
    # Verify green deployment health before switching
    log_info "Verifying green deployment health..."
    local green_ready=$(kubectl get deployment "${green_deployment}" \
        -n "${ENVIRONMENT}" \
        -o jsonpath='{.status.readyReplicas}' \
        --request-timeout="${KUBECTL_TIMEOUT}" \
        2>/dev/null || echo "0")
    
    if [ "$green_ready" -eq 0 ]; then
        log_error "Green deployment has no ready replicas"
        kubectl delete deployment "${green_deployment}" -n "${ENVIRONMENT}" \
            --ignore-not-found \
            --request-timeout="${KUBECTL_TIMEOUT}"
        return 1
    fi
    
    # Atomic switch: Update service selector in one operation
    log_info "Switching traffic to green deployment (atomic operation)..."
    kubectl patch service "${APPLICATION}" \
        -n "${ENVIRONMENT}" \
        --type=json \
        -p='[{"op": "replace", "path": "/spec/selector/app", "value": "'"${green_deployment}"'"}]' \
        --request-timeout="${KUBECTL_TIMEOUT}"
    
    log_info "Service switched to green deployment"
    
    # Wait a moment for traffic to stabilize
    sleep 5
    
    # Clean up blue deployment after success
    log_info "Removing old blue deployment..."
    kubectl delete deployment "${APPLICATION}" -n "${ENVIRONMENT}" \
        --ignore-not-found \
        --request-timeout="${KUBECTL_TIMEOUT}"
    
    # Rename green to blue for next deployment
    kubectl get deployment "${green_deployment}" -n "${ENVIRONMENT}" \
        -o yaml \
        --request-timeout="${KUBECTL_TIMEOUT}" | \
        sed "s/name: ${green_deployment}/name: ${APPLICATION}/g" | \
        sed "s/app: ${green_deployment}/app: ${APPLICATION}/g" | \
        kubectl apply -f - --request-timeout="${KUBECTL_TIMEOUT}"
    
    kubectl delete deployment "${green_deployment}" -n "${ENVIRONMENT}" \
        --ignore-not-found \
        --request-timeout="${KUBECTL_TIMEOUT}"
    
    log_info "✅ Blue-green deployment completed"
    log_group_end
    return 0
}

deploy_canary() {
    log_group_start "Canary Deployment"
    
    local canary_pct="${CANARY_PCT:-10}"
    log_info "Canary deployment with ${canary_pct}% traffic"
    
    local canary_deployment="${APPLICATION}-canary"
    local ecr_registry="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    local full_image="${ecr_registry}/political-sphere/${ENVIRONMENT}/${APPLICATION}:${IMAGE_TAG}"
    
    # Create canary deployment
    kubectl get deployment "${APPLICATION}" -n "${ENVIRONMENT}" -o yaml | \
        sed "s/${APPLICATION}/${canary_deployment}/g" | \
        kubectl apply -f -
    
    # Update canary with new image
    kubectl set image deployment/"${canary_deployment}" \
        "${APPLICATION}=${full_image}" \
        -n "${ENVIRONMENT}"
    
    # Scale canary based on percentage
    local stable_replicas=$(kubectl get deployment "${APPLICATION}" \
        -n "${ENVIRONMENT}" \
        -o jsonpath='{.spec.replicas}')
    local canary_replicas=$(( (stable_replicas * canary_pct) / 100 ))
    [ "$canary_replicas" -lt 1 ] && canary_replicas=1
    
    kubectl scale deployment/"${canary_deployment}" \
        --replicas="${canary_replicas}" \
        -n "${ENVIRONMENT}"
    
    # Wait for canary
    if ! wait_for_rollout "${canary_deployment}"; then
        log_error "Canary deployment failed"
        kubectl delete deployment "${canary_deployment}" -n "${ENVIRONMENT}" --ignore-not-found
        return 1
    fi
    
    log_info "Canary deployed successfully with ${canary_replicas} replicas"
    log_info "Monitor canary metrics before promoting to full deployment"
    log_info "To promote: kubectl set image deployment/${APPLICATION} ${APPLICATION}=${full_image} -n ${ENVIRONMENT}"
    log_info "To rollback: kubectl delete deployment ${canary_deployment} -n ${ENVIRONMENT}"
    
    log_group_end
    return 0
}

# ============================================================================
# ROLLBACK
# ============================================================================

rollback_deployment() {
    log_group_start "Deployment Rollback"
    
    log_warning "Rolling back deployment for ${APPLICATION}"
    
    kubectl rollout undo deployment/"${APPLICATION}" \
        -n "${ENVIRONMENT}" \
        --request-timeout="${KUBECTL_TIMEOUT}"
    
    if wait_for_rollout "${APPLICATION}"; then
        # OPS-03: Verify rollback health
        log_info "Verifying rollback health..."
        
        local ready_replicas=$(kubectl get deployment "${APPLICATION}" \
            -n "${ENVIRONMENT}" \
            -o jsonpath='{.status.readyReplicas}' \
            --request-timeout="${KUBECTL_TIMEOUT}" \
            2>/dev/null || echo "0")
        
        local desired_replicas=$(kubectl get deployment "${APPLICATION}" \
            -n "${ENVIRONMENT}" \
            -o jsonpath='{.spec.replicas}' \
            --request-timeout="${KUBECTL_TIMEOUT}" \
            2>/dev/null || echo "0")
        
        if [ "$ready_replicas" -eq "$desired_replicas" ] && [ "$ready_replicas" -gt 0 ]; then
            log_info "✅ Rollback completed successfully with ${ready_replicas}/${desired_replicas} ready replicas"
            log_group_end
            return 0
        else
            log_error "Rollback health check failed: ${ready_replicas}/${desired_replicas} ready replicas"
            log_group_end
            return 1
        fi
    else
        log_error "Rollback failed"
        log_group_end
        return 1
    fi
}

# ============================================================================
# MULTI-REGION DEPLOYMENT
# ============================================================================
# STRAT-03: Deploy to a specific AWS region

deploy_to_region() {
    local region="$1"
    log_info "Executing deployment in region: ${region}"
    
    # Fetch application secrets for this region
    fetch_application_secrets || return 1
    
    # Get AWS account ID for ECR
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    
    # Store current revision for potential rollback
    local pre_deployment_revision=$(get_deployment_revision)
    
    # Execute deployment based on strategy
    local deployment_result=0
    
    case "${STRATEGY}" in
        rolling)
            deploy_rolling || deployment_result=$?
            ;;
        blue-green)
            deploy_blue_green || deployment_result=$?
            ;;
        canary)
            deploy_canary || deployment_result=$?
            ;;
        *)
            log_error "Unknown deployment strategy: ${STRATEGY}"
            return 1
            ;;
    esac
    
    # Return deployment result
    return $deployment_result
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    log_info "================================================"
    log_info "Political Sphere Deployment"
    log_info "================================================"
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Application: ${APPLICATION}"
    log_info "Image Tag: ${IMAGE_TAG}"
    log_info "Strategy: ${STRATEGY}"
    log_info "GitHub Run: ${GITHUB_RUN_ID}"
    log_info "Commit SHA: ${GITHUB_SHA:0:8}"
    log_info "================================================"
    
    # Validate environment
    validate_environment
    
    # ========================================================================
    # STRAT-03: Multi-Region Deployment Support
    # ========================================================================
    # Deploy to multiple regions for data residency and GDPR compliance
    
    if [ -n "${TARGET_REGIONS:-}" ] && [ "${TARGET_REGIONS}" != "default" ]; then
        log_group_start "Multi-Region Deployment"
        log_info "Deploying to multiple regions: ${TARGET_REGIONS}"
        
        # Split comma-separated regions
        IFS=',' read -ra REGIONS <<< "${TARGET_REGIONS}"
        
        local overall_success=true
        local deployed_regions=()
        local failed_regions=()
        
        for region in "${REGIONS[@]}"; do
            region=$(echo "$region" | tr -d '[:space:]')  # Trim whitespace
            log_info "Deploying to region: ${region}"
            
            # Update kubeconfig for this region's EKS cluster
            local cluster_name="${EKS_CLUSTER_NAME:-political-sphere-${ENVIRONMENT}}"
            
            if aws eks update-kubeconfig \
                --region "${region}" \
                --name "${cluster_name}" \
                --alias "${region}-${cluster_name}" 2>/dev/null; then
                
                log_info "✅ Connected to EKS cluster in ${region}"
                
                # Temporarily override AWS_REGION for this deployment
                export AWS_REGION="${region}"
                
                # Execute deployment for this region
                if deploy_to_region "${region}"; then
                    deployed_regions+=("${region}")
                    log_info "✅ Successfully deployed to ${region}"
                else
                    failed_regions+=("${region}")
                    log_error "❌ Deployment failed in ${region}"
                    overall_success=false
                fi
            else
                log_error "Failed to connect to EKS cluster in ${region}"
                failed_regions+=("${region}")
                overall_success=false
            fi
        done
        
        # Report results
        log_info "Multi-region deployment summary:"
        log_info "Successful: ${deployed_regions[*]:-none}"
        log_info "Failed: ${failed_regions[*]:-none}"
        
        if [ "$overall_success" = "false" ]; then
            log_error "Multi-region deployment had failures"
            exit 1
        fi
        
        log_group_end
        exit 0  # Multi-region deployment complete, exit here
    fi
    
    # ========================================================================
    # Single Region Deployment (Default)
    # ========================================================================
    
    # Fetch application secrets from AWS Secrets Manager
    fetch_application_secrets
    
    # Get AWS account ID for ECR
    export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    export AWS_REGION="${AWS_REGION:-us-east-1}"
    
    # Store current revision for potential rollback
    local pre_deployment_revision=$(get_deployment_revision)
    
    # Execute deployment based on strategy
    local deployment_result=0
    
    case "${STRATEGY}" in
        rolling)
            deploy_rolling || deployment_result=$?
            ;;
        blue-green)
            deploy_blue_green || deployment_result=$?
            ;;
        canary)
            deploy_canary || deployment_result=$?
            ;;
        *)
            log_error "Unknown deployment strategy: ${STRATEGY}"
            exit 1
            ;;
    esac
    
    # Handle deployment result
    if [ $deployment_result -ne 0 ]; then
        log_error "Deployment failed"
        
        if [ "${ENABLE_ROLLBACK:-true}" = "true" ] && [ "${STRATEGY}" != "canary" ]; then
            rollback_deployment || true
            echo "status=rolled-back" >> "$GITHUB_OUTPUT"
        else
            echo "status=failed" >> "$GITHUB_OUTPUT"
        fi
        
        exit 1
    fi
    
    # Set outputs
    echo "status=success" >> "$GITHUB_OUTPUT"
    echo "version=${IMAGE_TAG}" >> "$GITHUB_OUTPUT"
    echo "timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$GITHUB_OUTPUT"
    
    # Get service URL
    local service_url=$(kubectl get service "${APPLICATION}" \
        -n "${ENVIRONMENT}" \
        -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || echo "pending")
    echo "url=${service_url}" >> "$GITHUB_OUTPUT"
    
    log_info "================================================"
    log_info "✅ Deployment completed successfully"
    log_info "================================================"
}

# Execute main function
main "$@"
