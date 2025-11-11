# =============================================================================
# Development Container for Political Sphere
# 
# Multi-stage build following OWASP Docker Security Best Practices
# Base image: Microsoft's official TypeScript-Node devcontainer (Debian Bookworm)
# Additional tools installed via devcontainer.json features for maintainability
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base image with system dependencies
# -----------------------------------------------------------------------------
FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm@sha256:49698b6eae8a476ebfe37652b03a415d66f4e7ea8e1f8253a46b7a7836fe59ef AS base

# Set shell options for security and error handling (OWASP Docker Best Practice)
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Metadata labels (OCI standard)
LABEL org.opencontainers.image.title="Political Sphere Dev Container"
LABEL org.opencontainers.image.description="Development environment for Political Sphere multiplayer political simulation"
LABEL org.opencontainers.image.vendor="Political Sphere Project"
LABEL org.opencontainers.image.licenses="SEE LICENSE FILE"
LABEL maintainer="Political Sphere Development Team"

# Install additional system dependencies in a single layer
# hadolint ignore=DL3008
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
        # Build essentials for native modules (node-gyp)
        build-essential \
        python3 \
        python3-pip \
        # Git for version control
        git \
        git-lfs \
        # SSL/TLS certificates
        ca-certificates \
        # Network utilities
        curl \
        wget \
        # Text editors and utilities
        vim \
        nano \
        less \
        jq \
        # Process management
        procps \
        # Security tools
        gnupg \
        # For accessibility testing
        chromium \
    # Clean up to reduce image size (Docker best practice)
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# -----------------------------------------------------------------------------
# Stage 2: Development environment configuration
# -----------------------------------------------------------------------------
FROM base AS development

# Configure git for container use (secure defaults)
RUN git config --system core.autocrlf input \
    && git config --system init.defaultBranch main \
    && git config --system pull.rebase false \
    && git config --system user.useConfigOnly true

# Set up non-root user workspace (OWASP Rule #3: Set a non-root user)
USER node
WORKDIR /workspaces

# Create necessary directories with correct permissions
RUN mkdir -p /home/node/.npm /home/node/.cache \
    && chown -R node:node /home/node/.npm /home/node/.cache

# Environment variables (12-factor app pattern)
ENV NODE_ENV=development \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Health check for development container
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node --version || exit 1

# Note: Dependencies are installed via devcontainer.json lifecycle commands
# Note: Docker, kubectl, Helm, Terraform, AWS CLI are installed via devcontainer.json features
# Note: This approach keeps the Dockerfile lean and leverages Dev Container Features

# Default command (overridden by docker-compose)
CMD ["/bin/bash"]
