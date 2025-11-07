#!/usr/bin/env bash
# ============================================================================
# Kubernetes Manifest Validation Script
# ============================================================================
# Copyright (c) 2025 Political Sphere. All Rights Reserved.
#
# Version: 1.2.0
# Last Updated: 2025-11-07
# Owner: DevOps Team
#
# Description:
#   Validates Kubernetes manifests for syntax, best practices, and security
#   issues before deployment. Catches configuration errors early.
#
# Tools Used:
#   - kubectl: Basic syntax validation
#   - kubeval: Schema validation against Kubernetes API
#   - kube-score: Best practices and security recommendations
#
# Quality Gates:
#   - YAML syntax validation
#   - Kubernetes API schema validation
#   - Security policy compliance
#   - Resource limits enforcement
#   - Label and annotation standards
#
# Runbooks:
#   - Validation failures: docs/09-observability-and-ops/runbooks/validation-failure.md
#   - Best practices: docs/09-observability-and-ops/runbooks/k8s-best-practices.md
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_PREFIX="[VALIDATE]"
readonly K8S_VERSION="${KUBERNETES_VERSION:-1.29}"  # OPS-02: Configurable K8s version
readonly KUBECTL_TIMEOUT="30s"  # OPS-02: Explicit kubectl timeout

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

validate_yaml_syntax() {
    log_group_start "YAML Syntax Validation"
    
    local manifest_dir="${MANIFEST_DIR:-k8s/${ENVIRONMENT}}"
    local validation_failed=0
    
    log_info "Validating YAML syntax in: ${manifest_dir}"
    
    if [ ! -d "${manifest_dir}" ]; then
        log_warning "Manifest directory not found: ${manifest_dir}"
        log_warning "Skipping YAML validation"
        log_group_end
        return 0
    fi
    
    # Find all YAML files
    while IFS= read -r -d '' file; do
        log_info "Checking: ${file}"
        
        # Use Python to validate YAML (more reliable than other tools)
        if command -v python3 &> /dev/null; then
            if ! python3 -c "import yaml; yaml.safe_load(open('${file}'))" 2>&1; then
                log_error "YAML syntax error in: ${file}"
                validation_failed=1
            fi
        else
            # Fallback to kubectl dry-run
            if ! kubectl apply --dry-run=client -f "${file}" \
                --request-timeout="${KUBECTL_TIMEOUT}" &> /dev/null; then
                log_error "YAML syntax error in: ${file}"
                validation_failed=1
            fi
        fi
    done < <(find "${manifest_dir}" -type f \( -name "*.yaml" -o -name "*.yml" \) -print0)
    
    if [ $validation_failed -eq 0 ]; then
        log_info "✅ YAML syntax validation passed"
    else
        log_error "YAML syntax validation failed"
        log_group_end
        return 1
    fi
    
    log_group_end
    return 0
}

