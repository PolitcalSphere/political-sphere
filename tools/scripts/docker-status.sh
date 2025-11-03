#!/usr/bin/env bash
# ============================================================================
# Political Sphere - Service Health Check and Status Script
# Checks health/status of services in the Compose project.
# Usage: ./scripts/docker-status.sh [-p|--project <name>]
# Exits non-zero if any service is unhealthy or expected but not running.
# ============================================================================

set -euo pipefail

# Colors (TTY only)
if [ -t 1 ]; then
  GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; BLUE=''; NC=''
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PROJECT="${COMPOSE_PROJECT_NAME:-political-sphere}"

# Service groups (matches your compose)
CORE=(postgres redis keycloak)
APP=(api frontend worker)
TOOLS=(localstack mailhog pgadmin)
OBS=(prometheus grafana)

info()  { echo -e "${BLUE}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
fail()  { echo -e "${RED}[ERR]${NC} $*"; }

require_tools() {
  command -v docker >/dev/null 2>&1 || { fail "Docker not found."; exit 2; }
  docker info >/dev/null 2>&1 || { fail "Docker daemon not running."; exit 2; }
  docker compose version >/dev/null 2>&1 || { fail "Docker Compose v2 not found."; exit 2; }
}

header() {
  echo "================================================================"
  echo "          Political Sphere - Service Status (project: $PROJECT)"
  echo "================================================================"
  echo
}

# Returns: 0 if container exists, 1 otherwise
container_exists() {
  local svc="$1"
  docker compose -p "$PROJECT" ps -a --services | grep -qx "$svc"
}

# Prints one line with health/status; sets global counters
UNHEALTHY=0
MISSING=0

check_service() {
  local svc="$1"

  # Is the service known to compose and started?
  local cid
  cid="$(docker compose -p "$PROJECT" ps -q "$svc" 2>/dev/null || true)"

  if [ -z "$cid" ]; then
    # Not running (might be stopped or not defined)
    if container_exists "$svc"; then
      echo -e "${RED}✗${NC} $svc: ${RED}not running${NC}"
      MISSING=$((MISSING+1))
    else
      echo -e "${YELLOW}•${NC} $svc: ${YELLOW}not in current compose graph${NC}"
    fi
    return
  fi

  # Status + health (health may be absent)
  local status health
  status="$(docker inspect --format='{{.State.Status}}' "$cid" 2>/dev/null || echo "unknown")"
  health="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || echo "none")"

  case "$health" in
    healthy)
      echo -e "${GREEN}✓${NC} $svc: ${GREEN}healthy${NC} ($status)"
      ;;
    unhealthy)
      echo -e "${RED}✗${NC} $svc: ${RED}unhealthy${NC} ($status)"
      UNHEALTHY=$((UNHEALTHY+1))
      ;;
    none)
      # No healthcheck configured
      if [ "$status" = "running" ]; then
        echo -e "${YELLOW}⟳${NC} $svc: ${YELLOW}running (no healthcheck)${NC}"
      else
        echo -e "${RED}✗${NC} $svc: ${RED}$status (no healthcheck)${NC}"
        UNHEALTHY=$((UNHEALTHY+1))
      fi
      ;;
    *)
      echo -e "${YELLOW}?${NC} $svc: ${YELLOW}$health${NC} ($status)"
      ;;
  esac
}

section() {
  local title="$1"; shift
  local services=("$@")
  echo "$title"
  for s in "${services[@]}"; do
    check_service "$s"
  done
  echo
}

resource_usage() {
  echo "----------------------------------------------------------------"
  echo "Resource Usage:"
  echo "----------------------------------------------------------------"
  # Limit stats to this compose project
  local ids
  ids="$(docker ps -q --filter "label=com.docker.compose.project=$PROJECT" || true)"
  if [ -z "$ids" ]; then
    echo "No services running"
  else
    # shellcheck disable=SC2086
    docker stats --no-stream $ids \
      --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
  fi
  echo
}

quick_help() {
  echo "----------------------------------------------------------------"
  echo "Quick Commands:"
  echo "----------------------------------------------------------------"
  echo "  View logs:     docker compose -p $PROJECT logs -f <service>"
  echo "  Restart:       docker compose -p $PROJECT restart <service>"
  echo "  Shell access:  docker compose -p $PROJECT exec <service> sh"
  echo "  Stop all:      docker compose -p $PROJECT down"
  echo
}

main() {
  # Args
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -p|--project) PROJECT="$2"; shift 2 ;;
      -h|--help)
        echo "Usage: $0 [-p|--project <name>]"
        exit 0 ;;
      *) fail "Unknown option: $1"; exit 1 ;;
    esac
  done

  require_tools
  cd "$ROOT_DIR"

  header
  section "Core Infrastructure:" "${CORE[@]}"
  section "Application Services:" "${APP[@]}"
  section "Development Tools:" "${TOOLS[@]}"
  section "Observability:" "${OBS[@]}"

  resource_usage
  quick_help

  # Exit code reflects health
  if [ "$UNHEALTHY" -gt 0 ] || [ "$MISSING" -gt 0 ]; then
    warn "Unhealthy or missing services: unhealthy=$UNHEALTHY missing=$MISSING"
    exit 1
  fi
  ok "All checked services look good."
}

main "$@"
