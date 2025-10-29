#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
COMPOSE_FILE="$ROOT_DIR/apps/dev/docker/docker-compose.dev.yaml"

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker-compose)
else
  echo "Docker Compose is required but was not found." >&2
  exit 1
fi

if [[ -f "$ROOT_DIR/.env" ]]; then
  source "$ROOT_DIR/.env"
fi
if [[ -f "$ROOT_DIR/.env.local" ]]; then
  source "$ROOT_DIR/.env.local"
fi

COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-politicalsphere}
export COMPOSE_PROJECT_NAME

echo "Stopping Political Sphere local stack..."
"${DOCKER_COMPOSE[@]}" -f "$COMPOSE_FILE" down --remove-orphans --volumes
