#!/bin/bash

# Political Sphere Development Environment Setup Script
# This script sets up the complete development environment for new developers
#
# Usage: ./scripts/setup.sh [options]
#
# Options:
#   --dry-run     Show what would be done without making changes
#   --verbose     Enable verbose logging for debugging
#   --help        Show this help message
#
# Environment Variables:
#   FRONTEND_URL     Frontend service URL (default: http://localhost:3000)
#   API_URL          API service URL (default: http://localhost:4000)
#   KEYCLOAK_URL     Keycloak service URL (default: http://localhost:8080)
#   MAILHOG_URL      MailHog service URL (default: http://localhost:8025)
#   PGADMIN_URL      pgAdmin service URL (default: http://localhost:5050)
#   PROMETHEUS_URL   Prometheus service URL (default: http://localhost:9090)
#   GRAFANA_URL      Grafana service URL (default: http://localhost:3001)
#   LOCALSTACK_URL   LocalStack service URL (default: http://localhost:4566)
#
# Prerequisites:
# - Node.js 18+
# - npm
# - Docker
# - Docker Compose
# - openssl (for password generation)
#
# Owned by: DevOps Team
# Last updated: 2024-01-15

set -e

# Default configuration
DEFAULT_FRONTEND_URL="http://localhost:3000"
DEFAULT_API_URL="http://localhost:4000"
DEFAULT_KEYCLOAK_URL="http://localhost:8080"
DEFAULT_MAILHOG_URL="http://localhost:8025"
DEFAULT_PGADMIN_URL="http://localhost:5050"
DEFAULT_PROMETHEUS_URL="http://localhost:9090"
DEFAULT_GRAFANA_URL="http://localhost:3001"
DEFAULT_LOCALSTACK_URL="http://localhost:4566"

# Load configuration from file if it exists
if [ -f ".setuprc" ]; then
    log "DEBUG" "Loading configuration from .setuprc"
    source .setuprc
fi

# Parse command line arguments
DRY_RUN=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Political Sphere Development Environment Setup Script"
            echo ""
            echo "Usage: ./scripts/setup.sh [options]"
            echo ""
            echo "Options:"
            echo "  --dry-run     Show what would be done without making changes"
            echo "  --verbose     Enable verbose logging for debugging"
            echo "  --help        Show this help message"
            echo ""
            echo "Configuration:"
            echo "  Configuration can be loaded from .setuprc file in the project root"
            echo "  Example .setuprc:"
            echo "    export FRONTEND_URL=\"http://localhost:3000\""
            echo "    export API_URL=\"http://localhost:4000\""
            echo "    export VERBOSE=true"
            echo ""
            echo "Environment Variables:"
            echo "  FRONTEND_URL     Frontend service URL (default: $DEFAULT_FRONTEND_URL)"
            echo "  API_URL          API service URL (default: $DEFAULT_API_URL)"
            echo "  KEYCLOAK_URL     Keycloak service URL (default: $DEFAULT_KEYCLOAK_URL)"
            echo "  MAILHOG_URL      MailHog service URL (default: $DEFAULT_MAILHOG_URL)"
            echo "  PGADMIN_URL      pgAdmin service URL (default: $DEFAULT_PGADMIN_URL)"
            echo "  PROMETHEUS_URL   Prometheus service URL (default: $DEFAULT_PROMETHEUS_URL)"
            echo "  GRAFANA_URL      Grafana service URL (default: $DEFAULT_GRAFANA_URL)"
            echo "  LOCALSTACK_URL   LocalStack service URL (default: $DEFAULT_LOCALSTACK_URL)"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Configuration with environment variable overrides
FRONTEND_URL=${FRONTEND_URL:-$DEFAULT_FRONTEND_URL}
API_URL=${API_URL:-$DEFAULT_API_URL}
KEYCLOAK_URL=${KEYCLOAK_URL:-$DEFAULT_KEYCLOAK_URL}
MAILHOG_URL=${MAILHOG_URL:-$DEFAULT_MAILHOG_URL}
PGADMIN_URL=${PGADMIN_URL:-$DEFAULT_PGADMIN_URL}
PROMETHEUS_URL=${PROMETHEUS_URL:-$DEFAULT_PROMETHEUS_URL}
GRAFANA_URL=${GRAFANA_URL:-$DEFAULT_GRAFANA_URL}
LOCALSTACK_URL=${LOCALSTACK_URL:-$DEFAULT_LOCALSTACK_URL}

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMPOSE_FILE="$ROOT_DIR/apps/dev/docker/docker-compose.dev.yaml"
COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-politicalsphere}
export COMPOSE_PROJECT_NAME

