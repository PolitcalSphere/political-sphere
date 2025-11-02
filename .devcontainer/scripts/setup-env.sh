#!/usr/bin/env bash
# Environment setup script for DevContainer
# Initializes .env files and configuration

set -euo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

log_info "Setting up environment configuration..."

# Define environment files to create
ENV_FILES=(
    ".env"
    ".env.local"
)

# Function to generate secure random password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Function to setup .env file
setup_env_file() {
    local env_file=$1

    if [ -f "$env_file" ]; then
        log_info "$env_file already exists, skipping creation"
        return 0
    fi

    log_info "Creating $env_file..."

    # Generate secure passwords
    POSTGRES_PASSWORD=$(generate_password)
    REDIS_PASSWORD=$(generate_password)
    GRAFANA_ADMIN_PASSWORD=$(generate_password)
    AUTH_ADMIN_PASSWORD=$(generate_password)

    cat > "$env_file" << EOF
# Political Sphere Development Environment Configuration
# This file contains environment variables for the development setup
# DO NOT commit this file to version control

# Database Configuration
POSTGRES_USER=political
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=political_dev
DATABASE_URL=postgres://political:$POSTGRES_PASSWORD@postgres:5432/political_dev

# Redis Configuration
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379

# Authentication (Keycloak)
AUTH_ADMIN_USER=admin
AUTH_ADMIN_PASSWORD=$AUTH_ADMIN_PASSWORD
AUTH_REALM=political-sphere
AUTH_CLIENT_ID=political-sphere-client
AUTH_CLIENT_SECRET=$(generate_password)

# Monitoring (Grafana)
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD

# Application Settings
NODE_ENV=development
LOG_LEVEL=debug
API_PORT=4000
FRONTEND_PORT=3000

# Security
JWT_SECRET=$(generate_password)
SESSION_SECRET=$(generate_password)

# Email (MailHog for development)
SMTP_HOST=mailhog
SMTP_PORT=1025
EMAIL_FROM=noreply@political-sphere.dev

# AWS/LocalStack (for local development)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT_URL=http://localstack:4566

# Terraform/Cloud
TF_VAR_environment=dev
TF_VAR_region=us-east-1

# Nx Build Cache
NX_CACHE_DIR=.nx/cache

# Development Tools
VSCODE_EXTENSIONS_AUTO_UPDATE=false
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1

# Telemetry (opt-in)
DISABLE_TELEMETRY=true
EOF

    log_success "Created $env_file with secure default values"
    log_warning "IMPORTANT: Review and customize the passwords in $env_file before use"
}

# Setup each environment file
for env_file in "${ENV_FILES[@]}"; do
    setup_env_file "$env_file"
done

# Create .env.example if it doesn't exist
if [ ! -f ".env.example" ]; then
    log_info "Creating .env.example template..."
    cat > ".env.example" << 'EOF'
# Political Sphere Environment Variables Template
# Copy this file to .env and fill in your values

# Database
POSTGRES_USER=political
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=political_dev
DATABASE_URL=postgres://political:your_password@postgres:5432/political_dev

# Redis
REDIS_PASSWORD=your_redis_password
REDIS_URL=redis://:your_password@redis:6379

# Authentication
AUTH_ADMIN_USER=admin
AUTH_ADMIN_PASSWORD=your_admin_password
AUTH_REALM=political-sphere
AUTH_CLIENT_ID=political-sphere-client
AUTH_CLIENT_SECRET=your_client_secret

# Monitoring
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your_grafana_password

# Application
NODE_ENV=development
LOG_LEVEL=debug
API_PORT=4000
FRONTEND_PORT=3000

# Security
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# Email
SMTP_HOST=mailhog
SMTP_PORT=1025
EMAIL_FROM=noreply@political-sphere.dev

# AWS/LocalStack
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_ENDPOINT_URL=http://localstack:4566

# Terraform
TF_VAR_environment=dev
TF_VAR_region=us-east-1

# Nx
NX_CACHE_DIR=.nx/cache

# Development
VSCODE_EXTENSIONS_AUTO_UPDATE=false
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1

# Telemetry
DISABLE_TELEMETRY=true
EOF
    log_success "Created .env.example template"
fi

# Ensure proper permissions
chmod 600 .env* 2>/dev/null || true

log_success "Environment setup complete!"
log_info "Next steps:"
log_info "  1. Review the generated .env file"
log_info "  2. Update any passwords or configuration as needed"
log_info "  3. The container will continue with dependency installation"
