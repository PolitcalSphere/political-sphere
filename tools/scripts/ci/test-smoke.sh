#!/usr/bin/env bash
# Quick smoke tests used by CI before promoting a canary
set -euo pipefail

echo "Running smoke checks against staging..."

# API health
curl -fsS https://staging-api.political-sphere.com/healthz || { echo "API health check failed"; exit 2; }

# Frontend availability
curl -fsS -I https://staging.political-sphere.com || { echo "Frontend availability check failed"; exit 3; }

# Database connectivity (via API)
curl -fsS https://staging-api.political-sphere.com/healthz/database || { echo "Database health check failed"; exit 4; }

# Dependencies
curl -fsS https://staging-api.political-sphere.com/healthz/dependencies || { echo "Dependencies health check failed"; exit 5; }

echo "Smoke checks passed"
