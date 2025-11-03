#!/usr/bin/env bash
# Common utilities for DevContainer scripts
# Provides shared functions for logging, error handling, and validation

set -euo pipefail

# Logging functions with consistent formatting
log_info() {
    echo "ℹ️  $1"
}

log_success() {
    echo "✅ $1"
}

log_warning() {
    echo "⚠️  $1"
}

log_error() {
    echo "❌ $1" >&2
}

# Enhanced logging with timestamps (optional)
log_debug() {
    if [ "${DEBUG:-false}" = "true" ]; then
        echo "🐛 $(date '+%Y-%m-%d %H:%M:%S') $1"
    fi
}

# Error handling with cleanup
error_exit() {
    local message="$1"
    local exit_code="${2:-1}"
    log_error "$message"
    exit "$exit_code"
}

# Validate required commands exist
require_command() {
    local cmd="$1"
    if ! command -v "$cmd" &> /dev/null; then
        error_exit "$cmd is required but not found in PATH"
    fi
}

# Validate environment variables
require_env() {
    local var_name="$1"
    if [ -z "${!var_name:-}" ]; then
        error_exit "Environment variable $var_name is required but not set"
    fi
}

# Safe file operations
safe_mkdir() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir" || error_exit "Failed to create directory: $dir"
    fi
}

# Check if running in DevContainer
is_devcontainer() {
    [ -n "${DEVCONTAINER:-}" ] || [ -n "${REMOTE_CONTAINERS:-}" ]
}

# Get workspace root directory
get_workspace_root() {
    # Try common DevContainer environment variables
    if [ -n "${WORKSPACE_FOLDER:-}" ]; then
        echo "$WORKSPACE_FOLDER"
    elif [ -n "${CODESPACE_VSCODE_FOLDER:-}" ]; then
        echo "$CODESPACE_VSCODE_FOLDER"
    else
        # Fallback to current directory
        pwd
    fi
}
