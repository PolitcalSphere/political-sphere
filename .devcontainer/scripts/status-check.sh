#!/usr/bin/env bash
# Status check script for DevContainer
# Displays environment status and useful information

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Political Sphere Development Environment Status          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verify we're in the correct directory
if [ ! -f "package.json" ]; then
    log_error "Not in project root directory (package.json not found)"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    log_warning "node_modules directory not found"
    log_info "Running dependency installation..."
    if command -v pnpm &> /dev/null; then
        pnpm install --frozen-lockfile || log_error "Failed to install dependencies"
    elif command -v npm &> /dev/null; then
        npm ci || log_error "Failed to install dependencies"
    else
        log_error "No package manager found (pnpm or npm required)"
        exit 1
    fi
fi

# Verify required tools
log_info "🔧 Tool Verification:"
command -v node &> /dev/null && echo "  ✅ Node.js: $(node --version)" || echo "  ❌ Node.js not found"
if command -v pnpm &> /dev/null; then
    # Run from /tmp to avoid workspace warnings about unsupported workspaces field
    PNPM_VER=$( (cd /tmp && pnpm --version) 2>/dev/null || pnpm --version )
    echo "  ✅ pnpm: $PNPM_VER"
else
    echo "  ⚠️  pnpm not found"
fi
command -v npm &> /dev/null && echo "  ✅ npm: $(npm --version)" || echo "  ❌ npm not found"
command -v nx &> /dev/null && echo "  ✅ Nx CLI available" || echo "  ⚠️  Nx CLI not found (will use npx)"
echo ""

# Telemetry: Record usage for analytics (optional, can be disabled)
# Note: This sends anonymous usage data to improve the development experience
# Set DISABLE_TELEMETRY=false to opt in (default is disabled for privacy)
if [ "${DISABLE_TELEMETRY:-true}" = "false" ]; then
    # Simple anonymous usage tracking - only counts, no personal data
    curl -s --fail "https://api.segment.io/v1/track" \
        -H "Content-Type: application/json" \
        -H "Authorization: Basic $(echo -n "${SEGMENT_WRITE_KEY:-dummy}" | base64)" \
        -d '{
            "userId": "anonymous-dev",
            "event": "devcontainer-status-check",
            "properties": {
                "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
                "project": "political-sphere"
            }
        }' 2>/dev/null || echo "Telemetry transmission failed (non-critical)"
fi

# Check Docker services with better error handling
COMPOSE_FILE="${COMPOSE_FILE:-apps/dev/docker/docker-compose.dev.yaml}"

log_info "🐳 Docker Services:"
if command -v docker &> /dev/null && docker info &> /dev/null; then
    if command -v docker compose &> /dev/null; then
        if [ -f "$COMPOSE_FILE" ]; then
            docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || log_warning "Unable to check service status (compose file may be invalid)"
        else
            log_warning "Compose file not found: $COMPOSE_FILE"
        fi
    else
        log_warning "Docker Compose not available"
    fi
else
    if [ -S "/var/run/docker.sock" ]; then
        # Check for permission issue specifically
        if docker info 2>&1 | grep -qi "permission denied\|got permission denied"; then
            log_warning "Docker socket present but permission denied for current user"
            log_info "Try running: bash .devcontainer/scripts/docker-socket-perms.sh, then reload window"
        else
            log_warning "Docker daemon not running or not accessible"
        fi
    else
        log_warning "Docker socket not found; ensure host socket is mounted in docker-compose"
    fi
fi

echo ""
echo "🔗 Quick Links:"
echo "  📊 Grafana:        http://localhost:3001 (admin/${GRAFANA_ADMIN_PASSWORD:-admin123})"
echo "  📈 Prometheus:     http://localhost:9090"
echo "  💾 pgAdmin:        http://localhost:5050 (admin@example.com/admin)"
echo "  🔐 Keycloak:       http://localhost:8080 (admin/${AUTH_ADMIN_PASSWORD:-admin123})"
echo "  📧 MailHog:        http://localhost:8025"
echo "  🌐 Frontend:       http://localhost:3000"
echo "  🚀 API:            http://localhost:4000"
echo ""

echo "📝 Useful Commands:"
echo "  npm run dev:all       - Start all services"
echo "  npm run dev:api       - Start API only"
echo "  npm run dev:frontend  - Start frontend only"
echo "  npm run test          - Run tests"
echo "  npm run lint          - Lint code"
echo "  npm run format        - Format code"
echo "  npm run build         - Build for production"
echo ""

echo "📚 Documentation:"
echo "  README.md            - Project overview"
echo "  docs/onboarding.md   - Onboarding guide"
echo "  docs/architecture.md - Architecture docs"
echo ""

# Check if .env needs attention
if [ -f .env ]; then
    if grep -q "changeme" .env 2>/dev/null; then
        log_warning "Default passwords detected in .env file!"
        log_info "Please update passwords for security."
        echo ""
    fi

    # Check for hardcoded secrets in scripts
    if grep -r "password\|secret\|key\|token" .devcontainer/ --include="*.sh" --include="*.json" | grep -v "GRAFANA_ADMIN_PASSWORD\|AUTH_ADMIN_PASSWORD\|POSTGRES_PASSWORD\|REDIS_PASSWORD" | grep -q .; then
        log_warning "Potential hardcoded secrets detected in devcontainer files!"
        log_info "Review and remove any hardcoded credentials."
        echo ""
    fi
fi

log_success "Environment is ready for development!"
echo ""
