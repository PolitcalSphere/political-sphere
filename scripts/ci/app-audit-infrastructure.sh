#!/usr/bin/env bash
# App Audit: Infrastructure as Code
# Version: 1.0.0
# Generated: 2025-11-08

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/app-audit-base.sh"

APP_NAME="infrastructure"
APP_DIR="${PROJECT_ROOT}/apps/infrastructure"

# Override security phase for IaC-specific checks
phase3_security() {
    log_section "Phase 3: Infrastructure Security (IaC)"
    
    log_info "Running Infrastructure as Code security checks..."
    
    # Terraform security checks
    if [[ -d "${APP_DIR}/terraform" ]]; then
        log_info "Checking Terraform configurations..."
        
        # Check for hardcoded secrets
        if grep -r -E "(password|secret|key).*=.*['\"][^'\"]+['\"]" "${APP_DIR}/terraform" 2>/dev/null | \
           grep -v "var\.\|data\.\|random_" > "${APP_AUDIT_DIR}/tf-secrets.log" 2>&1; then
            SECRET_COUNT=$(wc -l < "${APP_AUDIT_DIR}/tf-secrets.log" | tr -d ' ')
            if [[ ${SECRET_COUNT} -gt 0 ]]; then
                log_critical "Found ${SECRET_COUNT} potential hardcoded secrets in Terraform (CIS 5.1)"
                log_info "Use variables, data sources, or secret managers. See ${APP_AUDIT_DIR}/tf-secrets.log"
            fi
        else
            log_pass "No hardcoded secrets in Terraform"
        fi
        
        # Check for state backend configuration
        if grep -r "backend.*\"s3\"\|backend.*\"azurerm\"\|backend.*\"gcs\"" "${APP_DIR}/terraform" 2>/dev/null > /dev/null; then
            log_pass "Remote state backend configured"
        else
            log_high "No remote state backend - state may be unencrypted (CIS 8.1)"
        fi
        
        # Check for encryption at rest
        if ! grep -r "encryption\|kms\|server_side_encryption" "${APP_DIR}/terraform" 2>/dev/null > /dev/null; then
            log_medium "Verify encryption at rest is enabled (NIST SC-28)"
        else
            log_pass "Encryption configuration found"
        fi
        
        # tfsec integration
        if command -v tfsec &> /dev/null; then
            log_info "Running tfsec security scanner..."
            if tfsec "${APP_DIR}/terraform" --format json > "${APP_AUDIT_DIR}/tfsec-results.json" 2>&1; then
                log_pass "tfsec: No security issues found"
            else
                ISSUE_COUNT=$(jq -r '.results | length' "${APP_AUDIT_DIR}/tfsec-results.json" 2>/dev/null || echo "0")
                log_high "tfsec found ${ISSUE_COUNT} security issues"
                log_info "See ${APP_AUDIT_DIR}/tfsec-results.json"
            fi
        else
            log_info "tfsec not installed (brew install tfsec recommended)"
        fi
    fi
    
    # Kubernetes security checks
    if [[ -d "${APP_DIR}/kubernetes" ]] || [[ -d "${APP_DIR}/k8s" ]]; then
        log_info "Checking Kubernetes manifests..."
        
        K8S_DIR="${APP_DIR}/kubernetes"
        [[ ! -d "$K8S_DIR" ]] && K8S_DIR="${APP_DIR}/k8s"
        
        # Check for privileged containers
        if grep -r "privileged.*true" "$K8S_DIR" 2>/dev/null > "${APP_AUDIT_DIR}/k8s-privileged.log" 2>&1; then
            log_critical "Privileged containers detected (CIS 5.2.1)"
            log_info "See ${APP_AUDIT_DIR}/k8s-privileged.log"
        else
            log_pass "No privileged containers"
        fi
        
        # Check for hostPath volumes
        if grep -r "hostPath:" "$K8S_DIR" 2>/dev/null > "${APP_AUDIT_DIR}/k8s-hostpath.log" 2>&1; then
            log_high "hostPath volumes detected - security risk (CIS 5.2.4)"
            log_info "See ${APP_AUDIT_DIR}/k8s-hostpath.log"
        else
            log_pass "No hostPath volumes"
        fi
        
        # Check for missing resource limits
        if grep -r "kind: Pod\|kind: Deployment" "$K8S_DIR" 2>/dev/null | while read -r line; do
            if ! grep -A 20 "$line" "$K8S_DIR"/*.yaml 2>/dev/null | grep -q "resources:"; then
                echo "$line"
            fi
        done > "${APP_AUDIT_DIR}/k8s-no-limits.log" 2>&1; then
            LIMIT_COUNT=$(wc -l < "${APP_AUDIT_DIR}/k8s-no-limits.log" | tr -d ' ')
            if [[ ${LIMIT_COUNT} -gt 0 ]]; then
                log_medium "Found ${LIMIT_COUNT} pods without resource limits (CIS 5.2.12)"
            fi
        fi
        
        # Check for network policies
        if ! grep -r "kind: NetworkPolicy" "$K8S_DIR" 2>/dev/null > /dev/null; then
            log_medium "No NetworkPolicies found - consider adding (CIS 5.3.2, NIST SC-7)"
        else
            log_pass "NetworkPolicies configured"
        fi
        
        # kubesec integration
        if command -v kubesec &> /dev/null; then
            log_info "Running kubesec scanner..."
            kubesec scan "$K8S_DIR"/*.yaml > "${APP_AUDIT_DIR}/kubesec-results.json" 2>&1 || true
            log_info "See ${APP_AUDIT_DIR}/kubesec-results.json for kubesec analysis"
        fi
    fi
    
    # Docker security checks
    if find "${APP_DIR}" -name "Dockerfile*" 2>/dev/null | grep -q .; then
        log_info "Checking Dockerfiles..."
        
        for dockerfile in $(find "${APP_DIR}" -name "Dockerfile*" 2>/dev/null); do
            local basename_dockerfile=$(basename "$dockerfile")
            
            # Check for latest tag
            if grep -q "FROM.*:latest" "$dockerfile"; then
                log_high "${basename_dockerfile}: Uses :latest tag (CIS 4.1)"
            else
                log_pass "${basename_dockerfile}: No :latest tags"
            fi
            
            # Check for root user
            if ! grep -q "USER" "$dockerfile"; then
                log_high "${basename_dockerfile}: Runs as root (CIS 4.1, NIST AC-6)"
            else
                log_pass "${basename_dockerfile}: Non-root user configured"
            fi
            
            # Check for HEALTHCHECK
            if ! grep -q "HEALTHCHECK" "$dockerfile"; then
                log_low "${basename_dockerfile}: No HEALTHCHECK directive (CIS 4.6)"
            else
                log_pass "${basename_dockerfile}: HEALTHCHECK configured"
            fi
        done
        
        # hadolint already run in base phase
    fi
    
    log_pass "Infrastructure security checks complete"
}

# Override testing for IaC validation
phase4_testing() {
    log_section "Phase 4: Infrastructure Validation"
    
    # Terraform validation
    if [[ -d "${APP_DIR}/terraform" ]]; then
        if command -v terraform &> /dev/null; then
            log_info "Running terraform validate..."
            cd "${APP_DIR}/terraform"
            if terraform init -backend=false > "${APP_AUDIT_DIR}/tf-init.log" 2>&1; then
                if terraform validate > "${APP_AUDIT_DIR}/tf-validate.log" 2>&1; then
                    log_pass "Terraform validation passed"
                else
                    log_high "Terraform validation failed - see ${APP_AUDIT_DIR}/tf-validate.log"
                fi
            else
                log_medium "Terraform init failed - see ${APP_AUDIT_DIR}/tf-init.log"
            fi
            cd - > /dev/null
        else
            log_info "terraform not installed - skipping validation"
        fi
    fi
    
    # Kubernetes validation
    if [[ -d "${APP_DIR}/kubernetes" ]] || [[ -d "${APP_DIR}/k8s" ]]; then
        K8S_DIR="${APP_DIR}/kubernetes"
        [[ ! -d "$K8S_DIR" ]] && K8S_DIR="${APP_DIR}/k8s"
        
        if command -v kubectl &> /dev/null; then
            log_info "Running kubectl dry-run validation..."
            for manifest in "$K8S_DIR"/*.yaml; do
                [[ -f "$manifest" ]] || continue
                if kubectl apply --dry-run=client -f "$manifest" > "${APP_AUDIT_DIR}/k8s-validate.log" 2>&1; then
                    log_pass "$(basename "$manifest"): Valid manifest"
                else
                    log_high "$(basename "$manifest"): Invalid manifest"
                fi
            done
        else
            log_info "kubectl not installed - skipping validation"
        fi
    fi
}

# Run the standard audit (will call our overridden phases)
# The base script defines these, we call them in order
main() {
    phase1_environment
    phase2_code_quality
    phase3_security
    phase4_testing
    phase5_dependencies
    phase6_summary
}

main "$@"
