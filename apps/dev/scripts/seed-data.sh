#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  source .env
fi
if [[ -f .env.local ]]; then
  source .env.local
fi

: "${POSTGRES_USER:=political}"
: "${POSTGRES_PASSWORD:=changeme}"
: "${POSTGRES_DB:=political_dev}"

export DATABASE_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}"

if [[ -f package.json ]]; then
  if npm run | grep -q "prisma"; then
    echo "Running Prisma migrations..."
    npx prisma migrate deploy
    echo "Seeding database..."
    npx prisma db seed || true
  elif npm run | grep -q "db:migrate"; then
    echo "Running npm run db:migrate"
    npm run db:migrate
  else
    echo "No known migration commands found; skipping." >&2
  fi
else
  echo "package.json not found; skipping application migrations." >&2
fi

# Run TypeScript seeding script
if [[ -f apps/dev/scripts/seed-dev-data.ts ]]; then
  echo "Running TypeScript seed script..."
  npx tsx apps/dev/scripts/seed-dev-data.ts "$@"
else
  echo "TypeScript seed script not found; skipping." >&2
fi

cat <<MSG
Seed complete.
 - Database URL: $DATABASE_URL
 - Redis URL: redis://default:${REDIS_PASSWORD:-changeme}@localhost:6379/0
MSG
