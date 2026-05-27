#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ -z "${DATABASE_URL:-}" && -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "Set DATABASE_URL or SUPABASE_DB_URL before running this script."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required to run the migration script."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to apply the SQL migrations."
  exit 1
fi

cd "${ROOT_DIR}"
node scripts/run-db-migrations.mjs
