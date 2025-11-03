#!/bin/bash
# scripts/bootstrap-dev.sh
# Ensures all required infrastructure for fast AI/dev sessions is running.
# Run this at the start of every dev session (or add to onboarding/Makefile/pre-hook)

set -e

# Start Docker Desktop if not running
docker info > /dev/null 2>&1 || {
  echo "Starting Docker Desktop..."
  open -a Docker || echo "Please start Docker Desktop manually if this fails."
  # Wait for Docker to be ready
  while ! docker info > /dev/null 2>&1; do
    sleep 2
done
}

# Start monitoring stack (Grafana, Prometheus, Otel Collector, Jaeger)
echo "Starting monitoring stack via Docker Compose..."
docker compose -f monitoring/docker-compose.yml up -d

# Start semantic code index server if not running
if ! pgrep -f scripts/ai/index-server.js > /dev/null; then
  echo "Starting semantic code index server..."
  nohup node scripts/ai/index-server.js > ai-cache/index-server.log 2>&1 &
fi

# Start AI cache/context preloader if not running
if ! pgrep -f scripts/ai/context-preloader.js > /dev/null; then
  echo "Starting AI cache/context preloader..."
  nohup node scripts/ai/context-preloader.js preload > ai-cache/context-preloader.log 2>&1 &
fi

# Start AI metrics server if present and not running
if [ -f ai-metrics/metrics-server.js ] && ! pgrep -f ai-metrics/metrics-server.js > /dev/null; then
  echo "Starting AI metrics server..."
  nohup node ai-metrics/metrics-server.js > ai-metrics/metrics-server.log 2>&1 &
fi

# Start Nx daemon if not running
if ! pgrep -f 'npx nx daemon' > /dev/null; then
  echo "Starting Nx daemon..."
  nohup npx nx daemon > nx-daemon.log 2>&1 &
fi

echo "All required infrastructure is running."
