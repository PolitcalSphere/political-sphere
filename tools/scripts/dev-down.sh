#!/usr/bin/env bash
# ============================================================================
# Political Sphere - Development Environment Shutdown Script
# Stops services and optionally removes volumes/images/orphans.
# Usage: ./scripts/dev-down.sh [--clean] [--orphans] [--images] [--prune] [--hard]
#   --clean      Remove named volumes (DELETES DATA; asks for strong confirm)
#   --orphans    Also remove orphaned containers
#   --images     Remove project images after down
#   --prune      docker system prune -f
#   --hard       Equivalent to: --clean --orphans --images --prune
# ============================================================================

set -euo pipefail

# Colors (TTY only)
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

require_tools() {
  command -v docker >/dev/null 2>&1 || { err "Docker not found."; exit 1; }
  docker info >/dev/null 2>&1 || { err "Docker daemon not running."; exit 1; }
  docker compose version >/dev/null 2>&1 || { err "Docker Compose v2 not found."; exit 1; }
}

load_env() {
  if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$ROOT_DIR/.env" || true
    set +a
  fi
}

# Default a consistent project name; can be overridden by env/flag
PROJECT="${COMPOSE_PROJECT_NAME:-political-sphere}"

show_status() {
  (cd "$ROOT_DIR" && docker compose -p "$PROJECT" ps)
}

list_project_volumes() {
  # List named volumes belonging to the project via compose label
  docker volume ls --filter "label=com.docker.compose.project=$PROJECT" --format "{{.Name}}" || true
}

stop_services() {
  local down_args=("$@")
  info "Stopping services: docker compose -p $PROJECT down ${down_args[*]}"
  (cd "$ROOT_DIR" && docker compose -p "$PROJECT" down "${down_args[@]}")
  ok "Services stopped"
}

remove_images() {
  info "Removing project images..."
  # Remove images that belong to this compose project
  local imgs
  imgs=$(docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}' \
    | awk -v pfx="$PROJECT-" '$1 ~ pfx {print $2}')
  if [ -n "${imgs:-}" ]; then
    docker rmi -f $imgs || true
    ok "Project images removed"
  else
    info "No project images found to remove"
  fi
}

prune_docker() {
  info "Pruning unused Docker resources..."
  docker system prune -f
  ok "Docker resources pruned"
}

confirm_clean() {
  warn "This will remove ALL named volumes for project '$PROJECT' (databases, queues, etc.)."
  local vols; vols=$(list_project_volumes)
  if [ -n "$vols" ]; then
    echo "Volumes to be removed:"
    echo "$vols" | sed 's/^/  - /'
  else
    echo "No project volumes detected."
  fi
  echo
  read -r -p "Type the project name '$PROJECT' to confirm: " ans
  if [ "$ans" != "$PROJECT" ]; then
    info "Volume removal cancelled."
    return 1
  fi
  return 0
}

main() {
  local clean=false orphans=false images=false prune=false hard=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --clean) clean=true; shift ;;
      --orphans) orphans=true; shift ;;
      --images) images=true; shift ;;
      --prune) prune=true; shift ;;
      --hard) hard=true; shift ;;
      -p|--project) PROJECT="$2"; shift 2 ;;
      --help|-h)
        cat <<EOF
Usage: $0 [options]

Options:
  --clean       Remove named volumes (DELETES DATA; confirmation required)
  --orphans     Remove orphaned containers with --remove-orphans
  --images      Remove project images after down
  --prune       docker system prune -f
  --hard        Equivalent to: --clean --orphans --images --prune
  -p, --project <name>  Compose project name (default: political-sphere)
EOF
        exit 0 ;;
      *) err "Unknown option: $1"; exit 1 ;;
    esac
  done

  if $hard; then clean=true; orphans=true; images=true; prune=true; fi

  require_tools
  load_env

  # Build down args
  local down_args=()
  $orphans && down_args+=(--remove-orphans)
  if $clean; then
    if confirm_clean; then
      down_args+=(-v)
    else
      # User refused; fall back to normal down (but keep --remove-orphans if set)
      :
    fi
  fi

  stop_services "${down_args[@]}"
  $images && remove_images
  $prune && prune_docker

  echo
  info "Compose status for project '$PROJECT':"
  show_status
  echo
  ok "Shutdown complete."
}

main "$@"