# Logging function
log() {
    local level=$1
    local message=$2
    if [[ "$VERBOSE" == "true" ]] || [[ "$level" != "DEBUG" ]]; then
        echo "[$level] $message"
    fi
}

# Dry run function
dry_run() {
    local message=$1
    if [[ "$DRY_RUN" == "true" ]]; then
        echo "[DRY RUN] Would execute: $message"
        return 0
    else
        return 1
    fi
}

# Cleanup function for trap
cleanup() {
    log "INFO" "🧹 Cleaning up on exit..."
    if [ -f "$ROOT_DIR/apps/dev/terraform/tfplan" ]; then
        if dry_run "rm -f $ROOT_DIR/apps/dev/terraform/tfplan"; then
            return
        fi
        rm -f "$ROOT_DIR/apps/dev/terraform/tfplan"
        log "DEBUG" "Removed temporary Terraform plan file"
    fi

    # Stop Docker services if they were started
    if [[ -n "${DOCKER_COMPOSE[*]}" ]] && [ -f "$COMPOSE_FILE" ]; then
        log "INFO" "Stopping Docker Compose services..."
        if dry_run "${DOCKER_COMPOSE[*]} -f $COMPOSE_FILE down"; then
            return
        fi
        "${DOCKER_COMPOSE[@]}" -f "$COMPOSE_FILE" down >/dev/null 2>&1 || true
        log "DEBUG" "Docker Compose services stopped"
    fi
}

# Trap for cleanup on exit
trap cleanup EXIT

# Function to detect container environment
detect_container_env() {
    if [ -f /.dockerenv ] || [ -f /run/.containerenv ] || grep -q 'docker\|containerd\|podman' /proc/1/cgroup 2>/dev/null; then
        log "DEBUG" "Detected containerized environment"
        return 0
    else
        log "DEBUG" "Detected host environment"
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log "INFO" "📋 Checking prerequisites..."

    if ! command -v node &> /dev/null; then
        log "ERROR" "❌ Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    # Check Node.js version (require 18+)
    local node_version=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$node_version" -lt 18 ]; then
        log "ERROR" "❌ Node.js version $node_version is not supported. Please install Node.js 18+ (found: $(node --version))"
        exit 1
    fi
    log "DEBUG" "✅ Node.js found: $(node --version) (meets minimum requirement)"

    if ! command -v npm &> /dev/null; then
        log "ERROR" "❌ npm is not installed. Please install npm first."
        exit 1
    fi
    log "DEBUG" "✅ npm found: $(npm --version)"

    if ! command -v docker &> /dev/null; then
        log "ERROR" "❌ Docker is not installed. Please install Docker first."
        exit 1
    fi
    log "DEBUG" "✅ Docker found: $(docker --version)"

    if docker compose version >/dev/null 2>&1; then
        DOCKER_COMPOSE=(docker compose)
        log "DEBUG" "✅ Using Docker Compose V2"
    elif command -v docker-compose >/dev/null 2>&1; then
        DOCKER_COMPOSE=(docker-compose)
        log "DEBUG" "✅ Using Docker Compose V1"
    else
        log "ERROR" "❌ Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    if ! command -v openssl &> /dev/null; then
        log "ERROR" "❌ openssl is not installed. Please install openssl for secure password generation."
        exit 1
    fi
    log "DEBUG" "✅ openssl found: $(openssl version | head -1)"

    # Detect container environment and adjust URLs if needed
    if detect_container_env; then
        log "INFO" "🔧 Adjusting service URLs for containerized environment"
        # In containers, services might be accessible via different hostnames
        # This is a basic adjustment - could be enhanced based on specific container setup
        export FRONTEND_URL="${FRONTEND_URL/localhost/host.docker.internal}"
        export API_URL="${API_URL/localhost/host.docker.internal}"
        export KEYCLOAK_URL="${KEYCLOAK_URL/localhost/host.docker.internal}"
        export MAILHOG_URL="${MAILHOG_URL/localhost/host.docker.internal}"
        export PGADMIN_URL="${PGADMIN_URL/localhost/host.docker.internal}"
        export PROMETHEUS_URL="${PROMETHEUS_URL/localhost/host.docker.internal}"
        export GRAFANA_URL="${GRAFANA_URL/localhost/host.docker.internal}"
        export LOCALSTACK_URL="${LOCALSTACK_URL/localhost/host.docker.internal}"
    fi

    log "INFO" "✅ Prerequisites check passed"
}

# Function to install dependencies
install_dependencies() {
    log "INFO" "📦 Installing project dependencies..."
    if dry_run "npm ci"; then
        return
    fi
    if ! npm ci; then
        log "ERROR" "❌ Failed to install npm dependencies"
        exit 1
    fi
    log "DEBUG" "✅ npm dependencies installed successfully"
}

