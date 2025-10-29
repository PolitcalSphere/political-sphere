#!/bin/bash

# Political Sphere Development Environment Setup Script
# This script sets up the complete development environment for new developers

set -e

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

echo "🚀 Setting up Political Sphere Development Environment"
echo "====================================================="

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE=(docker-compose)
else
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

COMPOSE_FILE="$ROOT_DIR/apps/dev/docker/docker-compose.dev.yaml"
COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-politicalsphere}
export COMPOSE_PROJECT_NAME

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing project dependencies..."
npm ci

# Set up environment variables
echo "🔧 Setting up environment variables..."
if [ ! -f .env ]; then
    cat > .env << EOF
# Database
POSTGRES_USER=political
POSTGRES_PASSWORD=changeme
POSTGRES_DB=political_dev

# Redis
REDIS_PASSWORD=changeme

# AWS/LocalStack
AWS_REGION=us-east-1

# Authentication
AUTH_ADMIN_USER=admin
AUTH_ADMIN_PASSWORD=admin123

# Monitoring
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin123

# Ports
API_PORT=4000
FRONTEND_PORT=3000
MAILHOG_SMTP_PORT=1025
MAILHOG_HTTP_PORT=8025
AUTH_PORT=8080
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=admin
EOF
    echo "✅ Created .env file with default values"
else
    echo "ℹ️  .env file already exists, skipping creation"
fi

# Set up Terraform for local development
echo "🏗️  Setting up Terraform for local development..."
pushd "$ROOT_DIR/apps/dev/terraform" >/dev/null
if [ ! -d ".terraform" ]; then
    terraform init
fi
terraform plan -out=tfplan
terraform apply tfplan
popd >/dev/null

# Build and start development environment
echo "🐳 Starting development environment with Docker Compose..."
"$ROOT_DIR/apps/dev/scripts/dev-up.sh"

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 30

# Run database migrations (if applicable)
echo "🗄️  Running database setup..."
# Add database migration commands here when available

# Run initial tests
echo "🧪 Running initial tests..."
npm run test --if-present || echo "⚠️  No test script found, skipping tests"

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "🌐 Available services:"
echo "  - Frontend:     http://localhost:3000"
echo "  - API:          http://localhost:4000"
echo "  - Keycloak:     http://localhost:8080"
echo "  - MailHog:      http://localhost:8025"
echo "  - pgAdmin:      http://localhost:5050"
echo "  - Prometheus:   http://localhost:9090"
echo "  - Grafana:      http://localhost:3001 (admin/admin123)"
echo "  - LocalStack:   http://localhost:4566"
echo ""
echo "📚 Next steps:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Check Grafana dashboards at http://localhost:3001"
echo "  3. View logs: ${DOCKER_COMPOSE[*]} -f $COMPOSE_FILE logs -f"
echo "  4. Stop environment: ${DOCKER_COMPOSE[*]} -f $COMPOSE_FILE down"
echo ""
echo "📖 For more information, see docs/onboarding.md"
