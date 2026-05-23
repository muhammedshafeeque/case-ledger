# Case Ledger

Investigator-only platform for government accountability probes (RTI, procurement, audit, and general investigations). PostgreSQL + Prisma, deterministic rule engine, on-demand Groq AI.

## Projects

| Directory | Description | Port |
|-----------|-------------|------|
| `server/` | Express API + BullMQ worker | 3001 |
| `client/` | Investigator React app | 5173 |
| `docker/` | Postgres, Redis, prod compose | — |

## Run locally (no Docker)

### One-command install (Ubuntu / Debian)

From the repo root (installs PostgreSQL, Redis, MinIO, Node 20+, writes `.env`, migrates DB):

```bash
chmod +x install.sh
./install.sh
```

Options:

| Flag | Effect |
|------|--------|
| `--skip-deps` | Skip `apt` / NodeSource; only npm, `.env`, DB |
| `--skip-seed` | Skip `prisma/seed.ts` |
| `--skip-minio` | Skip MinIO binary + buckets |

Start services after reboot:

```bash
./scripts/start-dev-services.sh
```

Then run API, worker, and client (see installer output).

### Option A — Local PostgreSQL (recommended if installed)

```bash
# One-time (requires sudo)
sudo apt install --reinstall -y postgresql postgresql-contrib postgresql-client
cd server && sudo bash scripts/setup-postgres.sh

npm run db:generate && npm run db:migrate && npx tsx prisma/seed.ts
npm run dev   # do NOT set USE_PGLITE
```

See [docs/POSTGRES_LOCAL.md](docs/POSTGRES_LOCAL.md).

### Option B — Embedded PGlite (no PostgreSQL install)

**Terminal 1 — API**

```bash
cd server
cp .env.example .env
npm install
npm run db:generate
npx prisma db push --schema=prisma/reference/schema.prisma
npx tsx scripts/init-pglite.ts
USE_PGLITE=true npx tsx prisma/seed.ts
USE_PGLITE=true npm run dev
```

Or one command after `npm install`:

```bash
cd server && npm run dev:local
```

**Terminal 2 — UI**

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173 — sign in lands on the **Dashboard**.

### Investigator features

- **Dashboard** — workload stats, recent cases and alerts
- **Investigations** — create by type (RTI, audit, procurement, whistleblower, general); tabbed detail: **Forensic Lab**, documents, facts, notes, tasks, links, external lookup, case AI
- **Forensic Lab** (per case) — evidence locker (SHA-256 verify, chain of custody), document examiner (PDF + extracted text, annotations), unified timeline, entity network graph, analysis board, HTML/ZIP court-ready export
- **Tasks** — per-case and global task list
- **Search** — cases, entities, facts
- **Alerts** — acknowledge from the alerts page
- **Settings** — profile and language

### Forensic worker (PDF extraction)

Run a second terminal with Redis available:

```bash
cd server && npm run dev:worker
```

Uploads with files enqueue `forensic-jobs` (BullMQ). Optional cloud OCR: set `FORENSIC_OCR_ENABLED=true` and `FORENSIC_OCR_API_URL` in `server/.env`.

### External lookup

Investigation detail → **Lookup** tab. Env in `server/.env`:

- `LOOKUP_LIVE_FETCH=true` — try HTTP fetch (falls back to paste for MCA21/captcha)
- `LOOKUP_LIVE_FETCH=false` — use bundled fixtures (CI/dev without network)

### Clear dummy / test data

```bash
cd server && npm run db:clear
```

Removes all investigations, documents, facts, alerts, entities, and logs. Keeps login users. Reference law/i18n SQLite is unchanged.

### Local file storage (MinIO)

Evidence PDFs use S3-compatible storage. For local dev without Docker:

```bash
./scripts/setup-minio-native.sh
# or included in ./install.sh
```

With Docker: `cd docker && docker compose up -d minio minio-init`

Console: http://localhost:9001 (login `minioadmin` / `minioadmin`)

`server/.env` is preconfigured for MinIO (`S3_ENDPOINT=http://localhost:9000`). The API creates buckets on startup if missing.

## Run with Docker (optional)

```bash
cd docker && docker compose up -d postgres redis
cd server && npm run db:migrate && npm run db:seed && npm run dev
```

**Default logins** (after seed):

- Admin: `admin@rti-watch.local` / `Admin@RTI2026`
- Investigator: `investigator@rti-watch.local` / `Investigate@2026`

## Docs

- [Native install (no Docker)](docs/NATIVE_INSTALL.md)
- [Local PostgreSQL](docs/POSTGRES_LOCAL.md)

- [ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [CODING_STANDARDS.md](docs/CODING_STANDARDS.md)
- [DATABASE.md](docs/DATABASE.md)
- [DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [SECURITY.md](docs/SECURITY.md)
# case-ledger