# Function to setup environment variables
setup_environment() {
    log "INFO" "🔧 Setting up environment variables..."
    if [ ! -f .env ]; then
        if dry_run "Create .env file with secure random passwords"; then
            return
        fi

        # Generate secure random passwords
        POSTGRES_PASSWORD=$(openssl rand -base64 12)
        REDIS_PASSWORD=$(openssl rand -base64 12)
        AUTH_ADMIN_PASSWORD=$(openssl rand -base64 12)
        GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 12)
        PGADMIN_PASSWORD=$(openssl rand -base64 12)

        log "DEBUG" "Generated secure passwords for all services"

        cat > .env << EOF
# Database
POSTGRES_USER=political
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=political_dev

# Redis
REDIS_PASSWORD=$REDIS_PASSWORD

# AWS/LocalStack
AWS_REGION=us-east-1

# Authentication
AUTH_ADMIN_USER=admin
AUTH_ADMIN_PASSWORD=$AUTH_ADMIN_PASSWORD

# Monitoring
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD

# Ports
API_PORT=4000
FRONTEND_PORT=3000
MAILHOG_SMTP_PORT=1025
MAILHOG_HTTP_PORT=8025
AUTH_PORT=8080
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=$PGADMIN_PASSWORD
EOF
        log "INFO" "✅ Created .env file with generated secure passwords"
        log "WARN" "⚠️  IMPORTANT: Save these credentials securely - they are randomly generated!"
        log "WARN" "   - Postgres Password: $POSTGRES_PASSWORD"
        log "WARN" "   - Redis Password: $REDIS_PASSWORD"
        log "WARN" "   - Auth Admin Password: $AUTH_ADMIN_PASSWORD"
        log "WARN" "   - Grafana Admin Password: $GRAFANA_ADMIN_PASSWORD"
        log "WARN" "   - pgAdmin Password: $PGADMIN_PASSWORD"
    else
        log "INFO" "ℹ️  .env file already exists, skipping creation"
    fi
}

# Function to setup infrastructure with retry logic
setup_infrastructure() {
    log "INFO" "🏗️  Setting up Terraform for local development..."
    if dry_run "terraform init, plan, and apply"; then
        return
    fi

    pushd "$ROOT_DIR/apps/dev/terraform" >/dev/null

    # Retry function for Terraform operations
    retry_terraform() {
        local operation=$1
        local command=$2
        local max_retries=3
        local retry_count=0

        while [ $retry_count -lt $max_retries ]; do
            log "DEBUG" "$operation (attempt $((retry_count + 1))/$max_retries)..."
            if eval "$command"; then
                return 0
            fi

            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                log "WARN" "⚠️  $operation failed, retrying in 5 seconds..."
                sleep 5
            fi
        done

        log "ERROR" "❌ $operation failed after $max_retries attempts"
        return 1
    }

    if [ ! -d ".terraform" ]; then
        if ! retry_terraform "Initializing Terraform" "terraform init"; then
            exit 1
        fi
        log "DEBUG" "✅ Terraform initialized"
    fi

    if ! retry_terraform "Planning Terraform changes" "terraform plan -out=tfplan"; then
        exit 1
    fi
    log "DEBUG" "✅ Terraform plan created"

    if ! retry_terraform "Applying Terraform changes" "terraform apply tfplan"; then
        exit 1
    fi
    log "DEBUG" "✅ Terraform changes applied"
    popd >/dev/null
}

# Function to start services with retry logic
start_services() {
    log "INFO" "🐳 Starting development environment with Docker Compose..."
    if dry_run "$ROOT_DIR/apps/dev/scripts/dev-up.sh"; then
        return
    fi

    local max_retries=3
    local retry_count=0

    while [ $retry_count -lt $max_retries ]; do
        log "DEBUG" "Starting Docker Compose services (attempt $((retry_count + 1))/$max_retries)..."
        if "$ROOT_DIR/apps/dev/scripts/dev-up.sh"; then
            log "DEBUG" "✅ Docker Compose services started"
            return 0
        fi

        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $max_retries ]; then
            log "WARN" "⚠️  Docker Compose startup failed, retrying in 10 seconds..."
            sleep 10
        fi
    done

    log "ERROR" "❌ Failed to start Docker Compose services after $max_retries attempts"
    exit 1
}

