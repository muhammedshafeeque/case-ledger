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

## Production

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
