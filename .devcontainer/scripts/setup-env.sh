#!/usr/bin/env bash
set -euo pipefail

echo "🔧 Setting up development environment..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    if [ -f apps/dev/templates/.env.example ]; then
        cp apps/dev/templates/.env.example .env
        echo "✅ .env file created. Please review and update values."
        echo "⚠️  WARNING: Change default passwords before using in any shared environment!"
    else
        echo "⚠️  Template not found at apps/dev/templates/.env.example"
        echo "Creating basic .env file..."
        cat > .env << 'EOF'
# Database
POSTGRES_USER=political
POSTGRES_PASSWORD=changeme_$(openssl rand -base64 16)
POSTGRES_DB=political_dev

# Redis
REDIS_PASSWORD=changeme_$(openssl rand -base64 16)

# AWS/LocalStack
AWS_REGION=us-east-1

# Authentication
AUTH_ADMIN_USER=admin
AUTH_ADMIN_PASSWORD=changeme_$(openssl rand -base64 16)

# Monitoring
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=changeme_$(openssl rand -base64 16)

# Ports
API_PORT=4000
FRONTEND_PORT=3000
MAILHOG_SMTP_PORT=1025
MAILHOG_HTTP_PORT=8025
AUTH_PORT=8080

# Compose
COMPOSE_PROJECT_NAME=politicalsphere
EOF
    fi
else
    echo "✅ .env file already exists"
fi

# Create .env.local if it doesn't exist (for local overrides)
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local for local overrides..."
    cat > .env.local << 'EOF'
# Local environment overrides
# Add your personal development settings here
# This file is gitignored and safe for local secrets

# Example:
# API_PORT=4001
# LOG_LEVEL=debug
EOF
    echo "✅ .env.local created"
fi

echo "✅ Environment setup complete"
