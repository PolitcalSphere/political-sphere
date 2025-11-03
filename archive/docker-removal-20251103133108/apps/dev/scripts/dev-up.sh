#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
ENV_FILE="$ROOT_DIR/.env"
LOCAL_ENV_FILE="$ROOT_DIR/.env.local"

if [[ -f "$ENV_FILE" ]]; then
  source "$ENV_FILE"
fi
if [[ -f "$LOCAL_ENV_FILE" ]]; then
  source "$LOCAL_ENV_FILE"
fi

COMPOSE_FILE="$ROOT_DIR/apps/dev/docker/docker-compose.dev.yaml"

if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE=(docker-compose)
else
  echo "Docker Compose is required but was not found." >&2
  exit 1
fi
COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-politicalsphere}

export COMPOSE_PROJECT_NAME

BASE_SERVICES=(postgres redis localstack mailhog pgadmin auth prometheus grafana node-exporter)
SERVICES=("${BASE_SERVICES[@]}")
OPTIONAL_SERVICES=(
  "api:apps/api/Dockerfile:API service"
  "frontend:apps/frontend/Dockerfile:Frontend application"
  "worker:apps/worker/Dockerfile:Worker service"
)

for entry in "${OPTIONAL_SERVICES[@]}"; do
  IFS=":" read -r service path description <<<"$entry"
  if [[ -f "$ROOT_DIR/$path" ]]; then
    SERVICES+=("$service")
  else
    echo "Skipping $description; expected $path but it was not found."
  fi
done

echo "Starting Political Sphere local stack..."
"${DOCKER_COMPOSE[@]}" -f "$COMPOSE_FILE" up -d --build --remove-orphans "${SERVICES[@]}"

echo "Services running. Use ./apps/dev/scripts/dev-down.sh to stop."
