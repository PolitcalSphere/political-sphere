#!/usr/bin/env bash
# ============================================================================
# Political Sphere - Database Seeding Script (dev)
# Seeds the database with initial data for development.
# Usage: ./scripts/seed-db.sh [--project name] [--file path/to/seeds.sql]
# ============================================================================

set -euo pipefail

# Colors only if TTY
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

PROJECT="${COMPOSE_PROJECT_NAME:-political-sphere}"
SEED_FILE=""

# Load .env so we can use the same values compose uses
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$ROOT_DIR/.env" || true
  set +a
fi

# Defaults match your compose file
PGUSER="${POSTGRES_USER:-political}"
PGDB="${POSTGRES_DB:-political_dev}"
PGPASS="${POSTGRES_PASSWORD:-changeme}"
PGHOST="postgres"
PGPORT="5432"
PGSCHEMA="${PGSCHEMA:-public}"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --project|-p) PROJECT="$2"; shift 2 ;;
    --file|-f) SEED_FILE="$2"; shift 2 ;;
    --help|-h)
      cat <<EOF
Usage: $0 [options]

Options:
  -p, --project <name>   Compose project name (default: ${PROJECT})
  -f, --file <path>      Use a custom SQL seed file instead of the inline seed
  -h, --help             Show this help
EOF
      exit 0 ;;
    *) err "Unknown option: $1"; exit 1 ;;
  esac
done

require_tools() {
  command -v docker >/dev/null 2>&1 || { err "Docker not found."; exit 1; }
  docker compose version >/dev/null 2>&1 || { err "Docker Compose v2 not found."; exit 1; }
}

ensure_postgres_up() {
  info "Checking PostgreSQL container health..."
  # Verify container exists and is running
  if ! docker compose -p "$PROJECT" ps postgres >/dev/null 2>&1; then
    err "Compose project '$PROJECT' or service 'postgres' not found. Start services first."
    exit 1
  fi
  # Use pg_isready inside the container
  if ! docker compose -p "$PROJECT" exec -T postgres \
      pg_isready -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDB" >/dev/null 2>&1; then
    err "PostgreSQL not ready. Start stack first (e.g., ./scripts/dev-up.sh)."
    exit 1
  fi
  ok "PostgreSQL is ready"
}

run_migrations() {
  info "Running database migrations (if configured)..."
  # Prefer a package script if present
  if docker compose -p "$PROJECT" exec -T api sh -lc "npm -w apps/api run | grep -qE '^ *migrate'" >/dev/null 2>&1; then
    docker compose -p "$PROJECT" exec -T api sh -lc "npm run -w apps/api migrate" || true
    ok "Migrations executed via npm script"
    return
  fi
  # Fallback to your legacy script if it exists
  if [ -f "$ROOT_DIR/apps/api/src/migrations.js" ]; then
    docker compose -p "$PROJECT" exec -T api node apps/api/src/migrations.js || true
    ok "Migrations executed via apps/api/src/migrations.js"
  else
    info "No migration script found; skipping."
  fi
}

psql_exec_stdin() {
  # Ensure errors stop the run
  PGPASSWORD="$PGPASS" docker compose -p "$PROJECT" exec -T postgres \
    psql -v ON_ERROR_STOP=1 \
         -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDB" \
         -v schema="$PGSCHEMA"
}

seed_inline_sql() {
  info "Seeding database with inline dev data..."
  psql_exec_stdin <<'SQL'
-- Idempotent seed for Political Sphere (dev)
-- Uses :schema psql variable (defaults to 'public')

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_setting('search_path')::text
       OR table_schema = current_schema()
  ) THEN
    -- nothing: this block ensures current_schema is set
    NULL;
  END IF;
END $$;

-- users
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'users'
  ) THEN
    INSERT INTO users (id, username, email, created_at)
    VALUES
      ('user-1', 'admin', 'admin@political-sphere.local', NOW()),
      ('user-2', 'test_user', 'test@political-sphere.local', NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- news
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'news'
  ) THEN
    INSERT INTO news (id, title, excerpt, content, category, created_at)
    VALUES
      ('news-1', 'Test Policy 1', 'Test excerpt 1', 'Test content 1', 'policy', NOW()),
      ('news-2', 'Test Policy 2', 'Test excerpt 2', 'Test content 2', 'legislation', NOW())
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
SQL
  ok "Inline seed applied"
}

seed_from_file() {
  local file="$1"
  [ -f "$file" ] || { err "Seed file not found: $file"; exit 1; }
  info "Seeding database from file: $file"
  PGPASSWORD="$PGPASS" docker compose -p "$PROJECT" exec -T postgres \
    psql -v ON_ERROR_STOP=1 \
         -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDB" \
         -f "/tmp/seed.sql" \
    <"$file"
  ok "Seed file applied"
}

main() {
  require_tools
  ensure_postgres_up
  run_migrations

  if [ -n "$SEED_FILE" ]; then
    seed_from_file "$SEED_FILE"
  else
    seed_inline_sql
  fi

  echo
  ok "Database seeding complete!"
  info "Tip: re-run with -f path/to/seeds.sql for larger datasets."
}

main "$@"
