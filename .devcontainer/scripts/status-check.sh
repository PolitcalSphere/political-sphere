#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Political Sphere Development Environment Status          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check Docker services
COMPOSE_FILE="${COMPOSE_FILE:-apps/dev/docker/docker-compose.dev.yaml}"

echo "🐳 Docker Services:"
if command -v docker compose &> /dev/null; then
    docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "  ⚠️  Unable to check service status"
else
    echo "  ⚠️  Docker Compose not available"
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
echo ""

echo "📚 Documentation:"
echo "  README.md            - Project overview"
echo "  docs/onboarding.md   - Onboarding guide"
echo "  docs/architecture.md - Architecture docs"
echo ""

# Check if .env needs attention
if [ -f .env ]; then
    if grep -q "changeme" .env 2>/dev/null; then
        echo "⚠️  WARNING: Default passwords detected in .env file!"
        echo "   Please update passwords for security."
        echo ""
    fi
fi

echo "✅ Environment is ready for development!"
echo ""
