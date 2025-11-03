#!/usr/bin/env bash
# Debug script for VS Code extension issues in DevContainer
# Helps troubleshoot extension loading problems

set -euo pipefail

# Source common utilities if available
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/common.sh" ]; then
    source "$SCRIPT_DIR/common.sh"
else
    # Fallback logging functions
    log_info() { echo "ℹ️  $*"; }
    log_success() { echo "✅ $*"; }
    log_warning() { echo "⚠️  $*"; }
    log_error() { echo "❌ $*"; }
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  VS Code Extension Debugging Tool                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in a VS Code environment
if [ -z "${VSCODE_IPC_HOOK_CLI:-}" ] && [ -z "${TERM_PROGRAM:-}" ]; then
    log_warning "Not running in VS Code environment"
    log_info "This script is designed to run inside the VS Code dev container"
fi

# Check if code CLI is available
if ! command -v code &> /dev/null; then
    log_error "'code' command not found"
    log_info "The VS Code CLI may not be available in this container"
    log_info "Try running this from the VS Code integrated terminal"
    exit 1
fi

log_info "🔍 Checking installed extensions..."
echo ""

# List all installed extensions
EXTENSIONS=$(code --list-extensions 2>/dev/null | tr '[:upper:]' '[:lower:]' || echo "")

if [ -z "$EXTENSIONS" ]; then
    log_error "No extensions found or unable to list extensions"
    echo ""
    log_info "Possible causes:"
    echo "  1. Extensions haven't been installed yet"
    echo "  2. VS Code server is still initializing"
    echo "  3. Workspace trust hasn't been granted"
    echo ""
    log_info "Solutions:"
    echo "  • Wait a few minutes for initialization to complete"
    echo "  • Click 'Trust' in the workspace trust prompt"
    echo "  • Rebuild the container: Dev Containers: Rebuild Container"
else
    log_success "Found $(echo "$EXTENSIONS" | wc -l | tr -d ' ') installed extensions:"
    echo "$EXTENSIONS" | while read -r ext; do
        echo "  ✓ $ext"
    done
fi

echo ""
log_info "📋 Expected extensions from devcontainer.json:"
echo "  • ms-vscode.vscode-typescript-next"
echo "  • esbenp.prettier-vscode"
echo "  • dbaeumer.vscode-eslint"
echo "  • bradlc.vscode-tailwindcss"
echo "  • github.copilot"
echo "  • github.copilot-chat"
echo "  • blackboxapp.blackbox"
echo ""

# Check for missing extensions
log_info "🔍 Checking for missing critical extensions..."
CRITICAL_EXTENSIONS=(
    "ms-vscode.vscode-typescript-next"
    "esbenp.prettier-vscode"
    "dbaeumer.vscode-eslint"
    "github.copilot"
    "github.copilot-chat"
)

MISSING_COUNT=0
for ext in "${CRITICAL_EXTENSIONS[@]}"; do
    ext_lc="$(echo "$ext" | tr '[:upper:]' '[:lower:]')"
    if ! echo "$EXTENSIONS" | grep -q "^$ext_lc$"; then
        log_warning "Missing: $ext"
        MISSING_COUNT=$((MISSING_COUNT + 1))
    fi
done

if [ "$MISSING_COUNT" -eq 0 ]; then
    log_success "All critical extensions are installed!"
else
    log_warning "$MISSING_COUNT critical extension(s) missing"
fi

echo ""
log_info "🔍 Checking VS Code server logs..."

# Find and check extension host logs
VSCODE_SERVER_DIR="$HOME/.vscode-server"
if [ -d "$VSCODE_SERVER_DIR" ]; then
    log_success "VS Code server directory found: $VSCODE_SERVER_DIR"

    # Find recent log files
    LOG_DIRS=$(find "$VSCODE_SERVER_DIR/data/logs" -maxdepth 1 -type d -name "2*" 2>/dev/null | sort -r | head -1)

    if [ -n "$LOG_DIRS" ]; then
        log_info "Recent log directory: $LOG_DIRS"

        # Check for extension host errors
        EXTHOST_LOG="$LOG_DIRS/exthost1/output.log"
        if [ -f "$EXTHOST_LOG" ]; then
            echo ""
            log_info "📊 Recent extension errors (last 20 lines):"
            tail -n 20 "$EXTHOST_LOG" | grep -i "error\|fail\|warning" || log_success "No recent errors found"
        else
            log_info "Extension host log not found at: $EXTHOST_LOG"
        fi
    else
        log_warning "No recent log directories found"
    fi
else
    log_warning "VS Code server directory not found: $VSCODE_SERVER_DIR"
fi

echo ""
log_info "🔧 Troubleshooting steps:"
echo ""
echo "1. Grant Workspace Trust:"
echo "   • Look for 'Do you trust the authors...' prompt"
echo "   • Click 'Yes, I trust the authors'"
echo ""
echo "2. Check Extension Settings:"
echo "   • Open Command Palette (Cmd/Ctrl+Shift+P)"
echo "   • Run: 'Preferences: Open Settings (JSON)'"
echo "   • Verify extension settings are correct"
echo ""
echo "3. Reload Window:"
echo "   • Command Palette → 'Developer: Reload Window'"
echo ""
echo "4. Reinstall Extensions:"
echo "   • Command Palette → 'Dev Containers: Rebuild Container'"
echo "   • Wait for full rebuild and extension installation"
echo ""
echo "5. Check Extension Logs:"
echo "   • View → Output"
echo "   • Select extension from dropdown"
echo "   • Look for error messages"
echo ""
echo "6. Manual Installation:"
echo "   • Extensions view (Cmd/Ctrl+Shift+X)"
echo "   • Search for missing extensions"
echo "   • Click 'Install in Container'"
echo ""

log_info "💡 Common Issues:"
echo ""
echo "  • Port conflicts: Check if ports 3000, 4000, 5432 are available"
echo "  • Resource limits: Ensure Docker has enough memory (6GB+)"
echo "  • Network issues: Some extensions require internet access"
echo "  • Workspace trust: Extensions are disabled until trust is granted"
echo ""

# Check workspace trust status
if [ -f ".vscode/settings.json" ]; then
    if grep -q '"security.workspace.trust.enabled"' .vscode/settings.json 2>/dev/null; then
        log_info "Workspace trust settings found in .vscode/settings.json"
    fi
fi

echo ""
log_success "Extension debugging complete!"
log_info "If issues persist, check the VS Code documentation:"
echo "  https://code.visualstudio.com/docs/devcontainers/containers"
echo ""
