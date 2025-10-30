#!/usr/bin/env bash
set -euo pipefail

echo "⏳ Waiting for services to be ready..."

# Get the compose file path
COMPOSE_FILE="${COMPOSE_FILE:-apps/dev/docker/docker-compose.dev.yaml}"

# Function to check service health
check_service() {
    local service=$1
    local max_attempts=60
    local attempt=0
    
    echo "  Checking $service..."
    
    while [ $attempt -lt $max_attempts ]; do
        if docker compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep -q "healthy\|Up"; then
            echo "  ✅ $service is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    
    echo "  ⚠️  $service health check timed out"
    return 1
}

# Wait for critical services
check_service postgres || echo "  ⚠️  Postgres may not be ready"
check_service redis || echo "  ⚠️  Redis may not be ready"

# Optional: Check if we can connect
echo ""
echo "🔌 Testing database connectivity..."
if pg_isready -h postgres -U "${POSTGRES_USER:-political}" > /dev/null 2>&1; then
    echo "  ✅ PostgreSQL connection successful"
else
    echo "  ⚠️  PostgreSQL connection failed (may still be initializing)"
fi

if redis-cli -h redis -a "${REDIS_PASSWORD:-changeme}" ping > /dev/null 2>&1; then
    echo "  ✅ Redis connection successful"
else
    echo "  ⚠️  Redis connection failed (may still be initializing)"
fi

echo ""
echo "✅ Service initialization complete"
