#!/usr/bin/env bash
# ============================================================================
# Political Sphere - Development Environment Startup Script
# Starts Docker services with sensible defaults on macOS (16GB RAM, 6-core CPU)
# Usage: ./scripts/dev-up.sh [--minimal|--monitoring|--full]
# ============================================================================

set -euo pipefail

# Colors (disable if not a TTY)
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; NC=''
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()      { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARNING]${NC} $*"; }
err()     { echo -e "${RED}[ERROR]${NC} $*"; }

banner() {
  cat << 'EOF'
    ____        ___ __  _           __   _____       __
   / __ \____  / (_) /_(_)________ _/ /  / ___/____  / /_  ___  _________
  / /_/ / __ \/ / / __/ / ___/ __ `/ /   \__ \/ __ \/ __ \/ _ \/ ___/ _ \
 / ____/ /_/ / / / /_/ / /__/ /_/ / /   ___/ / /_/ / / / /  __/ /  /  __/
/_/    \____/_/_/\__/_/\___/\__,_/_/   /____/ .___/_/ /_/\___/_/   \___/
                                            /_/
EOF
  echo
  echo "Development Environment Startup — Optimized for MBP (16GB RAM, 6-core CPU)"
  echo "=========================================================================="
  echo
}

require_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    err "Docker is not installed. Please install Docker Desktop."
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    err "Docker daemon is not running. Please start Docker Desktop."
    exit 1
  fi
  ok "Docker is running"
}

require_compose() {
  if ! docker compose version >/dev/null 2>&1; then
    err "Docker Compose v2 is not available. Please update Docker Desktop."
    exit 1
  fi
  ok "Docker Compose is available"
}

ensure_env_file() {
  if [ ! -f "$ROOT_DIR/.env" ]; then
    warn ".env not found. Creating from .env.example..."
    if [ -f "$ROOT_DIR/.env.example" ]; then
      cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
      ok "Created .env. Review values before first run."
    else
      err ".env.example not found. Cannot create .env."
      exit 1
    fi
  else
    ok ".env file found"
  fi
}

load_env_into_shell() {
  # Export .env for this process so 'docker compose' sees them consistently
  set -a
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.env" || true
  set +a
}

resource_hints() {
  info "Checking system resources..."
  local total_mem_gb=""; local docker_mem_gb=""; local docker_cpus=""

  if command -v sysctl >/dev/null 2>&1; then
    total_mem_gb="$(sysctl -n hw.memsize 2>/dev/null | awk '{print int($1/1024/1024/1024)}')"
    [ -n "$total_mem_gb" ] && info "Host memory: ${total_mem_gb}GB"
    if [ -n "$total_mem_gb" ] && [ "$total_mem_gb" -lt 12 ]; then
      warn "Less than 12GB system RAM detected — consider '--minimal'."
    fi
  fi

  docker_mem_gb="$(docker info --format '{{.MemTotal}}' 2>/dev/null | awk '{print int($1/1024/1024/1024)}')"
  docker_cpus="$(docker info --format '{{.NCPU}}' 2>/dev/null || true)"
  [ -n "$docker_cpus" ] && info "Docker CPUs allocated: ${docker_cpus}"
  [ -n "$docker_mem_gb" ] && info "Docker memory allocated: ${docker_mem_gb}GB"

  if [ -n "$docker_mem_gb" ] && [ "$docker_mem_gb" -lt 8 ]; then
    warn "Docker has < 8GB memory: Settings → Resources → Increase memory for smoother dev."
  fi
}

ports_in_use() {
  # Warn about common ports
  local ports=(3000 4000 8080 9090 3001 8025 5050 5432 6379 4566)
  local busy=""
  for p in "${ports[@]}"; do
    if lsof -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
      busy+="$p "
    fi
  done
  if [ -n "$busy" ]; then
    warn "These ports are already in use on localhost: $busy"
    warn "You may need to stop conflicting services or adjust your compose ports."
  fi
}

start_services() {
  local mode="$1"
  cd "$ROOT_DIR"

  # Map modes to service sets + profiles.
  # If you added profiles in compose:
  #   obs -> prometheus,grafana
  #   tools -> pgadmin,mailhog,localstack
  local args=(up -d --wait --wait-timeout 180)
  local services=()

  case "$mode" in
    minimal)
      info "Starting minimal infra: postgres, redis, keycloak"
      services=(postgres redis keycloak)
      ;;
    monitoring)
      info "Starting infra + observability"
      args+=(--profile obs)
      services=(postgres redis keycloak prometheus grafana)
      ;;
    full)
      info "Starting all services (including tools)"
      args+=(--profile obs --profile tools)
      # Let compose decide the full graph
      ;;
    *)
      info "Starting core stack: postgres, redis, keycloak, api, frontend, worker"
      services=(postgres redis keycloak api frontend worker)
      ;;
  esac

  if [ "${#services[@]}" -gt 0 ]; then
    docker compose "${args[@]}" "${services[@]}"
  else
    docker compose "${args[@]}"
  fi
}

show_status() {
  echo
  info "Service endpoints:"
  echo "  🌐 Frontend     http://localhost:3000"
  echo "  🔧 API          http://localhost:4000"
  echo "  🔐 Keycloak     http://localhost:8080"
  echo "  📊 Grafana      http://localhost:3001"
  echo "  📈 Prometheus   http://localhost:9090"
  echo "  📧 MailHog      http://localhost:8025"
  echo "  🗄️  pgAdmin      http://localhost:5050"
  echo "  🗄️  PostgreSQL   localhost:5432"
  echo "  🔴 Redis        localhost:6379"
  echo "  ☁️  LocalStack   http://localhost:4566"
  echo
  info "Logs: docker compose logs -f <service>"
  info "Stop: docker compose down"
  echo
}

main() {
  local mode="default"

  while [ $# -gt 0 ]; do
    case "$1" in
      --minimal) mode="minimal"; shift ;;
      --monitoring) mode="monitoring"; shift ;;
      --full) mode="full"; shift ;;
      --help|-h)
        cat <<EOF
Usage: $0 [options]

Options:
  --minimal     Start only core infrastructure (postgres, redis, keycloak)
  --monitoring  Include observability stack (prometheus, grafana) [uses profile 'obs' if present]
  --full        Start everything including dev tools [uses profiles 'obs' and 'tools' if present]
  -h, --help    Show this help
EOF
        exit 0
        ;;
      *)
        err "Unknown option: $1"
        echo "Use --help for usage."
        exit 1
        ;;
    esac
  done

  trap 'echo; warn "Interrupted. Services remain running. Use: docker compose ps / docker compose down"; echo' INT

  banner
  require_docker
  require_compose
  ensure_env_file
  load_env_into_shell
  resource_hints
  ports_in_use

  info "Starting Political Sphere development environment (mode: $mode)"
  # This will fail fast if any healthcheck goes unhealthy.
  # If services lack healthchecks, Compose still returns success after containers are up.
  if ! start_services "$mode"; then
    err "Startup failed. Inspect with: docker compose ps && docker compose logs --since=2m"
    exit 1
  fi

  # Optional post-check: flag services without healthchecks (nice to know)
  if docker compose ps --format json >/dev/null 2>&1; then
    missing=$(docker compose ps --format json \
      | awk 'BEGIN{found=0} /"Health":null/{found=1} END{if(found)print "yes"}')
    [ "$missing" = "yes" ] && warn "Some services have no healthcheck configured (that may be fine in dev)."
  fi

  show_status
  ok "Development environment is ready!"
}

main "$@"
