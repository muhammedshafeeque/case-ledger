#!/usr/bin/env bash
# Run once with: sudo bash scripts/setup-postgres.sh
# Creates RTI Watch PostgreSQL role + database (local dev, no Docker).

set -euo pipefail

DB_USER="${DB_USER:-rtiwatch}"
DB_PASS="${DB_PASS:-rtiwatch_dev}"
DB_NAME="${DB_NAME:-rti_watch}"

echo "==> Ensuring PostgreSQL is running..."
systemctl enable postgresql 2>/dev/null || true
systemctl start postgresql 2>/dev/null || service postgresql start 2>/dev/null || true

echo "==> Creating role and database..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

sudo -u postgres psql -v ON_ERROR_STOP=1 -d "${DB_NAME}" <<SQL
CREATE EXTENSION IF NOT EXISTS pg_trgm;
GRANT ALL ON SCHEMA public TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
SQL

echo ""
echo "PostgreSQL ready."
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}?connection_limit=10"
echo ""
echo "Next (as your user, no sudo):"
echo "  cd server && npm run db:migrate && USE_PGLITE= npx tsx prisma/seed.ts && npm run dev"