validate_kubernetes_schema() {
    log_group_start "Kubernetes Schema Validation"
    
    local manifest_dir="${MANIFEST_DIR:-k8s/${ENVIRONMENT}}"
    local validation_failed=0
    
    if [ ! -d "${manifest_dir}" ]; then
        log_warning "Manifest directory not found, skipping schema validation"
        log_group_end
        return 0
    fi
    
    log_info "Validating against Kubernetes ${K8S_VERSION} schema..."
    
    # Use kubeval if available
    if command -v kubeval &> /dev/null; then
        if ! kubeval --kubernetes-version "${K8S_VERSION}" \
            --strict \
            --ignore-missing-schemas \
            "${manifest_dir}"/*.yaml "${manifest_dir}"/*.yml 2>/dev/null; then
            
            log_error "Kubernetes schema validation failed"
            validation_failed=1
        fi
    else
        # Fallback to kubectl dry-run
        log_info "kubeval not found, using kubectl dry-run"
        
        while IFS= read -r -d '' file; do
            if ! kubectl apply --dry-run=server -f "${file}" \
                --request-timeout="${KUBECTL_TIMEOUT}" 2>&1 | grep -v "Warning"; then
                log_error "Schema validation failed for: ${file}"
                validation_failed=1
            fi
        done < <(find "${manifest_dir}" -type f \( -name "*.yaml" -o -name "*.yml" \) -print0)
    fi
    
    if [ $validation_failed -eq 0 ]; then
        log_info "✅ Schema validation passed"
    else
        log_error "Schema validation failed"
        log_group_end
        return 1
    fi
    
    log_group_end
    return 0
}

validate_best_practices() {
    log_group_start "Best Practices Validation"
    
    local manifest_dir="${MANIFEST_DIR:-k8s/${ENVIRONMENT}}"
    
    if [ ! -d "${manifest_dir}" ]; then
        log_warning "Manifest directory not found, skipping best practices validation"
        log_group_end
        return 0
    fi
    
    log_info "Checking Kubernetes best practices..."
    
    # Use kube-score if available
    if command -v kube-score &> /dev/null; then
        local score_output
        score_output=$(kube-score score \
            --output-format ci \
            --ignore-test pod-networkpolicy \
            "${manifest_dir}"/*.yaml "${manifest_dir}"/*.yml 2>&1 || true)
        
        if echo "$score_output" | grep -q "CRITICAL"; then
            log_warning "Critical best practice issues found:"
            echo "$score_output" | grep "CRITICAL" || true
        fi
        
        log_info "Best practices check completed"
    else
        log_warning "kube-score not installed, skipping best practices validation"
    fi
    
    log_group_end
    return 0
}

validate_security_policies() {
    log_group_start "Security Policy Validation"
    
    local manifest_dir="${MANIFEST_DIR:-k8s/${ENVIRONMENT}}"
    local validation_failed=0
    
    if [ ! -d "${manifest_dir}" ]; then
        log_warning "Manifest directory not found, skipping security validation"
        log_group_end
        return 0
    fi
    
    log_info "Validating security policies..."
    
    # Check for required security contexts
    while IFS= read -r -d '' file; do
        # Check if file contains Deployment or StatefulSet
        if grep -q "kind: Deployment\|kind: StatefulSet" "${file}"; then
            log_info "Checking security context in: $(basename "${file}")"
            
            # Verify security context is set
            if ! grep -q "securityContext:" "${file}"; then
                log_warning "Missing securityContext in: ${file}"
                log_warning "Consider adding Pod and Container security contexts"
            fi
            
            # Check for resource limits
            if ! grep -q "resources:" "${file}"; then
                log_error "Missing resource limits in: ${file}"
                log_error "Resource requests and limits are required"
                validation_failed=1
            fi
            
            # Check for non-root user
            if grep -q "runAsNonRoot: true" "${file}"; then
                log_info "✅ Running as non-root user"
            else
                log_warning "Consider running containers as non-root user"
            fi
            
            # Check for read-only root filesystem
            if grep -q "readOnlyRootFilesystem: true" "${file}"; then
                log_info "✅ Read-only root filesystem enabled"
            else
                log_warning "Consider enabling read-only root filesystem"
            fi
        fi
    done < <(find "${manifest_dir}" -type f \( -name "*.yaml" -o -name "*.yml" \) -print0)
    
    if [ $validation_failed -eq 0 ]; then
        log_info "✅ Security policy validation passed"
    else
        log_error "Security policy validation failed"
        log_group_end
        return 1
    fi
    
    log_group_end
    return 0
}

validate_labels_annotations() {
    log_group_start "Labels and Annotations Validation"
    
    local manifest_dir="${MANIFEST_DIR:-k8s/${ENVIRONMENT}}"
    local validation_failed=0
    
    if [ ! -d "${manifest_dir}" ]; then
        log_warning "Manifest directory not found, skipping label validation"
        log_group_end
        return 0
    fi
    
    log_info "Validating required labels and annotations..."
    
    # Required labels for all resources
    local required_labels=(
        "app.kubernetes.io/name"
        "app.kubernetes.io/instance"
        "app.kubernetes.io/version"
        "app.kubernetes.io/component"
        "app.kubernetes.io/part-of"
        "app.kubernetes.io/managed-by"
    )
    
    while IFS= read -r -d '' file; do
        log_info "Checking labels in: $(basename "${file}")"
        
        # Check for required labels
        for label in "${required_labels[@]}"; do
            if ! grep -q "${label}:" "${file}"; then
                log_warning "Missing recommended label '${label}' in: ${file}"
            fi
        done
        
        # Check for environment label
        if ! grep -q "environment: ${ENVIRONMENT}" "${file}"; then
            log_warning "Missing environment label in: ${file}"
        fi
    done < <(find "${manifest_dir}" -type f \( -name "*.yaml" -o -name "*.yml" \) -print0)
    
    log_info "✅ Label validation completed"
    log_group_end
    return 0
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    log_info "================================================"
    log_info "Kubernetes Manifest Validation"
    log_info "================================================"
    log_info "Environment: ${ENVIRONMENT:-unknown}"
    log_info "Application: ${APP_NAME:-unknown}"
    log_info "Kubernetes Version: ${K8S_VERSION}"
    log_info "================================================"
    
    local validation_failed=0
    
    # Run all validations
    validate_yaml_syntax || validation_failed=1
    validate_kubernetes_schema || validation_failed=1
    validate_best_practices || true  # Don't fail on best practice warnings
    validate_security_policies || validation_failed=1
    validate_labels_annotations || true  # Don't fail on missing labels
    
    if [ $validation_failed -eq 0 ]; then
        log_info "================================================"
        log_info "✅ All validations passed"
        log_info "================================================"
        exit 0
    else
        log_error "================================================"
        log_error "❌ Validation failed"
        log_error "================================================"
        exit 1
    fi
}

# Execute main function
main "$@"
