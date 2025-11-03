#!/usr/bin/env bash
# Application startup script for DevContainer
# Starts development applications and services

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

log_info "🚀 Starting development applications..."

# Check if port 3000 is available, use alternative if not
if command -v lsof &> /dev/null && lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    log_warning "Port 3000 is in use, frontend will start on port 3001"
    export FRONTEND_PORT=3001
else
    export FRONTEND_PORT=3000
fi

log_info "Port configuration:"
log_info "  Frontend: ${FRONTEND_PORT}"
log_info "  API: 4000"
echo ""

# Function to start application in background
start_app() {
    local name=$1
    local command=$2
    local log_file="${3:-/tmp/${name}.log}"

    log_info "Starting $name..."

    # Check if already running
    if pgrep -f "$command" > /dev/null 2>&1; then
        log_warning "$name is already running"
        return 0
    fi

    # Start in background
    nohup $command > "$log_file" 2>&1 &
    local pid=$!

    # Wait a moment for startup
    sleep 2

    # Check if process is still running
    if kill -0 $pid 2>/dev/null; then
        log_success "$name started (PID: $pid)"
        echo $pid >> /tmp/devcontainer-pids.txt
    else
        log_error "$name failed to start"
        if [ -f "$log_file" ]; then
            log_info "Check logs: $log_file"
            tail -n 10 "$log_file" || true
        fi
        return 1
    fi
}

# Create PID tracking file
echo "" > /tmp/devcontainer-pids.txt

# Applications are ready to start manually
# Auto-start is disabled to give you control over which services to run

if [ -f "package.json" ]; then
    log_success "✅ Development environment ready!"
    echo ""
    log_info "📝 Available commands:"
    
    # Check for available scripts
    if npm run 2>/dev/null | grep -q "dev:all"; then
        echo "  npm run dev:all       - Start all services"
    fi
    if npm run 2>/dev/null | grep -q "dev:api"; then
        echo "  npm run dev:api       - Start API server"
    fi
    if npm run 2>/dev/null | grep -q "dev:frontend"; then
        echo "  npm run dev:frontend  - Start frontend (port ${FRONTEND_PORT})"
    fi
    if npm run 2>/dev/null | grep -q "dev:worker"; then
        echo "  npm run dev:worker    - Start worker services"
    fi
    if command -v nx &> /dev/null || [ -x "./node_modules/.bin/nx" ]; then
        echo "  nx serve frontend     - Serve frontend with Nx"
        echo "  nx serve api          - Serve API with Nx"
    fi
    
    echo ""
    log_info "💡 Pro tips:"
    echo "  • Use VS Code's integrated terminal for better log viewing"
    echo "  • Open multiple terminals to run services separately"
    echo "  • Check Docker services status with: docker compose ps"
    echo ""
else
    log_warning "No package.json found in current directory"
    log_info "Make sure you're in the project root: /workspaces/political-sphere"
fi

# Optional: Uncomment to auto-start services
# Caution: This may cause issues if ports are already in use
#
# if [ -f "package.json" ] && npm run 2>/dev/null | grep -q "dev:all"; then
#     log_info "Auto-starting all services..."
#     start_app "dev-all" "npm run dev:all" "/tmp/dev-all.log"
# fi
