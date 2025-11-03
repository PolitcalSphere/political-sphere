#!/usr/bin/env bash
# Install developer tools inside the Dev Container (pnpm via corepack, Nx CLI optional)
# - Uses corepack when available (preferred)
# - Falls back to global npm install if needed
# - Idempotent and safe to re-run

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

log_info "Installing developer tools (pnpm, nx CLI optional)..."

# Ensure corepack is available and enabled (Node 16+)
if command -v corepack >/dev/null 2>&1; then
  log_info "Enabling corepack..."
  corepack enable || log_warning "corepack enable failed (continuing)"
  # Prepare a recent pnpm; version can be adjusted if project requires specific major
  PNPM_VERSION="9.12.0"
  log_info "Preparing pnpm@${PNPM_VERSION} with corepack..."
  if corepack prepare "pnpm@${PNPM_VERSION}" --activate; then
    log_success "pnpm installed via corepack"
  else
    log_warning "corepack prepare failed, falling back to global npm install"
    npm i -g "pnpm@${PNPM_VERSION}" || log_error "Failed to install pnpm globally"
  fi
else
  log_warning "corepack not found; installing pnpm globally"
  npm i -g pnpm@9 || log_error "Failed to install pnpm globally"
fi

# Optional: install Nx CLI globally for nicer DX (npx nx still works without this)
if ! command -v nx >/dev/null 2>&1; then
  log_info "Installing Nx CLI globally for convenience..."
  npm i -g nx@^22 || log_warning "Failed to install nx globally (npx nx will still work)"
else
  log_info "Nx CLI already available"
fi

# Print versions
log_info "Tool versions:"
node -v | sed 's/^/  Node: /'
npm -v | sed 's/^/  npm: /'
if command -v pnpm >/dev/null 2>&1; then pnpm -v | sed 's/^/  pnpm: /'; else echo "  pnpm: not found"; fi
if command -v nx >/dev/null 2>&1; then nx --version | sed 's/^/  nx: /'; else echo "  nx: not found"; fi

log_success "Developer tools installation complete"
