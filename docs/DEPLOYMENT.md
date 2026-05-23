# RTI Watch — Self-Hosted Deployment (P12)

## Requirements

- Ubuntu Server 24.04 LTS
- 8 GB RAM minimum (16 GB recommended)
- 4 CPU cores, 400 GB SSD
- Static IP or DDNS, ports 80/443 forwarded

## Quick start (development)

```bash
cd docker && docker compose up -d postgres redis

cd ../server
cp .env.example .env
# Edit .env — set JWT_SECRET (64+ chars), ENCRYPTION_KEY (32 bytes hex)
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev

cd ../client
cp .env.example .env
npm install
npm run dev
```

## Production (PM2, no Docker)

On the VPS, **do not run `tsc` alone** — the reference Prisma client lives under `src/generated/` and must be copied into `dist/`.

```bash
cd ~/case-ledger/server
cp .env.example .env   # edit DATABASE_URL, JWT_SECRET, REDIS_URL, S3_*, etc.
npm ci --legacy-peer-deps
npm run db:generate    # creates src/generated/reference-client + @prisma/client
npm run db:migrate
npm run db:seed
npm run build          # db:generate + tsc + copy src/generated -> dist/generated
ls dist/generated/reference-client/index.js   # must exist

# API
pm2 start dist/index.js --name case-ledger-api --cwd /home/ubuntu/case-ledger/server

# Forensic worker (needs Redis)
pm2 start dist/worker.js --name case-ledger-worker --cwd /home/ubuntu/case-ledger/server

pm2 save
```

If you see `ERR_MODULE_NOT_FOUND` for `dist/generated/reference-client/index.js`, you skipped `npm run build` (or ran only `tsc`).

Serve the client build separately (`cd client && npm run build`) via nginx static files.

### PM2 troubleshooting

| Error | Fix |
|-------|-----|
| `EACCES` on `node_modules/.prisma` during build | You ran `sudo npm` earlier. Run `sudo bash scripts/fix-npm-permissions.sh`, then **`npm run build` as ubuntu** (never `sudo npm`). |
| `EADDRINUSE` port 5006 + **cluster mode** | Use `ecosystem.config.cjs` with `exec_mode: "fork"`. Then `pm2 delete all` (case-ledger only), `pm2 start ecosystem.config.cjs`. |
| Port already in use | `ss -tlnp \| grep 5006` — stop the other process or change `PORT` in `.env`. |

```bash
pm2 delete case-ledger-api case-ledger-worker
pm2 start ecosystem.config.cjs
pm2 logs case-ledger-api
curl -s http://127.0.0.1:5006/ready   # use your PORT from .env
```

## Production (Docker)

```bash
cd docker
docker compose --profile prod up -d
```

Configure Certbot on host for TLS. Point DNS to server IP.

## Backups

Daily cron on host:

```bash
pg_dump $DATABASE_URL | gzip > /backups/rti-$(date +%F).sql.gz
cp server/reference/rti-reference.db /backups/reference-$(date +%F).db
```

Weekly: restore to staging directory and verify row counts.

## Incident response

1. Revoke compromised user refresh tokens in `refresh_tokens`
2. Rotate JWT_SECRET (forces re-login)
3. Restore from last verified backup if data integrity compromised
