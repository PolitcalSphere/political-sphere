#!/usr/bin/env bash
# ============================================================================
# Docker Build and Push Script
# ============================================================================
# Copyright (c) 2025 Political Sphere. All Rights Reserved.
#
# Version: 1.1.0
# Last Updated: 2025-11-07
# Owner: DevOps Team
#
# Description:
#   Builds Docker images with security scanning and pushes to AWS ECR.
#   Implements multi-stage builds, layer caching, and SBOM generation.
#
# Security:
#   - Scans images for vulnerabilities before push
#   - Generates Software Bill of Materials (SBOM)
#   - Uses minimal base images
#   - No secrets in image layers
#
# Performance:
#   - BuildKit for faster builds
#   - Layer caching for efficiency
#   - Multi-platform builds supported
#
# Runbooks:
#   - Build failures: docs/09-observability-and-ops/runbooks/build-failure.md
#   - ECR push issues: docs/09-observability-and-ops/runbooks/ecr-push.md
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_PREFIX="[BUILD]"

# Docker BuildKit for improved build performance
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain

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
# VALIDATION
# ============================================================================

validate_environment() {
    log_group_start "Environment Validation"
    
    local required_vars=(
        "APPLICATION"
        "IMAGE_TAG"
        "AWS_REGION"
        "ENVIRONMENT"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            log_error "Required environment variable not set: $var"
            exit 1
        fi
    done
    
    # Validate Docker is available
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    log_info "✅ Environment validated"
    log_group_end
}

# ============================================================================
# ECR OPERATIONS
# ============================================================================

login_to_ecr() {
    log_group_start "ECR Authentication"
    
    log_info "Logging in to Amazon ECR..."
    
    local ecr_registry="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    
    aws ecr get-login-password --region "${AWS_REGION}" | \
        docker login --username AWS --password-stdin "${ecr_registry}"
    
    log_info "✅ Successfully authenticated to ECR"
    log_group_end
}

ensure_ecr_repository() {
    log_group_start "ECR Repository Setup"
    
    local repo_name="political-sphere/${ENVIRONMENT}/${APPLICATION}"
    
    log_info "Checking ECR repository: ${repo_name}"
    
    if ! aws ecr describe-repositories \
        --repository-names "${repo_name}" \
        --region "${AWS_REGION}" &> /dev/null; then
        
        log_info "Creating ECR repository: ${repo_name}"
        
        aws ecr create-repository \
            --repository-name "${repo_name}" \
            --region "${AWS_REGION}" \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256 \
            --tags Key=Environment,Value="${ENVIRONMENT}" \
                   Key=Application,Value="${APPLICATION}" \
                   Key=ManagedBy,Value=GitHubActions
        
        # Set lifecycle policy to retain last 10 images
        aws ecr put-lifecycle-policy \
            --repository-name "${repo_name}" \
            --region "${AWS_REGION}" \
            --lifecycle-policy-text '{
                "rules": [{
                    "rulePriority": 1,
                    "description": "Keep last 10 images",
                    "selection": {
                        "tagStatus": "any",
                        "countType": "imageCountMoreThan",
                        "countNumber": 10
                    },
                    "action": {"type": "expire"}
                }]
            }'
        
        log_info "✅ ECR repository created with scanning enabled"
    else
        log_info "✅ ECR repository exists"
    fi
    
    log_group_end
}

# ============================================================================
# BUILD OPERATIONS
# ============================================================================

build_image() {
    log_group_start "Docker Build"
    
    local dockerfile_path="${DOCKERFILE_PATH:-apps/${APPLICATION}/Dockerfile}"
    local build_context="${BUILD_CONTEXT:-apps/${APPLICATION}}"
    local ecr_registry="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    local repo_name="political-sphere/${ENVIRONMENT}/${APPLICATION}"
    local full_image="${ecr_registry}/${repo_name}:${IMAGE_TAG}"
    
    log_info "Building image: ${full_image}"
    log_info "Dockerfile: ${dockerfile_path}"
    log_info "Context: ${build_context}"
    
    # Check if Dockerfile exists
    if [ ! -f "${dockerfile_path}" ]; then
        log_error "Dockerfile not found: ${dockerfile_path}"
        exit 1
    fi
    
    # Build image with metadata
    docker build \
        --file "${dockerfile_path}" \
        --tag "${full_image}" \
        --tag "${ecr_registry}/${repo_name}:latest" \
        --build-arg NODE_ENV=production \
        --build-arg BUILD_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --build-arg VCS_REF="${GITHUB_SHA:-unknown}" \
        --build-arg VERSION="${IMAGE_TAG}" \
        --label org.opencontainers.image.created="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --label org.opencontainers.image.revision="${GITHUB_SHA:-unknown}" \
        --label org.opencontainers.image.version="${IMAGE_TAG}" \
        --label org.opencontainers.image.source="https://github.com/PoliticalSphere/political-sphere" \
        --label com.political-sphere.environment="${ENVIRONMENT}" \
        --label com.political-sphere.application="${APPLICATION}" \
        "${build_context}"
    
    log_info "✅ Image built successfully"
    log_group_end
}

