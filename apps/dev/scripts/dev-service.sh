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

for entry in "${OPTIONAL_REQUIREMENTS[@]}"; do
  IFS=":" read -r name required_path <<<"$entry"
  if [[ "$SERVICE" == "$name" ]]; then
    if [[ ! -f "$ROOT_DIR/$required_path" ]]; then
      echo "Skipping $SERVICE service; expected $required_path but it was not found." >&2
      echo "Create the service scaffold before running this command." >&2
      exit 0
    fi
    break
  fi
done

if ! running_services=$("${DOCKER_COMPOSE[@]}" -f "$COMPOSE_FILE" ps --services --filter status=running 2>/dev/null); then
  running_services=$("${DOCKER_COMPOSE[@]}" -f "$COMPOSE_FILE" ps --services 2>/dev/null || true)
fi

if ! grep -qx "postgres" <<<"$running_services"; then
  "$ROOT_DIR/apps/dev/scripts/dev-up.sh"
fi

echo "Starting $SERVICE service..."
"${DOCKER_COMPOSE[@]}" -f "$COMPOSE_FILE" up -d "$SERVICE"

echo "Service '$SERVICE' is running."
echo "Stream logs with:"
echo "  ${DOCKER_COMPOSE[*]} -f $COMPOSE_FILE logs -f $SERVICE"
