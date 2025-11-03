#!/bin/bash
# Smoke test for AI tools
# Usage: ./scripts/ai/smoke.sh

set -e

echo "Running AI tools smoke test..."

# Test code indexer
echo "Testing code indexer..."
node scripts/ai/code-indexer.js build
node scripts/ai/code-indexer.js search "function"

# Test context preloader
echo "Testing context preloader..."
node scripts/ai/context-preloader.js preload
node scripts/ai/context-preloader.js get config

# Test competence monitor
echo "Testing competence monitor..."
node scripts/ai/competence-monitor.js assess

# Test index server (start/stop quickly)
echo "Testing index server..."
node scripts/ai/index-server.js &
SERVER_PID=$!
sleep 3

# Test health endpoint
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
if [[ $HEALTH_RESPONSE == *"ok"* ]]; then
  echo "Health check passed"
else
  echo "Health check failed: $HEALTH_RESPONSE"
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

# Test search endpoint with validation
SEARCH_RESPONSE=$(curl -s "http://localhost:3001/search?q=function")
if [[ $SEARCH_RESPONSE == *"results"* ]]; then
  echo "Search test passed"
else
  echo "Search test failed: $SEARCH_RESPONSE"
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

# Test invalid search (empty query)
INVALID_RESPONSE=$(curl -s "http://localhost:3001/search?q=")
if [[ $INVALID_RESPONSE == *"400"* ]] || [[ $INVALID_RESPONSE == *"required"* ]]; then
  echo "Invalid search validation passed"
else
  echo "Invalid search validation failed: $INVALID_RESPONSE"
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

# Test metrics endpoint
METRICS_RESPONSE=$(curl -s "http://localhost:3001/metrics")
if [[ $METRICS_RESPONSE == *"files"* ]]; then
  echo "Metrics test passed"
else
  echo "Metrics test failed: $METRICS_RESPONSE"
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

kill $SERVER_PID 2>/dev/null || true

echo "All AI tools smoke tests passed!"
