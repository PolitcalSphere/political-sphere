#!/usr/bin/env bash
set -euo pipefail

# Onboarding bootstrap script for political-sphere
# This script sets up the development environment for new contributors

echo "🚀 Bootstrapping political-sphere development environment..."
ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

# Check prerequisites
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install from https://nodejs.org/"; exit 1; }

# Check Node.js version (require Node 22+)
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [[ "$NODE_VERSION" -lt 22 ]]; then
    echo "❌ Node.js 22+ is required. Current version: $(node -v). Please update Node.js."
    exit 1
fi

command -v npm >/dev/null 2>&1 || { echo "❌ npm is required."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required. Install from https://docker.com/"; exit 1; }
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE=(docker-compose)
else
    echo "❌ Docker Compose is required."
    exit 1
fi

COMPOSE_FILE="$ROOT_DIR/apps/dev/docker/docker-compose.dev.yaml"
if [[ -f ".env" ]]; then
    # shellcheck disable=SC1091
    source ".env"
fi
if [[ -f ".env.local" ]]; then
    # shellcheck disable=SC1091
    source ".env.local"
fi
DB_USER=${POSTGRES_USER:-political}
DB_PASSWORD=${POSTGRES_PASSWORD:-changeme}
DB_NAME=${POSTGRES_DB:-political_dev}

echo "✅ Prerequisites OK"

# Install dependencies
echo "Installing npm dependencies..."
npm ci

# Install lefthook for pre-commit hooks
echo "Installing lefthook..."
npm run prepare

# Set up dev environment
echo "Setting up dev environment..."
if [[ -f "$COMPOSE_FILE" ]]; then
    echo "Starting dev stack..."
    "$ROOT_DIR/apps/dev/scripts/dev-up.sh"
    echo "Waiting for services to be ready..."
    sleep 10
    # Wait for Postgres
    for _ in $(seq 1 30); do
        if "${DOCKER_COMPOSE[@]}" -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "$DB_USER" >/dev/null 2>&1; then
            break
        fi
        sleep 2
    done
    echo "Seeding database..."
    cat "$ROOT_DIR/scripts/seed/seed.sql" | "${DOCKER_COMPOSE[@]}" -f "$COMPOSE_FILE" exec -T postgres psql "postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
else
    echo "⚠️  Dev compose file not found at ${COMPOSE_FILE}. Please start the dev stack manually."
fi

# Build docs
echo "Building docs (if configured)..."
npm run docs:build --if-present

echo ""
echo "🎉 Bootstrap complete!"
echo ""
echo "Next steps:"
echo "1. Start coding! The dev stack is running."
echo "2. Use 'npm run dev:all' to start application services once they are configured."
echo "3. Run 'npm run test:e2e' to run end-to-end tests."
echo "4. Run 'npm run test' for unit tests."
echo "5. View docs in apps/docs after building."
echo ""
echo "Useful commands:"
echo "- npm run lint        # Lint code"
echo "- npm run typecheck   # Type check"
echo "- npm run build       # Build for production"
echo "- lefthook run pre-commit # Test pre-commit hooks"
echo ""
echo "Happy coding! 🎯"