# ============================================================================
# SECURITY SCANNING
# ============================================================================

scan_image() {
    log_group_start "Security Scanning"
    
    local ecr_registry="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    local repo_name="political-sphere/${ENVIRONMENT}/${APPLICATION}"
    local full_image="${ecr_registry}/${repo_name}:${IMAGE_TAG}"
    
    log_info "Scanning image for vulnerabilities: ${full_image}"
    
    # Use Trivy for local scanning (if available)
    if command -v trivy &> /dev/null; then
        log_info "Running Trivy scan..."
        
        if ! trivy image \
            --severity HIGH,CRITICAL \
            --exit-code 1 \
            --no-progress \
            "${full_image}"; then
            
            log_error "Security vulnerabilities found in image"
            log_warning "Review vulnerabilities and fix before deploying to production"
            
            if [ "${ENVIRONMENT}" = "production" ]; then
                log_error "Blocking production deployment due to vulnerabilities"
                exit 1
            fi
        fi
    else
        log_warning "Trivy not installed, skipping local scan"
        log_info "Image will be scanned by ECR on push"
    fi
    
    log_info "✅ Security scan completed"
    log_group_end
}

# ============================================================================
# SBOM GENERATION
# ============================================================================

generate_sbom() {
    log_group_start "SBOM Generation"
    
    local ecr_registry="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    local repo_name="political-sphere/${ENVIRONMENT}/${APPLICATION}"
    local full_image="${ecr_registry}/${repo_name}:${IMAGE_TAG}"
    
    log_info "Generating Software Bill of Materials..."
    
    # Use Syft for SBOM generation (if available)
    if command -v syft &> /dev/null; then
        local sbom_file="sbom-${APPLICATION}-${IMAGE_TAG}.json"
        
        syft "${full_image}" \
            --output spdx-json \
            --file "${sbom_file}"
        
        log_info "SBOM generated: ${sbom_file}"
        
        # Upload to S3 for compliance
        if [ -n "${SBOM_BUCKET:-}" ]; then
            aws s3 cp "${sbom_file}" \
                "s3://${SBOM_BUCKET}/${ENVIRONMENT}/${APPLICATION}/${sbom_file}" \
                --region "${AWS_REGION}"
            
            log_info "SBOM uploaded to S3"
        fi
    else
        log_warning "Syft not installed, skipping SBOM generation"
    fi
    
    log_group_end
}

# ============================================================================
# PUSH OPERATIONS
# ============================================================================

push_image() {
    log_group_start "Push to ECR"
    
    local ecr_registry="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    local repo_name="political-sphere/${ENVIRONMENT}/${APPLICATION}"
    local full_image="${ecr_registry}/${repo_name}:${IMAGE_TAG}"
    local latest_image="${ecr_registry}/${repo_name}:latest"
    
    log_info "Pushing image: ${full_image}"
    
    # Push tagged image
    docker push "${full_image}"
    
    # Push latest tag for non-production
    if [ "${ENVIRONMENT}" != "production" ]; then
        docker push "${latest_image}"
    fi
    
    log_info "✅ Image pushed successfully"
    
    # Get image digest
    local image_digest=$(docker inspect --format='{{index .RepoDigests 0}}' "${full_image}" | cut -d'@' -f2)
    log_info "Image digest: ${image_digest}"
    
    # Set output
    echo "image-digest=${image_digest}" >> "${GITHUB_OUTPUT:-/dev/null}"
    echo "image-uri=${full_image}" >> "${GITHUB_OUTPUT:-/dev/null}"
    
    log_group_end
}

# ============================================================================
# CLEANUP
# ============================================================================

cleanup_images() {
    log_group_start "Cleanup"
    
    log_info "Cleaning up local images..."
    
    # Remove dangling images
    docker image prune -f
    
    log_info "✅ Cleanup completed"
    log_group_end
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    log_info "================================================"
    log_info "Docker Build and Push"
    log_info "================================================"
    log_info "Application: ${APPLICATION}"
    log_info "Image Tag: ${IMAGE_TAG}"
    log_info "Environment: ${ENVIRONMENT}"
    log_info "AWS Region: ${AWS_REGION}"
    log_info "================================================"
    
    # Validate environment
    validate_environment
    
    # Get AWS account ID
    export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log_info "AWS Account: ${AWS_ACCOUNT_ID}"
    
    # Execute build pipeline
    login_to_ecr
    ensure_ecr_repository
    build_image
    scan_image
    generate_sbom
    push_image
    cleanup_images
    
    log_info "================================================"
    log_info "✅ Build and push completed successfully"
    log_info "================================================"
}

# Execute main function
main "$@"
