# syntax=docker/dockerfile:1.4

FROM node:22-bookworm

# Install system dependencies and tools for development environment
# Includes version control, networking, database clients, and build tools
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
    # Version control and SSH for git operations and remote access
    git \
    openssh-client \
    # Basic utilities for file manipulation, downloads, and system info
    less \
    curl \
    wget \
    ca-certificates \
    gnupg \
    lsb-release \
    # Database clients for connecting to PostgreSQL and Redis during development
    postgresql-client-15 \
    redis-tools \
    # Text editors and terminal multiplexers for development convenience
    vim \
    nano \
    tmux \
    htop \
    # Network debugging tools for troubleshooting connectivity issues
    net-tools \
    iputils-ping \
    dnsutils \
    # Build essentials for compiling native modules and Python support for scripts
    build-essential \
    python3 \
    python3-pip \
    # Additional development tools
    jq \
    unzip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Install global npm packages for development workflow
# Includes package manager, process managers, and development tools
RUN npm install -g \
    npm@latest \
    nodemon \
    pm2 \
    && npm cache clean --force

# Configure non-root user for security (node user already exists in base image)
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Ensure node user has correct UID/GID for file permission consistency
RUN if [ "$USER_GID" != "1000" ] || [ "$USER_UID" != "1000" ]; then \
      groupmod --gid $USER_GID $USERNAME \
      && usermod --uid $USER_UID --gid $USER_GID $USERNAME \
      && chown -R $USER_UID:$USER_GID /home/$USERNAME; \
    fi

# Add user to docker group for Docker-in-Docker functionality
# Docker socket will be mounted with gid 999 typically
RUN groupadd -g 999 docker 2>/dev/null || true \
    && usermod -aG docker $USERNAME

# Create workspace directory with correct permissions for development
RUN mkdir -p /workspaces/political-sphere \
    && chown -R $USERNAME:$USERNAME /workspaces

# Configure git to trust the workspace directory (prevents security warnings)
RUN git config --system --add safe.directory /workspaces/political-sphere

# Set up shell enhancements for better developer experience
RUN echo 'export PS1="\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "' >> /home/$USERNAME/.bashrc \
    && echo 'alias ll="ls -lah"' >> /home/$USERNAME/.bashrc \
    && echo 'alias gs="git status"' >> /home/$USERNAME/.bashrc \
    && echo 'alias gp="git pull"' >> /home/$USERNAME/.bashrc \
    && echo 'alias dc="docker compose"' >> /home/$USERNAME/.bashrc

# Switch to non-root user for security
USER $USERNAME

# Set working directory for the application
WORKDIR /workspaces/political-sphere

# Default command - sleep infinity to keep container running for development
CMD ["sleep", "infinity"]
