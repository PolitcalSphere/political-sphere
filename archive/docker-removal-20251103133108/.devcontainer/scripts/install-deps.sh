

#!/usr/bin/env bash
# Robust dependency installation for Dev Container
# - Skips when node_modules already populated
# - Prefers npm ci; falls back to npm install on lock issues
# - Avoids audit/network noise for speed
# - Includes error handling and logging

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Work in the workspace root (Dev Container sets CWD there)
ROOT_DIR=$(pwd)

# Fast-path: if node_modules exists and is populated, skip
if [ -d "$ROOT_DIR/node_modules" ]; then
  count=$(ls -1 "$ROOT_DIR/node_modules" | wc -l | tr -d ' ' || echo 0)
  if [ "$count" -gt 100 ]; then
    log_success "node_modules already present ($count entries) — skipping install"
    exit 0
  fi
fi

HAS_LOCKFILE=0
if [ -f "$ROOT_DIR/package-lock.json" ]; then
  HAS_LOCKFILE=1
fi

run_npm_ci() {
  log_info "Running: npm ci --prefer-offline --no-audit"
  if npm ci --prefer-offline --no-audit; then
    log_success "npm ci succeeded"
    return 0
  else
    log_warning "npm ci failed, attempting fallback..."
    return 1
  fi
}

run_npm_install() {
  log_info "Running: npm install --no-audit"
  if npm install --no-audit; then
    log_success "npm install succeeded"
    return 0
  else
    log_error "npm install also failed"
    return 1
  fi
}

run_npm_install_legacy() {
  log_info "Running: npm install --no-audit --legacy-peer-deps"
  if npm install --no-audit --legacy-peer-deps; then
    log_success "npm install (legacy peer deps) succeeded"
    return 0
  else
    log_error "npm install (legacy peer deps) failed"
    return 1
  fi
}

# Strategy:
# - If lockfile exists, try npm ci first; else skip straight to install.
# - On install failure, retry with --legacy-peer-deps to handle strict peer conflicts.
if [ "$HAS_LOCKFILE" -eq 1 ]; then
  if run_npm_ci; then
    log_success "npm ci completed successfully"
    exit 0
  else
    log_warning "npm ci failed — attempting npm install fallback"
  fi
else
  log_info "No package-lock.json present — skipping npm ci"
fi

if run_npm_install; then
  log_success "npm install completed"
  exit 0
fi

log_warning "npm install failed — attempting with --legacy-peer-deps"
if run_npm_install_legacy; then
  log_success "npm install completed with legacy peer deps"
  exit 0
fi

log_error "Dependency installation failed after multiple attempts. Printing debug information:"
npm -v || log_warning "npm version unavailable"
node -v || log_warning "node version unavailable"
npm config get legacy-peer-deps || true
# Show last error log if present
last_log=$(ls -t /home/node/.npm/_logs/* 2>/dev/null | head -n1 || true)
if [ -n "$last_log" ] && [ -f "$last_log" ]; then
  log_info "--- Begin npm log ($last_log) tail ---"
  tail -n 100 "$last_log" || log_warning "Could not read log file"
  log_info "--- End npm log tail ---"
fi
exit 1
