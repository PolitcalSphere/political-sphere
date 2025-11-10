# Development Container for Political Sphere
# Uses official Microsoft TypeScript-Node devcontainer as base
# Additional tools (Docker, kubectl, Helm) are installed via devcontainer.json features

FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

# Set shell options for security and error handling
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install additional system dependencies
# hadolint ignore=DL3008
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
        # Build essentials for native modules
        build-essential \
        python3 \
        # Git for version control
        git \
        # SSL certificates
        ca-certificates \
        # Utilities
        curl \
        wget \
        vim \
        less \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Configure git for container use
RUN git config --system core.autocrlf input \
    && git config --system init.defaultBranch main

# Set up non-root user workspace
USER node
WORKDIR /workspaces

# Note: Dependencies are installed via devcontainer.json lifecycle commands
# Note: Docker, kubectl, and Helm are installed via devcontainer.json features
