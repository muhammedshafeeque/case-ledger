# Native install (no Docker)

## Quick start

```bash
./install.sh
```

Requires **Ubuntu / Debian** for automatic dependency installation. On other Linux distros, install dependencies manually then run `./install.sh --skip-deps`.

## What the installer does

1. **Checks / installs system packages**
   - Node.js 20+ (NodeSource if needed)
   - PostgreSQL + client
   - Redis
   - Chromium (PDF reports)
   - Tesseract OCR
   - build tools (`curl`, `openssl`, etc.)

2. **PostgreSQL** — runs `server/scripts/setup-postgres.sh`
   - User: `rtiwatch` / `rtiwatch_dev`
   - Database: `rti_watch`
   - Extension: `pg_trgm`

3. **MinIO** — `scripts/setup-minio-native.sh`
   - Binary to `/usr/local/bin` or `~/.local/bin`
   - Data: `data/minio/`
   - Buckets: `rti-watch-evidence-dev`, `rti-watch-backups-dev`

4. **Configuration**
   - `server/.env` — generated secrets (`JWT_SECRET`, `ENCRYPTION_KEY`) if missing
   - `client/.env` — `VITE_API_URL=http://localhost:3001`

5. **Application**
   - `npm install` in `server/` and `client/`
   - `prisma generate`, `migrate deploy`, reference SQLite push, seed

## Environment overrides

```bash
DB_USER=myuser DB_PASS=secret DB_NAME=case_ledger ./install.sh
FORCE_ENV=1 ./install.sh          # regenerate server/.env
INSTALL_DEPS=false ./install.sh   # same as --skip-deps
```

## After install

```bash
./scripts/start-dev-services.sh   # postgres + redis + minio
cd server && npm run dev
cd server && npm run dev:worker
cd client && npm run dev
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| MinIO not running | `tail -f data/minio/minio.log` then `./scripts/setup-minio-native.sh` |
| Redis connection refused | `sudo systemctl start redis-server` |
| PDF export fails | Set `PUPPETEER_EXECUTABLE_PATH` in `server/.env` to your Chromium path |
| npm peer dependency errors | Installer uses `npm install --legacy-peer-deps` in server |

## Manual path (without install.sh)

See [POSTGRES_LOCAL.md](./POSTGRES_LOCAL.md).