# Function to wait for services to be healthy
wait_for_services() {
    log "INFO" "⏳ Waiting for services to be ready..."
    if dry_run "Wait for services to be healthy (60 attempts, 5s intervals)"; then
        return
    fi

    local max_attempts=60
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        # Calculate and display progress percentage
        local progress=$(( (attempt - 1) * 100 / max_attempts ))
        log "INFO" "⏳ Health check progress: ${progress}% complete ($attempt/$max_attempts attempts)"

        if "${DOCKER_COMPOSE[@]}" -f "$COMPOSE_FILE" ps | grep -q "Up"; then
            log "DEBUG" "Services are up, checking health endpoints..."

            # Test key endpoints using configured URLs
            if curl -s --max-time 5 "$FRONTEND_URL" >/dev/null 2>&1 && \
               curl -s --max-time 5 "$API_URL/health" >/dev/null 2>&1 && \
               curl -s --max-time 5 "$KEYCLOAK_URL" >/dev/null 2>&1; then
                log "INFO" "✅ All services are healthy (100% complete)"
                return 0
            fi
        fi

        log "DEBUG" "Services not ready yet, waiting 5 seconds..."
        sleep 5
        ((attempt++))
    done

    log "ERROR" "❌ Services failed to become healthy within timeout (5 minutes)"
    exit 1
}

# Function to run database setup
run_database_setup() {
    log "INFO" "🗄️  Running database setup..."
    if dry_run "Database setup (migrations not yet implemented)"; then
        return
    fi
    # Add database migration commands here when available
    log "INFO" "ℹ️  Database migrations not yet implemented"
}

# Function to run initial tests
run_initial_tests() {
    log "INFO" "🧪 Running initial tests..."
    if dry_run "npm run test --if-present"; then
        return
    fi
    if ! npm run test --if-present; then
        log "WARN" "⚠️  Tests failed or no test script found"
    fi
}

# Function to verify services
verify_services() {
    log "INFO" "🔍 Verifying service accessibility..."
    if dry_run "Verify service accessibility for all configured URLs"; then
        return
    fi

    local services=(
        "Frontend:$FRONTEND_URL"
        "API:$API_URL"
        "Keycloak:$KEYCLOAK_URL"
        "MailHog:$MAILHOG_URL"
        "pgAdmin:$PGADMIN_URL"
        "Prometheus:$PROMETHEUS_URL"
        "Grafana:$GRAFANA_URL"
        "LocalStack:$LOCALSTACK_URL"
    )

    for service in "${services[@]}"; do
        local name=$(echo "$service" | cut -d: -f1)
        local url=$(echo "$service" | cut -d: -f2-)

        log "DEBUG" "Testing $name at $url"
        if curl -s --max-time 10 "$url" >/dev/null 2>&1; then
            log "INFO" "✅ $name is accessible at $url"
        else
            log "WARN" "⚠️  $name at $url is not responding (may still be starting)"
        fi
    done
}

# Main execution
if [[ "$DRY_RUN" == "true" ]]; then
    log "INFO" "🚀 DRY RUN: Simulating Political Sphere Development Environment Setup"
    log "INFO" "====================================================="
else
    log "INFO" "🚀 Setting up Political Sphere Development Environment"
    log "INFO" "====================================================="
fi

check_prerequisites
install_dependencies
setup_environment
setup_infrastructure
start_services
wait_for_services
run_database_setup
run_initial_tests
verify_services

if [[ "$DRY_RUN" == "true" ]]; then
    log "INFO" "🎭 Dry run complete! No changes were made."
    exit 0
fi

log "INFO" ""
log "INFO" "🎉 Development environment setup complete!"
log "INFO" ""
log "INFO" "🌐 Available services:"
log "INFO" "  - Frontend:     $FRONTEND_URL"
log "INFO" "  - API:          $API_URL"
log "INFO" "  - Keycloak:     $KEYCLOAK_URL"
log "INFO" "  - MailHog:      $MAILHOG_URL"
log "INFO" "  - pgAdmin:      $PGADMIN_URL"
log "INFO" "  - Prometheus:   $PROMETHEUS_URL"
log "INFO" "  - Grafana:      $GRAFANA_URL"
log "INFO" "  - LocalStack:   $LOCALSTACK_URL"
log "INFO" ""
log "INFO" "📚 Next steps:"
log "INFO" "  1. Open $FRONTEND_URL in your browser"
log "INFO" "  2. Check Grafana dashboards at $GRAFANA_URL"
log "INFO" "  3. View logs: ${DOCKER_COMPOSE[*]} -f $COMPOSE_FILE logs -f"
log "INFO" "  4. Stop environment: ${DOCKER_COMPOSE[*]} -f $COMPOSE_FILE down"
log "INFO" ""
log "INFO" "📖 For more information, see docs/onboarding.md"
