#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: dev-service.sh <service|all>

Examples:
  dev-service.sh all        # Bring up the baseline development stack
  dev-service.sh api        # Start the API service (requires apps/api/Dockerfile)
  dev-service.sh frontend   # Start the frontend service (requires apps/frontend/Dockerfile)
  dev-service.sh worker     # Start the worker service (requires apps/worker/Dockerfile)
USAGE
}

if [[ $# -lt 1 ]]; then
  usage
  exit 64
fi

SERVICE=$1
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

COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-politicalsphere}
export COMPOSE_PROJECT_NAME

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found at $COMPOSE_FILE" >&2
  exit 66
fi

if [[ "$SERVICE" == "all" ]]; then
  "$ROOT_DIR/apps/dev/scripts/dev-up.sh"
  exit 0
fi

OPTIONAL_REQUIREMENTS=(
  "api:apps/api/Dockerfile"
  "frontend:apps/frontend/Dockerfile"
  "worker:apps/worker/Dockerfile"
)

SERVICE_FOUND=false
for entry in "${OPTIONAL_REQUIREMENTS[@]}"; do
  IFS=":" read -r name required_path <<<"$entry"
  if [[ "$SERVICE" == "$name" ]]; then
    SERVICE_FOUND=true
    if [[ ! -f "$ROOT_DIR/$required_path" ]]; then
      echo "❌ ERROR: Cannot start $SERVICE service" >&2
      echo "" >&2
      echo "Expected file not found: $required_path" >&2
      echo "" >&2
      echo "To fix this:" >&2
      echo "  1. Create the service scaffold in apps/$SERVICE/" >&2
      echo "  2. Add a Dockerfile at $required_path" >&2
      echo "  3. Or run a different service: api, frontend, worker, all" >&2
      echo "" >&2
      exit 1
    fi
    break
  fi
done

if [[ "$SERVICE_FOUND" == "false" && "$SERVICE" != "all" ]]; then
  echo "❌ ERROR: Unknown service '$SERVICE'" >&2
  echo "" >&2
  echo "Available services: api, frontend, worker, all" >&2
  echo "" >&2
  usage
  exit 1
fi

if ! running_services=$("${DOCKER_COMPOSE[@]}" -f "$COMPOSE_FILE" ps --services --filter status=running 2>/dev/null); then
  running_services=$("${DOCKER_COMPOSE[@]}" -f "$COMPOSE_FILE" ps --services 2>/dev/null || true)
fi

if ! grep -qx "postgres" <<<"$running_services"; then
  echo "🚀 Base infrastructure not running. Starting dev stack first..."
  if ! "$ROOT_DIR/apps/dev/scripts/dev-up.sh"; then
    echo "❌ ERROR: Failed to start base dev stack." >&2
    exit 1
  fi
fi

echo "🚀 Starting $SERVICE service..."
if ! "${DOCKER_COMPOSE[@]}" -f "$COMPOSE_FILE" up -d "$SERVICE"; then
  echo "❌ ERROR: Failed to start $SERVICE service." >&2
  echo "" >&2
  echo "Check:" >&2
  echo "  - Docker is running: docker ps" >&2
  echo "  - Compose file exists: $COMPOSE_FILE" >&2
  echo "  - Service is defined in docker-compose.dev.yaml" >&2
  echo "" >&2
  exit 1
fi

echo "✅ Service '$SERVICE' is running."
echo ""
echo "Stream logs with:"
echo "  ${DOCKER_COMPOSE[*]} -f $COMPOSE_FILE logs -f $SERVICE"
echo ""
echo "Stop with:"
echo "  ${DOCKER_COMPOSE[*]} -f $COMPOSE_FILE down"
