#!/usr/bin/env bash
# Security scanning script for Dev Container
# Runs Trivy vulnerability scans on container images

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

log_info "🔒 Running security scans..."

# Check if Trivy is available
if ! command -v trivy &> /dev/null; then
    log_warning "Trivy not found. Installing..."
    # Install Trivy (assuming we're in a container with apt)
    if curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin; then
        log_success "Trivy installed successfully"
    else
        log_error "Failed to install Trivy"
        exit 1
    fi
fi

# Scan the dev container image
# Use IMAGE_NAME env var, or derive from current container if running in devcontainer
if [ -z "${IMAGE_NAME:-}" ]; then
    # Try to get image name from current container
    if [ -n "${HOSTNAME:-}" ] && docker inspect "$HOSTNAME" &>/dev/null; then
        IMAGE_NAME=$(docker inspect "$HOSTNAME" --format='{{.Config.Image}}' 2>/dev/null || echo "political-sphere-dev")
    else
        IMAGE_NAME="political-sphere-dev"
    fi
fi

log_info "🛡️  Scanning container image: $IMAGE_NAME"
if trivy image --severity CRITICAL,HIGH --exit-code 1 "$IMAGE_NAME" 2>/dev/null; then
    log_success "Security scan passed"
else
    log_error "Security vulnerabilities found!"
    log_info "Review the scan results above and address critical/high severity issues"
    exit 1
fi

log_success "Security scan complete"
