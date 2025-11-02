#!/usr/bin/env bash
# Docker Helper Script for DevContainer
# Manages Docker daemon and services within the dev container
# 
# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2025 Political Sphere Contributors

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker daemon is running
check_docker_daemon() {
    if docker info >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Start Docker daemon if not running
start_docker_daemon() {
    log_info "Starting Docker daemon..."
    
    if [ -f "/usr/local/share/docker-init.sh" ]; then
        # Use the Docker-in-Docker feature's init script
        nohup /usr/local/share/docker-init.sh > /tmp/docker-init.log 2>&1 &
        
        # Wait for daemon to be ready (max 30 seconds)
        local max_wait=30
        local waited=0
        while ! check_docker_daemon && [ $waited -lt $max_wait ]; do
            sleep 1
            waited=$((waited + 1))
        done
        
        if check_docker_daemon; then
            log_success "Docker daemon started successfully"
            return 0
        else
            log_error "Docker daemon failed to start within ${max_wait} seconds"
            log_info "Check logs: cat /tmp/docker-init.log"
            return 1
        fi
    else
        log_error "Docker init script not found. Docker-in-Docker feature may not be properly installed."
        log_info "You can run Docker commands from the host machine instead."
        return 1
    fi
}

# Start monitoring stack
start_monitoring() {
    log_info "Starting monitoring stack..."
    
    if ! check_docker_daemon; then
        if ! start_docker_daemon; then
            log_error "Cannot start monitoring stack without Docker daemon"
            return 1
        fi
    fi
    
    cd "$PROJECT_ROOT/monitoring"
    docker compose up -d
    log_success "Monitoring stack started"
    log_info "Access services at:"
    log_info "  - Grafana: http://localhost:3000 (admin/admin)"
    log_info "  - Prometheus: http://localhost:9090"
    log_info "  - Jaeger: http://localhost:16686"
}

# Stop monitoring stack
stop_monitoring() {
    log_info "Stopping monitoring stack..."
    
    if ! check_docker_daemon; then
        log_error "Docker daemon not running"
        return 1
    fi
    
    cd "$PROJECT_ROOT/monitoring"
    docker compose down
    log_success "Monitoring stack stopped"
}

# Check status of all services
status() {
    log_info "Checking Docker daemon status..."
    if check_docker_daemon; then
        log_success "Docker daemon is running"
        docker version | head -n 10
    else
        log_warning "Docker daemon is not running"
        log_info "Run: $0 start-daemon"
    fi
    
    echo ""
    log_info "Checking core services (PostgreSQL, Redis)..."
    
    if pg_isready -h postgres -U political >/dev/null 2>&1; then
        log_success "PostgreSQL is running"
    else
        log_warning "PostgreSQL is not accessible"
    fi
    
    if redis-cli -h redis -a changeme ping >/dev/null 2>&1; then
        log_success "Redis is running"
    else
        log_warning "Redis is not accessible"
    fi
    
    echo ""
    log_info "Checking monitoring stack..."
    if check_docker_daemon; then
        cd "$PROJECT_ROOT/monitoring"
        docker compose ps 2>/dev/null || log_warning "Monitoring stack not running"
    else
        log_warning "Cannot check monitoring stack (Docker daemon not running)"
    fi
}

# Main command handler
case "${1:-status}" in
    start-daemon)
        start_docker_daemon
        ;;
    start-monitoring)
        start_monitoring
        ;;
    stop-monitoring)
        stop_monitoring
        ;;
    status)
        status
        ;;
    restart-monitoring)
        stop_monitoring
        start_monitoring
        ;;
    *)
        echo "Usage: $0 {start-daemon|start-monitoring|stop-monitoring|restart-monitoring|status}"
        echo ""
        echo "Commands:"
        echo "  start-daemon       - Start the Docker daemon"
        echo "  start-monitoring   - Start the monitoring stack (Grafana, Prometheus, Jaeger)"
        echo "  stop-monitoring    - Stop the monitoring stack"
        echo "  restart-monitoring - Restart the monitoring stack"
        echo "  status             - Check status of all services"
        exit 1
        ;;
esac
