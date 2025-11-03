#!/bin/bash
# scripts/bootstrap-fullstack-dev.sh
# Ensures all required infrastructure and app servers for fullstack development are running.
# Run this at the start of every dev session for a complete environment.

set -e

# Bootstrap core infrastructure (AI, monitoring, etc.)
./scripts/bootstrap-dev.sh

# Start frontend dev server if not running
if ! pgrep -f 'nx serve frontend' > /dev/null; then
  echo "Starting frontend dev server..."
  nohup npx nx serve frontend > apps/frontend/frontend-dev.log 2>&1 &
fi

# Start API/backend dev server if not running
if ! pgrep -f 'nx serve api' > /dev/null; then
  echo "Starting API dev server..."
  nohup npx nx serve api > apps/api/api-dev.log 2>&1 &
fi

# Start worker/remote/host dev servers if present
for svc in worker remote host; do
  if [ -d "apps/$svc" ] && ! pgrep -f "nx serve $svc" > /dev/null; then
    echo "Starting $svc dev server..."
    nohup npx nx serve $svc > apps/$svc/${svc}-dev.log 2>&1 &
  fi
done

# Start database (if docker-compose file exists)
if [ -f data/docker-compose.yml ]; then
  echo "Starting local database via Docker Compose..."
  docker compose -f data/docker-compose.yml up -d
fi

# Start Storybook/docs server if present
if [ -f libs/ui/.storybook/main.js ] && ! pgrep -f 'nx storybook ui' > /dev/null; then
  echo "Starting Storybook for UI library..."
  nohup npx nx storybook ui > libs/ui/storybook.log 2>&1 &
fi

# Start test watcher for API (optional, comment out if not needed)
# if ! pgrep -f 'nx test api --watch' > /dev/null; then
#   echo "Starting API test watcher..."
#   nohup npx nx test api --watch > apps/api/api-test-watch.log 2>&1 &
# fi

# Start linter/formatter daemon (optional, comment out if not needed)
# if ! pgrep -f 'nx lint' > /dev/null; then
#   echo "Starting linter daemon..."
#   nohup npx nx lint apps/api --watch > apps/api/api-lint.log 2>&1 &
# fi

echo "All fullstack development infrastructure and app servers are running."
