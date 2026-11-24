#!/usr/bin/env bash
# Run the migration set and the four-persona RLS suite against a disposable
# PostgreSQL 16 container. This approximates Supabase's roles and auth.uid()
# without touching a hosted project.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE="${POSTGRES_IMAGE:-postgres:16-alpine}"
CONTAINER="solace-rls-$$"
DB="solace"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to run the RLS suite" >&2
  exit 1
fi

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --rm -d \
  --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB="$DB" \
  "$IMAGE" >/dev/null

ready=0
for _ in $(seq 1 30); do
  if docker exec "$CONTAINER" psql -U postgres -d "$DB" -c 'select 1' >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo "PostgreSQL container did not become ready" >&2
  exit 1
fi

psql_run() {
  docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -U postgres -d "$DB"
}

psql_run < "$ROOT/supabase/tests/00_bootstrap.sql"

for migration in "$ROOT"/supabase/migrations/*.sql; do
  name="$(basename "$migration")"
  if [[ "$name" == 001_* ]]; then
    # pg_cron is a Supabase-managed extension and is not present in the stock
    # PostgreSQL image. The migration only uses it in commented-out SQL.
    sed '/CREATE EXTENSION IF NOT EXISTS "pg_cron";/d' "$migration" | psql_run
  else
    psql_run < "$migration"
  fi
done

psql_run < "$ROOT/supabase/tests/10_seed.sql"
psql_run < "$ROOT/supabase/tests/20_rls.sql"

echo "RLS suite passed."
