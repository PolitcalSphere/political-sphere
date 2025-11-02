#!/usr/bin/env bash
set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# If Docker CLI is not available, skip service waiting gracefully.
if ! command -v docker >/dev/null 2>&1; then
    log_warning "Docker CLI not found in PATH; skipping service readiness checks."
    log_info "This is expected if Docker-in-Docker or host socket isn't available yet."
    exit 0
fi

log_info "Waiting for services to be ready..."

# Configuration variables
MAX_ATTEMPTS="${MAX_ATTEMPTS:-60}"
SLEEP_INTERVAL="${SLEEP_INTERVAL:-2}"

# Get the compose file path
COMPOSE_FILE="${COMPOSE_FILE:-apps/dev/docker/docker-compose.dev.yaml}"

# Function to check service health with improved error handling
check_service() {
    local service=$1
    local attempt=0

    if [ -z "$service" ]; then
        log_error "No service name provided"
        return 1
    fi

    log_info "Checking $service..."

    while [ $attempt -lt $MAX_ATTEMPTS ]; do
        if docker compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "healthy\|Up"; then
            log_success "$service is ready"
            return 0
        fi

        # Check if service exists but is not healthy
        if docker compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "$service"; then
            echo "  ⏳ $service is starting... (attempt $((attempt + 1))/$MAX_ATTEMPTS)"
        else
            log_error "$service service not found in compose file"
            return 1
        fi

        attempt=$((attempt + 1))
        sleep $SLEEP_INTERVAL
    done

    log_warning "$service health check timed out after $MAX_ATTEMPTS attempts"
    log_info "Service may still be initializing. Check logs with: docker compose -f \"$COMPOSE_FILE\" logs -f $service"
    return 1
}

# Function to handle graceful shutdown
cleanup() {
    log_info "Performing cleanup..."
    # Stop any running processes
    if command -v tmux &> /dev/null && tmux has-session -t apps 2>/dev/null; then
        tmux kill-session -t apps
        log_success "Stopped tmux session 'apps'"
    fi
    # Additional cleanup can be added here
    log_success "Cleanup complete"
}

# Set trap for graceful shutdown
trap cleanup EXIT

# Wait for critical services with optimized timing
log_info "Waiting for critical services (timeout: $MAX_ATTEMPTS seconds each)..."
check_service postgres || log_warning "Postgres may not be ready - check logs manually"
check_service redis || log_warning "Redis may not be ready - check logs manually"

# Optional: Check if we can connect
log_info "Testing database connectivity..."
if command -v pg_isready &> /dev/null && pg_isready -h postgres -U "${POSTGRES_USER:-political}" > /dev/null 2>&1; then
    log_success "PostgreSQL connection successful"
else
    log_warning "PostgreSQL connection failed (may still be initializing)"
fi

if [ -n "${REDIS_PASSWORD:-}" ] && command -v redis-cli &> /dev/null && redis-cli -h redis -a "${REDIS_PASSWORD}" ping > /dev/null 2>&1; then
    log_success "Redis connection successful"
else
    log_warning "Redis connection failed (may still be initializing)"
fi

log_success "Service initialization complete"
