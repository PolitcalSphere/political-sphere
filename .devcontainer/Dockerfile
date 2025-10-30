# syntax=docker/dockerfile:1.4

FROM node:22-bookworm

# Install system dependencies and tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    openssh-client \
    less \
    curl \
    wget \
    ca-certificates \
    gnupg \
    lsb-release \
    # Database clients
    postgresql-client-15 \
    redis-tools \
    # Development tools
    vim \
    nano \
    tmux \
    htop \
    net-tools \
    iputils-ping \
    dnsutils \
    # Build essentials for native modules
    build-essential \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install global npm packages for development
RUN npm install -g \
    npm@latest \
    nodemon \
    pm2 \
    && npm cache clean --force

# Configure non-root user (node user already exists in node image)
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

# Ensure node user has correct UID/GID
RUN if [ "$USER_GID" != "1000" ] || [ "$USER_UID" != "1000" ]; then \
      groupmod --gid $USER_GID $USERNAME \
      && usermod --uid $USER_UID --gid $USER_GID $USERNAME \
      && chown -R $USER_UID:$USER_GID /home/$USERNAME; \
    fi

# Give docker group access (for Docker-in-Docker)
# Docker socket will be mounted with gid 999 typically
RUN groupadd -g 999 docker 2>/dev/null || true \
    && usermod -aG docker $USERNAME

# Create workspace directory with correct permissions
RUN mkdir -p /workspaces/political-sphere \
    && chown -R $USERNAME:$USERNAME /workspaces

# Configure git to trust the workspace directory
RUN git config --system --add safe.directory /workspaces/political-sphere

# Set up shell enhancements for better DX
RUN echo 'export PS1="\[\033[01;32m\]\u@\h\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "' >> /home/$USERNAME/.bashrc \
    && echo 'alias ll="ls -lah"' >> /home/$USERNAME/.bashrc \
    && echo 'alias gs="git status"' >> /home/$USERNAME/.bashrc \
    && echo 'alias gp="git pull"' >> /home/$USERNAME/.bashrc \
    && echo 'alias dc="docker compose"' >> /home/$USERNAME/.bashrc

# Switch to non-root user
USER $USERNAME

# Set working directory
WORKDIR /workspaces/political-sphere

# Default command (sleep infinity for devcontainer)
CMD ["sleep", "infinity"]
