#!/usr/bin/env bash
set -euo pipefail

# Lightweight seeder that uses psql. Intentionally avoids Node deps.
# Expects DATABASE_URL env var or POSTGRES_* variables.

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
cd "$ROOT_DIR"

: "${POSTGRES_USER:=political}"
: "${POSTGRES_PASSWORD:=changeme}"
: "${POSTGRES_DB:=political_dev}"
: "${POSTGRES_HOST:=localhost}"
: "${POSTGRES_PORT:=5432}"

if [[ -n "${DATABASE_URL:-}" ]]; then
  PSQL_CONN="$DATABASE_URL"
else
  PSQL_CONN="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "❌ ERROR: psql not found in PATH." >&2
  echo "" >&2
  echo "To fix this:" >&2
  echo "  1. Install PostgreSQL client: brew install postgresql (macOS) or apt-get install postgresql-client (Linux)" >&2
  echo "  2. Or run seeds inside the DB container:" >&2
  echo "     docker exec -i <db-container> psql \"$PSQL_CONN\" -f scripts/seed/seed.sql" >&2
  echo "" >&2
  exit 2
fi

echo "🌱 Seeding database at $PSQL_CONN"

# Test connection first
if ! PGPASSWORD="${POSTGRES_PASSWORD}" psql "$PSQL_CONN" -c "SELECT 1" >/dev/null 2>&1; then
  echo "❌ ERROR: Cannot connect to database at $PSQL_CONN" >&2
  echo "" >&2
  echo "Check that:" >&2
  echo "  - PostgreSQL is running (try: docker ps | grep postgres)" >&2
  echo "  - Connection details are correct (POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD)" >&2
  echo "  - Database '$POSTGRES_DB' exists" >&2
  echo "" >&2
  exit 3
fi

# Run seed file
if ! PGPASSWORD="${POSTGRES_PASSWORD}" psql "$PSQL_CONN" -f scripts/seed/seed.sql; then
  echo "❌ ERROR: Seed script failed. Check scripts/seed/seed.sql for syntax errors." >&2
  exit 4
fi

echo "✅ Seed complete."
