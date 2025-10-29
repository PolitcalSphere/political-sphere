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
  echo "psql not found in PATH. Install PostgreSQL client or run seeds inside the DB container."
  echo "You can run: docker exec -i <db-container> psql \"$PSQL_CONN\" -f scripts/seed/seed.sql"
  exit 2
fi

echo "Seeding database at $PSQL_CONN"

# psql accepts a connection string via the environment variable PGPASSWORD and host/db flags, but
# we'll use the connection string via --dbname for simplicity.
PGPASSWORD="${POSTGRES_PASSWORD}" psql "$PSQL_CONN" -f scripts/seed/seed.sql

echo "Seed complete."
