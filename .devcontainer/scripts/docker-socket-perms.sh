#!/usr/bin/env bash
# Adjust Docker socket group permissions for the current user inside the Dev Container.
# Detects the GID of /var/run/docker.sock, creates a matching group if needed,
# and adds the current user to it. Requires a new login/terminal to take effect.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

SOCK="/var/run/docker.sock"
USER_NAME="${USER:-node}"

if [ ! -S "$SOCK" ]; then
  log_warning "Docker socket not found at $SOCK. If using Docker-in-Docker, ensure the feature is enabled or mount the host socket."
  exit 0
fi

# Portable way to get GID: use stat across GNU/BSD
get_gid() {
  if stat -c %g "$SOCK" >/dev/null 2>&1; then
    stat -c %g "$SOCK"
  else
    stat -f %g "$SOCK"
  fi
}

SOCK_GID="$(get_gid)"
log_info "Detected docker.sock GID: ${SOCK_GID}"

# Special-case: GID 0 (root) is not a safe/usable target for non-root membership without elevated perms.
# In compose-based devcontainers, Docker access from inside the container is optional; manage services from host.
if [ "$SOCK_GID" = "0" ]; then
  log_info "docker.sock is owned by root (GID 0). Skipping group modification for safety."
  log_warning "If you need Docker inside the container, consider enabling Docker-in-Docker or run commands from host."
  exit 0
fi

# Find group name for this GID if it exists
GROUP_NAME=$(getent group "$SOCK_GID" 2>/dev/null | cut -d: -f1 || true)
if [ -z "${GROUP_NAME:-}" ]; then
  GROUP_NAME="dockersock"
  log_info "Creating group '$GROUP_NAME' with GID $SOCK_GID"
  if command -v sudo >/dev/null 2>&1; then
    sudo groupadd -g "$SOCK_GID" "$GROUP_NAME" 2>/dev/null || {
      log_warning "Failed to create group with GID $SOCK_GID (may already exist under a different name)"
      GROUP_NAME=$(getent group "$SOCK_GID" | cut -d: -f1 || echo "docker")
    }
  elif [ "$(id -u)" -eq 0 ]; then
    groupadd -g "$SOCK_GID" "$GROUP_NAME" 2>/dev/null || {
      log_warning "Failed to create group with GID $SOCK_GID (may already exist under a different name)"
      GROUP_NAME=$(getent group "$SOCK_GID" | cut -d: -f1 || echo "docker")
    }
  else
    log_warning "Cannot create group without elevated privileges. Rebuild container or add a sudo step."
  fi
else
  log_info "Found existing group '$GROUP_NAME' for GID $SOCK_GID"
fi

# Add user to the group if not already a member
if id -nG "$USER_NAME" | tr ' ' '\n' | grep -qx "$GROUP_NAME"; then
  log_info "User '$USER_NAME' already in group '$GROUP_NAME'"
else
  log_info "Adding '$USER_NAME' to group '$GROUP_NAME'"
  if command -v sudo >/dev/null 2>&1; then
    sudo usermod -aG "$GROUP_NAME" "$USER_NAME" || log_warning "Failed to add user to docker group; try running with elevated permissions"
  elif [ "$(id -u)" -eq 0 ]; then
    usermod -aG "$GROUP_NAME" "$USER_NAME" || log_warning "Failed to add user to docker group as root"
  else
    log_warning "Cannot modify user groups without elevated privileges."
  fi
  log_warning "Group membership changes require a new shell to take effect. Please reload window or open a new terminal."
fi

# Quick test (non-fatal)
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    log_success "Docker daemon is accessible"
  else
    log_warning "Docker still not accessible. After reloading the window, run: docker info"
  fi
else
  log_warning "Docker CLI not found in PATH"
fi
